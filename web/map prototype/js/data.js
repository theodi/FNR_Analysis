var incidentsData = undefined;
var stationsData = undefined;


var loadData = function (callback) {
	d3.csv("data/incidents.csv", function (inputData) {
		incidentsData = inputData;
		// TODO: is what you see below necessary? why does d3.csv import all columns as strings?
		_.each(incidentsData, function (incident) {
			_.each([ 'firstPumpTime', 'secondPumpTime' ], function (columnName) {
				incident[columnName] = parseFloat(incident[columnName]);
			});
		});
		d3.csv("data/stations.csv", function (inputData) {
			stationsData = inputData;
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


/* This function replaces the 'getStationResponseTime' function in the 
   'GetAreaResponseTime.php' file. It returns the average first pump 
   attendance time to incidents located in the 'station' area, by all 
   stations excluding the ones listed in closedStations */ 
var getStationResponseTime = function (station, closedStations) {
	var temp = _.map(_.filter(incidentsData, function (incident) {
		return (incident.station == station) && !_.contains(closedStations, incident.firstPumpStation);
	}), function (incident) { return incident.firstPumpTime; });
	return _.reduce(temp, function (memo, num) { return memo + num; }, 0) / temp.length;
};


/* This function replaces the calls to GetAreaResponseTime.php when a borough is
   specified. */
var getBoroughResponseTime = function (borough, closedStations) {

	var getStationsInBorough = function (borough) {
		return _.map(_.filter(stationsData, function (r) {
			return r.borough == borough;
		}), function (r) { return r.borough; });
	};

	closedStations = [ ].concat(closedStations);
	_.each(getStationsInBorough(borough, function (station) {

	}));
}