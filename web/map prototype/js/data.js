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
		forceColumnsToFloat([ 'firstPumpTime', 'secondPumpTime', 'latitude', 'longitude' ], incidentsData);
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
