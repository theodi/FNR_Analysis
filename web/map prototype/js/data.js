var incidentsData = undefined;
var stationsData = undefined;


var loadData = function (callback) {

	// TODO: is what you see below necessary? why does d3.csv import all columns as strings?
	var forceColumnsToFloat = function (columnNames, a) {
		_.each(a, function (record) {
			_.each(columnNames, function (columnName) {
				record[columnName] = parseFloat(record[columnName]);
			});
		});
	}

	d3.csv("data/incidents.csv", function (inputData) {
		incidentsData = inputData;
		forceColumnsToFloat([ 'firstPumpTime', 'secondPumpTime', 'latitude', 'longitude', 'davetazLatitude', 'davetazLongitude' ], incidentsData);
		d3.csv("data/stations.csv", function (inputData) {
			stationsData = inputData;
			forceColumnsToFloat([ 'latitude', 'longitude' ], stationsData);
			callback(null);
		});
	});

}


/* This function replaces the calls to BoroughsReload.php. Input is one station 
   name or an array of station names. It returns an { boroughs: [Array] } object
   with the list of borough names whose incidents have been attended by the 
   stations as 'first pumps'. */
var boroughsReload = function (stations) {
	stations = [ ].concat(stations);
	return { boroughs: _.unique(_.map(_.filter(incidentsData, function (r) {
		return _.contains(stations, r.firstPumpStation);
	}), function (r) { return r.borough; })) };
}


// returns the mean of an array of numerical values
var mean = function (a) {
	a = [ ].concat(a);
	return _.reduce(a, function (memo, num) { return memo + num; }, 0.0) / a.length;
}


/* This function replaces the 'getStationResponseTime' function in the 
   'GetAreaResponseTime.php' file. It returns the average first pump 
   attendance time to incidents located in the 'station' area, by all 
   stations excluding the ones listed in closedStations */ 
var getStationResponseTime = function (station, closedStations) {
	closedStations = [ ].concat(closedStations);
	return mean(_.map(_.filter(incidentsData, function (incident) {
		return (incident.station == station) && !_.contains(closedStations, incident.firstPumpStation);
	}), function (incident) { return incident.firstPumpTime; }));
};


var getStationsInBorough = function (borough) {
	return _.map(_.where(stationsData, { borough: borough }), function (r) {
		return r.name;
	});
};


/* This function replaces the calls to GetAreaResponseTime.php when a borough is
   specified. It returns the average first pump attendance time to incidents 
   located in the 'borough', by all the borough's stations, excluding the ones 
   listed in closedStations */ 
var getBoroughResponseTime = function (borough, closedStations) {
	closedStations = [ ].concat(closedStations);
	return mean(_.map(getStationsInBorough(borough), function (station) {
		return getStationResponseTime(station, closedStations);
	}));	
};


var getBoroughIncidentData = function (borough, closed) {
	close = [ ].concat(close);

	// Below is Davetaz's experimental measure for the ideal square on the map
	LAT_LENGTH = 0.0010;
    LONG_LENGTH = 0.0015;

 	// (A)
	boroughsAttendedByClosedStations = _.unique(_.filter(incidentsData, function (r) {
		return _.contains(closed, r.firstPumpStation);
	}));
	// (B) and (C) do not need porting
	// (D)
	boroughIncidents = _.filter(incidentsData, function (r) {
		return (r.borough == borough) && !_.contains(closed, r.firstPumpStation);
	})
	// (E) 
	// This section creates data for each of the squares to be displayed on the 
	// map, that is any square that contains at least one incident. 
	// Note that the calculation of each incident's "Davetaz grid" 
	// coordinates was moved to the pre-processing stage to make the JavaScript 
	// lighter
	boroughSquareIncidents = { };
	_.each(boroughIncidents, function (i) {
		var squareKey = i.davetazLatitude.toFixed(4) + ',' + i.davetazLongitude.toFixed(4);
		if (!boroughSquareIncidents[squareKey]) {
			// a new square!
			var longitude = squareKey.split(",");
			latitude = parseFloat(longitude[1]);
			longitude = parseFloat(longitude[0]);
			boroughSquareIncidents[squareKey] = { };
			boroughSquareIncidents[squareKey].polygon = latitude.toFixed(4) + "," + longitude.toFixed(4) + "\n";
			boroughSquareIncidents[squareKey].polygon += (latitude + LONG_LENGTH).toFixed(4) + "," + latitude + "\n";
			boroughSquareIncidents[squareKey].polygon += (latitude + LONG_LENGTH).toFixed(4) + "," + (latitude + LAT_LENGTH, 3).toFixed(4) + "\n";
			boroughSquareIncidents[squareKey].polygon += latitude + "," + (latitude + LAT_LENGTH).toFixed(4) + "\n";
			boroughSquareIncidents[squareKey].polygon += latitude.toFixed(4) + "," + longitude.toFixed(4);
		}
		boroughSquareIncidents[squareKey].incidents = (boroughSquareIncidents[squareKey].incidents || [ ]).concat(i);
	});
	// (F) appears not to be doing anything relevant!
	// (G)
	// This section enriches each square data with additional *consolidated* 
	// data that could not be calculated while still adding incidents
	_.each(_.keys(boroughSquareIncidents), function (squareKey) {
		boroughSquareIncidents[squareKey].meanFirstPumpTime = mean(_.map(boroughSquareIncidents[squareKey].incidents, function (i) { return i.firstPumpTime; }));
		boroughSquareIncidents[squareKey].attendingStations = _.unique(_.map(boroughSquareIncidents[squareKey].incidents, function (i) { return i.firstPumpStation; }));
	});

	/*/ debugging only
	var k = _.keys(boroughSquareIncidents)[0];
	console.log("There are " + _.keys(boroughSquareIncidents).length + " squares, the first of the keys is " + k);
	console.log("It contains " + boroughSquareIncidents[k].incidents.length + " incidents");
	console.log("The first incident is");
	console.log(boroughSquareIncidents[k].incidents[0]);
	console.log("The square's polygon is " + boroughSquareIncidents[k].polygon);
	console.log("The average attendance time is " + boroughSquareIncidents[k].meanFirstPumpTime);
	console.log("Attending stations are: " + JSON.stringify(boroughSquareIncidents[k].attendingStations));
	/*/	

}
