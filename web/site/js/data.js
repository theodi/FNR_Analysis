var BOROUGHS_NAMES = [ "Barking and Dagenham", "Barnet", "Bexley", "Brent",
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
    SIMPLIFIED_SQUARE_LONGITUDE_SIZE = 0.0015;


var incidentsData = [ ];
var incidentsDataBoroughs = [ ];
var stationsData = undefined;

var boroughsByFirstRespondersPromise;
var impactedBoroughs = function(closed_stations, callback) {
  if(!boroughsByFirstRespondersPromise) {
    boroughsByFirstRespondersPromise = $.get("data/boroughs_by_first_responders.json")
  }
 boroughsByFirstRespondersPromise.success(function(data) {
  callback(_.uniq(_.flatten(_.map(closed_stations, function(station) {
    return ds =  data[station];
  }))));
 });
}



// TODO: is what you see below necessary? why does d3.csv import all columns as strings?
var forceColumnsToFloat = function (columnNames, a) {
	_.each(a, function (record) {
		_.each(columnNames, function (columnName) {
			record[columnName] = parseFloat(record[columnName]);
		});
	});
}


var loadAllIncidents = function (callback) {
	incidentsData = [ ];
	d3.csv("data/incidents.csv", function (inputData) {
		incidentsDataBoroughs = BOROUGHS_NAMES;
		forceColumnsToFloat([ 'firstPumpTime', 'simplifiedLatitude', 'simplifiedLongitude', 'footfall' ], inputData);
		incidentsData = inputData;
		log("All boroughs incidents data loaded.");
		if (callback) callback (null);
	})
}


// Loads all data that is required for the application startup
var loadData = function (callback) {
	log("Loading stations data...");
	d3.csv("data/stations.csv", function (inputData) {
		stationsData = inputData;
		forceColumnsToFloat([ 'latitude', 'longitude' ], stationsData);
		log("stations.csv loaded.");
		if(callback) callback(null);
	});
}


/* This function replaces the calls to BoroughsReload.php. Input is one station
   name or an array of station names. It returns an array with the list of
   borough names whose incidents have been attended by the stations as
   'first pumps'. */
var getImpactedBoroughs = _.memoize(function (stations) {
	stations = [ ].concat(stations)
	log("Calculating for the first time getImpactedBoroughs for stations " + stations.join(", "));
	return _.unique(_.map(_.filter(incidentsData, function (r) {
		return _.contains(stations, r.firstPumpStation);
	}), function (r) { return r.borough; }));
}, function (stations) {
	return ([ ].concat(stations)).sort().join("_");
})


var mean = function (values) {
	return _.reduce(values, function (memo, num) { return memo + num; }, 0.0) / values.length;
}


var median = function (values) {
	// Thanks to http://caseyjustus.com/finding-the-median-of-an-array-with-javascript
    values.sort(function(a,b) { return a - b; });
    var half = Math.floor(values.length / 2);
    return (values.length % 2 == 0) ? values[half] : (values[half - 1] + values[half]) / 2.0;
}


var getStationsInBorough = _.memoize(function (borough) {
	log("Calculating for the first time getStationsInBorough for " + borough);
	return _.map(_.where(stationsData, { borough: borough }), function (r) {
		return r.name;
	})
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


var getAllBoroughsScores = function (closedStations, callback) {
	callback(null, getAllBoroughsScoresM(closedStations));
};


// Just for testing, prints out a .csv on the JavaScript console
var getAllBoroughsScoresCSV = function (closedStations) {
	log("It can take a while when calculated for the first time...");
	var results = getAllBoroughsScoresM(closedStations);
	console.log(_.keys(results[0]).join(","));
	_.each(results, function (r) {
		console.log(_.values(r).join(","));
	});
};
