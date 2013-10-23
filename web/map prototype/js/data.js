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


// TODO: is what you see below necessary? why does d3.csv import all columns as strings?
var forceColumnsToFloat = function (columnNames, a) {
	_.each(a, function (record) {
		_.each(columnNames, function (columnName) {
			record[columnName] = parseFloat(record[columnName]);
		});
	});
}


// Loads and stores permanently all incidents that happened in the specified 
// borough, then calls callback(err)
var loadIncidents = function (borough, callback) {
	if (_.contains(incidentsDataBoroughs, borough)) {
		if (callback) callback (null);
	} else {
		log("Loading " + borough + " incidents data for the first time...");
		d3.csv("data/incidents/" + borough + ".csv", function (inputData) {
			incidentsDataBoroughs.push(borough);
			forceColumnsToFloat([ 'firstPumpTime', 'simplifiedLatitude', 'simplifiedLongitude' ], inputData);
			incidentsData = incidentsData.concat(inputData);
			log("Borough " + borough + " incidents data loaded.");
			if (callback) callback (null);
		})
	}
}


var loadAllIncidents = function (callback) {
	incidentsData = [ ];
	d3.csv("data/incidents.csv", function (inputData) {
		incidentsDataBoroughs = BOROUGHS_NAMES;
		forceColumnsToFloat([ 'firstPumpTime', 'simplifiedLatitude', 'simplifiedLongitude' ], inputData);
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
	return _.unique(_.map(_.filter(incidentsData, function (r) {
		return _.contains(stations, r.firstPumpStation);
	}), function (r) { return r.borough; }));
}, function (stations) {
	return ([ ].concat(stations)).sort().join("_");
})


// returns the mean of an array of numerical values
var mean = function (a) {
	a = [ ].concat(a);
	return _.reduce(a, function (memo, num) { return memo + num; }, 0.0) / a.length;
}


var getStationsInBorough = _.memoize(function (borough) {
	return _.map(_.where(stationsData, { borough: borough }), function (r) {
		return r.name;
	})
});


var getBoroughResponseTimesM = _.memoize(function (borough, closedStations) {

	// estimates the response time of a generic incident in a square; it expects
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

	var boroughIncidents = _.filter(incidentsData, function (i) { return i.borough == borough; });
	var incidentsNotImpacted = _.filter(boroughIncidents, function (i) { return !_.contains(closedStations, i.firstPumpStation); })
	var incidentsImpacted = _.filter(boroughIncidents, function (i) { return _.contains(closedStations, i.firstPumpStation); })
	var oldTimings = _.map(incidentsNotImpacted, function (i) { return i.firstPumpTime; });
	var newTimings = _.reduce(_.values(_.groupBy(incidentsImpacted, function (i) { return i.simplifiedLongitude + '_' + i.simplifiedLatitude; })), 
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
	closedStations = [ ].concat(closedStations);
	// loadIncidents(borough, function (err) {
	// 	err ? callback(err, undefined): callback(null, getBoroughResponseTimesM(borough, closedStations));  
	// });
	callback(null, getBoroughResponseTimesM(borough, closedStations));  
};


var getBoroughHistM = _.memoize(function (borough, closedStations) {
	/* [{timeMin: 0, timeMax: 30, incidents: 5},{timeMin: 30, timeMax: 60, incidents: 7}, ...] */
	var BIN_SIZE = 30;
	var responseTimes = getBoroughResponseTimesM(borough, closedStations);
	var maxResponseTime = Math.max.apply(null, responseTimes);
	var results = [ ];
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
	closedStations = [ ].concat(closedStations);
	// loadIncidents(borough, function (err) {
	// 	err ? callback(err, undefined): callback(null, getBoroughResponseTimeM(borough, closedStations));  
	// });
	callback(null, getBoroughHistM(borough, closedStations)); 
};


var getBoroughResponseTimeM = _.memoize(function (borough, closedStations) {
	return mean(getBoroughResponseTimesM(borough, closedStations));
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


/*  The function loads the necessary detailed incident data, calculates the 
    specified borough's response time and then calls back
    callback(err, boroughResponseTime) */
var getBoroughResponseTime = function (borough, closedStations, callback) {
	closedStations = [ ].concat(closedStations);
	// loadIncidents(borough, function (err) {
	// 	err ? callback(err, undefined): callback(null, getBoroughResponseTimeM(borough, closedStations));  
	// });
	callback(null, getBoroughResponseTimeM(borough, closedStations)); 
};


/* Like getBoroughScore below, but assumes that the incidents data for
   the borough has been loaded already */
var getBoroughScoreM = _.memoize(function (borough, closedStations) {
	if (closedStations.length == 0) {
		return mean(_.map(_.filter(incidentsData, function (i) {
			return (i.borough == borough) && !_.contains(closedStations, i.firstPumpStation);
		}), function (i) { return i.score; }));
	} else {
		return Math.max(getBoroughScore(borough), mean(_.map(_.filter(incidentsData, function (i) {
			return (i.borough == borough) && !_.contains(closedStations, i.firstPumpStation);
		}), function (i) { return i.score; })));
	}
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


/*  The function loads the necessary detailed incident data, calculates the 
    specified borough's score vs time and population and then calls back
    callback(err, boroughscore) */
var getBoroughScore = function (borough, closedStations, callback) {
	// TODO: STAB ONLY
	loadIncidents(borough, function (err) {
		err ? callback(err, undefined): callback(null, getBoroughScoreM(borough, closedStations));  
	});
};


/* Like getBoroughDetailedResponse below, but assumes that the incidents data for
   the borough has been loaded already */
var getBoroughIncidentDataM = _.memoize(function (borough, closedStations) {
	close = [ ].concat(close);

	// Below is simplified's experimental measure for the ideal square on the map
	LAT_LENGTH = 0.0010;
    LONG_LENGTH = 0.0015;

 	// (A)
	boroughsAttendedByClosedStations = _.unique(_.filter(incidentsData, function (r) {
		return _.contains(closedStations, r.firstPumpStation);
	}));
	// (B) and (C) do not need porting
	// (D)
	boroughIncidents = _.filter(incidentsData, function (r) {
		return (r.borough == borough) && !_.contains(closedStations, r.firstPumpStation);
	})
	// (E) 
	// This section creates data for each of the squares to be displayed on the 
	// map, that is any square that contains at least one incident. 
	// Note that the calculation of each incident's "simplified grid" 
	// coordinates was moved to the pre-processing stage to make the JavaScript 
	// lighter
	boroughSquareIncidents = { };
	_.each(boroughIncidents, function (i) {
		var squareKey =  i.simplifiedLongitude.toFixed(4) + ',' + i.simplifiedLatitude.toFixed(4);
		if (!boroughSquareIncidents[squareKey]) {
			// a new square!
			var longitude = squareKey.split(",");
			latitude = parseFloat(longitude[1]);
			longitude = parseFloat(longitude[0]);
			boroughSquareIncidents[squareKey] = { };
			boroughSquareIncidents[squareKey].polygon = [ ];
			boroughSquareIncidents[squareKey].polygon.push(longitude.toFixed(4) + ", " + latitude.toFixed(4));
			boroughSquareIncidents[squareKey].polygon.push((longitude + LONG_LENGTH).toFixed(4) + ", " + latitude.toFixed(4));
			boroughSquareIncidents[squareKey].polygon.push((longitude + LONG_LENGTH).toFixed(4) + ", " + (latitude + LAT_LENGTH).toFixed(4));
			boroughSquareIncidents[squareKey].polygon.push(longitude.toFixed(4) + ", " + (latitude + LAT_LENGTH).toFixed(4));
			boroughSquareIncidents[squareKey].polygon.push(longitude.toFixed(4) + ", " + latitude.toFixed(4));
			boroughSquareIncidents[squareKey].attendingStations = { };
		}
		boroughSquareIncidents[squareKey].incidents = (boroughSquareIncidents[squareKey].incidents || [ ]).concat(i);
		// This keeps counters for which stations attended the incidents and how 
		// many times. 
		boroughSquareIncidents[squareKey].attendingStations[i.firstPumpStation] = 
			(boroughSquareIncidents[squareKey].attendingStations[i.firstPumpStation] || 0) + 1;
	});
	// (F) appears not to be doing anything relevant!
	// (G)
	// This section enriches each square data with additional *consolidated* 
	// data that could not be calculated while still adding incidents
	_.each(_.keys(boroughSquareIncidents), function (squareKey) {
		boroughSquareIncidents[squareKey].meanFirstPumpTime = mean(_.map(boroughSquareIncidents[squareKey].incidents, function (i) { return i.firstPumpTime; }));
		boroughSquareIncidents[squareKey].meanScore = mean(_.map(boroughSquareIncidents[squareKey].incidents, function (i) { return i.score; }));
		// I make the station attendance object into an array of the same
		boroughSquareIncidents[squareKey].attendingStations = _.pairs(boroughSquareIncidents[squareKey].attendingStations);
		// I make the station attendance figures into %s of themselves
		boroughSquareIncidents[squareKey].attendingStations = _.map(boroughSquareIncidents[squareKey].attendingStations, 
			function (station) { station[1] = station[1] / boroughSquareIncidents[squareKey].incidents.length; return station; }
		);
		// I order the station attendances by % of attendance, highest to lowest
		boroughSquareIncidents[squareKey].attendingStations.sort(function (a, b) { return a[1] < b[1] ? 1 : -1; });
	});

	/* I know that the section below is very ugly: why am I creating this
	   data as a string, if I am parsing it into JSON just a few lines down?
	   This is just to introduce as little regression as possible from 
	   Davetaz's original code. */
	var leafletJsonString = '{"type":"FeatureCollection","features":[\n'; 
	var id = 0;
	leafletJsonString += _.map(boroughSquareIncidents, function (square) {
		id++; 
		var temp = '{"type":"Feature","id":"' + id + '","properties":{';
		temp += '"incidents":' + square.incidents.length +',';
		temp += '"ward":"' + borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '') + '",';
		temp += '"response":' + square.meanFirstPumpTime + ',';
		temp += '"score":' + square.meanScore + ',';
		temp += '"attending":"' + 
			_.reduce(square.attendingStations, function (memo, station) { 
				return memo + station[0] + " (" + (station[1] * 100).toFixed(0) + "%) "; 
			}, "") + 
			'"},';
		temp += '"geometry":{"type":"Polygon","coordinates":[[ [';
		temp += square.polygon.join("], [");
		temp += '] ]]}}';
		return temp;
	}).join(',\n');
	leafletJsonString += ']}';

	return JSON.parse(leafletJsonString);

}, function (borough, closedStations) {
	return borough + (closedStations.length > 0 ? "-minus-" + closedStations.join("_") : "");
});


/* The function produces the GeoJSON object that is required by Leaflet 
   to visualise the detailed incident data for the specified borough, then calls 
   back callback(err, geoJsonObject) */
var getBoroughDetailedResponse = function (borough, closedStations, callback) {
	closedStations = [ ].concat(closedStations);
	loadIncidents(borough, function (err) {
		err ? callback(err, undefined) : callback(null, getBoroughIncidentDataM(borough, closedStations));  
	});
}

