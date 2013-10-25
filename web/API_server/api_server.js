var _ = require('underscore'),
	csv = require('csv'),
	fs = require('fs'),
    argv = require('optimist') 
		.usage('Usage: $0 --port portNumber [--cache]')
		.demand([ 'port' ])
		.alias('cache', 'c')
		.alias('port', 'p')
		.argv, 
	restify = require('restify'),
	zlib = require('zlib'),

	BOROUGHS_NAMES = [ "Barking and Dagenham", "Barnet", "Bexley", "Brent",
		"Bromley", "Camden", "City of London", "Croydon", "Ealing", "Enfield",
		"Greenwich", "Hackney", "Hammersmith and Fulham", "Haringey", "Harrow",
		"Havering", "Hillingdon", "Hounslow", "Islington",
		"Kensington and Chelsea", "Kingston upon Thames", "Lambeth", "Lewisham",
		"Merton", "Newham", "Redbridge", "Richmond upon Thames", "Southwark",
		"Sutton", "Tower Hamlets", "Waltham Forest", "Wandsworth",
		"Westminster" ],

	// At the moment of writing, and according to the colour levels we are
	// currently using for the legend, of the statons facing closure Southwark is the
	// only single station closure that produces a visible effect on the map
	STATIONS_FACING_CLOSURE_NAMES = [ "Belsize", "Bow", "Clerkenwell",
		"Downham", "Kingsland", "Knightsbridge", "Silvertown", "Southwark",
		"Westminster", "Woolwich" ],

    SIMPLIFIED_SQUARE_LATITUDE_SIZE = 0.001,
    SIMPLIFIED_SQUARE_LONGITUDE_SIZE = 0.0015,

    incidentsData = [ ];


// TODO: what you see below necessary is necessary with D3, as all columns are
// imported as string for some reason not yet investigated 
var forceColumnsToFloat = function (columnNames, a) {
	_.each(a, function (record) {
		_.each(columnNames, function (columnName) {
			record[columnName] = parseFloat(record[columnName]);
		});
	});
}


var loadAllIncidents = function (callback) {
	log("Loading incident data...");
	incidentsData = [ ];
    csv()
		.from.stream(fs.createReadStream(__dirname + '/data.csv.gz').pipe(zlib.createUnzip()), {
            columns: true
        })
        .on('record', function (row, index) {
        	incidentsData.push(row);
        })
        .on('end', function (count) {
			incidentsDataBoroughs = BOROUGHS_NAMES;
			forceColumnsToFloat([ 'firstPumpTime', 'simplifiedLatitude', 'simplifiedLongitude', 'footfall' ], incidentsData);
			log("Completed loading incident data.");
			if (callback) callback (null);
        });
};


var mean = function (values) {
	return _.reduce(values, function (memo, num) { return memo + num; }, 0.0) / values.length;
}


var median = function (values) {
	// Thanks to http://caseyjustus.com/finding-the-median-of-an-array-with-javascript
    values.sort(function(a,b) { return a - b; });
    var half = Math.floor(values.length / 2);
    return (values.length % 2 == 0) ? values[half] : (values[half - 1] + values[half]) / 2.0;
}


var getBoroughsByFirstResponderM = _.memoize(function () {
	results = { };
	var stations = _.unique(_.map(incidentsData, function (i) { return i.firstPumpStation; })).sort();
	_.each(stations, function (s) {
		results[s] = _.unique(_.map(_.filter(incidentsData, function (i) { return s == i.firstPumpStation; }), function (i) { return i.borough; })).sort();
	})
	return results;
});


var getBoroughResponseTimesM = _.memoize(function (borough, closedStations) {

	// Estimates the response time of a generic incident in a square; it expects
	// incidentsNotImpacted to be an array of incidents not impacted from the
	// stations closure, hence relevant for calculation
	var estimateSquareResponseTime = _.memoize(function (longitude, latitude) {
		var MIN_NO_OF_INCIDENTS = 1;
		var results = [ ];
		var foundEnough = false;
		for (var m = 0; !foundEnough; m++) {
			results = _.filter(incidentsNotImpacted, function (i) {
				return (i.simplifiedLongitude >= longitude - m * SIMPLIFIED_SQUARE_LONGITUDE_SIZE) &&
				(i.simplifiedLongitude < longitude + (m + 1) * SIMPLIFIED_SQUARE_LONGITUDE_SIZE) &&
				(i.simplifiedLatitude <= latitude + m * SIMPLIFIED_SQUARE_LATITUDE_SIZE) &&
				(i.simplifiedLatitude > latitude - (m + 1) * SIMPLIFIED_SQUARE_LATITUDE_SIZE);
			});
			foundEnough = results.length >= MIN_NO_OF_INCIDENTS;
		}
		return mean(_.map(results, function (i) { return i.firstPumpTime; }));
	}, function (longitude, latitude) {
		return longitude + '_' + latitude;
	});

	closedStations = ([ ].concat(closedStations));
	log("Calculating for the first time getBoroughResponseTimesM for " + borough + " with closed stations: " + closedStations.join(", "));
	var boroughIncidents = _.filter(incidentsData, function (i) { return i.borough == borough; }),
		incidentsNotImpacted = _.filter(boroughIncidents, function (i) { return !_.contains(closedStations, i.firstPumpStation); }),
		incidentsImpacted = _.filter(boroughIncidents, function (i) { return _.contains(closedStations, i.firstPumpStation); }),
		oldTimings = _.map(incidentsNotImpacted, function (i) { return i.firstPumpTime; }),
		newTimings = _.reduce(_.values(_.groupBy(incidentsImpacted, function (i) { return i.simplifiedLongitude + '_' + i.simplifiedLatitude; })), 
			function (memo, incidentsInSameSquare) {
				var newResponseTime = estimateSquareResponseTime(incidentsInSameSquare[0].simplifiedLongitude, incidentsInSameSquare[0].simplifiedLatitude, closedStations);
				// See http://stackoverflow.com/a/19290390/1218376 for the strange expression below
				return memo.concat(_.map(Array(incidentsInSameSquare.length + 1).join(1).split(''), function() { return newResponseTime; }));
			},
			[ ]);
	return oldTimings.concat(newTimings);
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


var getBoroughResponseTimes = function (borough, closedStations, callback) {
	callback(null, getBoroughResponseTimesM(borough, closedStations));
};


var getBoroughHistM = _.memoize(function (borough, closedStations) {
	/* [{timeMin: 0, timeMax: 30, incidents: 5},{timeMin: 30, timeMax: 60, incidents: 7}, ...] */
	closedStations = ([ ].concat(closedStations));
	log("Calculating for the first time getBoroughHistM for " + borough + " with closed stations: " + closedStations.join(", "));
	var BIN_SIZE = 60, // seconds
		responseTimes = getBoroughResponseTimesM(borough, closedStations),
		maxResponseTime = Math.max.apply(null, responseTimes),
		results = [ ];
	for (var timeMin = 0; timeMin <= maxResponseTime; timeMin += BIN_SIZE) {
		var timeMax = timeMin + BIN_SIZE;
		results.push({
			timeMin: timeMin,
			timeMax: timeMax,
			incidents: _.filter(responseTimes, function (r) { return (r >= timeMin) && (r < timeMax); }).length,
		});
	}
	return results;
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


var getBoroughHist = function (borough, closedStations, callback) {
	callback(null, getBoroughHistM(borough, closedStations));
};


var getBoroughResponseTimeM = _.memoize(function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations));
	return mean(getBoroughResponseTimesM(borough, closedStations));
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


/*  The function loads the necessary detailed incident data, calculates the
    specified borough's response time and then calls back
    callback(err, boroughResponseTime) */
var getBoroughResponseTime = function (borough, closedStations, callback) {
	callback(null, getBoroughResponseTimeM(borough, closedStations));
};


/* Like getBoroughScore below, but assumes that the incidents data for
   the borough has been loaded already */
var getBoroughScoreM = _.memoize(function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations));
	log("Calculating for the first time getBoroughScoreM for " + borough + " with closed stations: " + closedStations.join(", "));
	var A = 0.75,
		medianResponseTimes = median(_.map(getBoroughResponseTimesM(borough, closedStations), function (x) { return x / 60; })),
		medianFootfall = median(_.map(_.filter(incidentsData, function (i) { return i.borough == borough; }), function (i) { return i.footfall; }));
	return Math.pow(medianResponseTimes, A) * 
		Math.pow(Math.log(medianFootfall + 2) / Math.log(10), 1 - A);
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


/*  The function loads the necessary detailed incident data, calculates the
    specified borough's score vs time and population and then calls back
    callback(err, boroughscore) */
var getBoroughScore = function (borough, closedStations, callback) {
	callback(null, getBoroughScoreM(borough, closedStations));
};


// Just for testing, prints out a .csv on the JavaScript console
var getAllBoroughsScoresM = _.memoize(function (closedStations) {
	if (!closedStations) closedStations = STATIONS_FACING_CLOSURE_NAMES;
	var results = [ ];
	_.each(BOROUGHS_NAMES, function (borough) {
		results.push({
			borough: borough,
			responseTimeOpen: getBoroughResponseTimeM(borough),
			responseTimeClosed: getBoroughResponseTimeM(borough, closedStations),
			scoreOpen: getBoroughScoreM(borough),
			scoreClosed: getBoroughScoreM(borough, closedStations),
			medianFootfall: median(_.map(_.filter(incidentsData, function (i) { return i.borough == borough; }), function (i) { return i.footfall; })),
		});
	});
	return results;
}, function (closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return closedStations.join('_');
});


// Just for testing, prints out a .csv on the JavaScript console
var getAllBoroughsScoresCSV = function (closedStations) {
	log("It can take a while when calculated for the first time...");
	var results = getAllBoroughsScoresM(closedStations);
	console.log(_.keys(results[0]).join(","));
	_.each(results, function (r) {
		console.log(_.values(r).join(","));
	});
};


var log = function (s) {
	var entryDate = new Date();
	console.log(entryDate.getFullYear() + "/" + (entryDate.getMonth() < 9 ? '0' : '') + (entryDate.getMonth() + 1) + "/" + (entryDate.getDate() < 10 ? '0' : '') + entryDate.getDate() + " " + (entryDate.getHours() < 10 ? '0' : '') + entryDate.getHours() + ":" + (entryDate.getMinutes() < 10 ? '0' : '') + entryDate.getMinutes() + ":" + (entryDate.getSeconds() < 10 ? '0' : '') + entryDate.getSeconds() + " - " + s);
}

var server = restify.createServer({
  name: 'ODI - FNR Analysis server',
});

server.use(restify.queryParser());
server.use(restify.jsonp());


server.get('/getBoroughsByFirstResponder', function (req, res, next) {
	res.send(200, getBoroughsByFirstResponderM());
	return next();
});

server.get('/getBoroughResponseTime', function (req, res, next) {
	res.send(200, getBoroughResponseTimeM(req.query.borough, req.query.close));
	return next();
});

server.get('/getBoroughScore', function (req, res, next) {
	res.send(200, getBoroughScoreM(req.query.borough, req.query.close));
	return next();
});

server.get('/getAllBoroughsScores', function (req, res, next) {
	res.send(200, getAllBoroughsScoresM(req.query.close));
	return next();
});

server.get('/getBoroughHist', function (req, res, next) {
	res.send(200, getBoroughHistM(req.query.borough, req.query.close));
	return next();
});


loadAllIncidents(function () {
	if (argv.cache) {
		log("Caching getBoroughsByFirstResponderM()...");
		getBoroughsByFirstResponderM()	
		log("Caching getBoroughResponseTimeM(borough) for all boroughs...");
		_.each(BOROUGHS_NAMES, function (b) { getBoroughResponseTimeM(b) });	
		log("Caching getBoroughResponseTimeM(borough, closed stations) for all boroughs and the stations selected by the Mayor...");
		_.each(BOROUGHS_NAMES, function (b) { getBoroughResponseTimeM(b, STATIONS_FACING_CLOSURE_NAMES) });	
		log("Caching getBoroughScoreM(borough) for all boroughs...");
		_.each(BOROUGHS_NAMES, function (b) { getBoroughScoreM(b) });	
		log("Caching getBoroughScoreM(borough, closed stations) for all boroughs and the stations selected by the Mayor...");
		_.each(BOROUGHS_NAMES, function (b) { getBoroughScoreM(b, STATIONS_FACING_CLOSURE_NAMES) });	
		log("Caching getBoroughHistM(borough) for all boroughs...");
		_.each(BOROUGHS_NAMES, function (b) { getBoroughHistM(b) });	
		log("Caching getBoroughHistM(borough, closed stations) for all boroughs and the stations selected by the Mayor...");
		_.each(BOROUGHS_NAMES, function (b) { getBoroughHistM(b, STATIONS_FACING_CLOSURE_NAMES) });	
		log("Caching getAllBoroughsScoresM()...");
		getAllBoroughsScoresM();	
		log("Caching completed.");
	}
	server.listen(argv.port);
	log("The server is listening on port " + argv.port + ".");
});
