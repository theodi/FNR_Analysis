var BOROUGHS_NAMES = ["Barking and Dagenham", "Barnet", "Bexley", "Brent", "Bromley", "Camden", "City of London", "Croydon", "Ealing", "Enfield", "Greenwich", "Hackney", "Hammersmith and Fulham", "Haringey", "Harrow", "Havering", "Hillingdon", "Hounslow", "Islington", "Kensington and Chelsea", "Kingston upon Thames", "Lambeth", "Lewisham", "Merton", "Newham", "Redbridge", "Richmond upon Thames", "Southwark", "Sutton", "Tower Hamlets", "Waltham Forest", "Wandsworth", "Westminster"]

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

	log("Starting loading data...");
	d3.csv("data/incidents.csv", function (inputData) {
		incidentsData = inputData;
		forceColumnsToFloat([ 'firstPumpTime', 'secondPumpTime', 'latitude', 'longitude', 'davetazLatitude', 'davetazLongitude' ], incidentsData);
		d3.csv("data/stations.csv", function (inputData) {
			stationsData = inputData;
			forceColumnsToFloat([ 'latitude', 'longitude' ], stationsData);
			log("Data loaded (incidents.csv and stations.csv).");
			if(callback) callback(null);
		});
	});
}


/* This function replaces the calls to BoroughsReload.php. Input is one station 
   name or an array of station names. It returns an array with the list of 
   borough names whose incidents have been attended by the stations as 
   'first pumps'. */
var getImpactedBoroughs = function (stations) {
	stations = [ ].concat(stations);
	return _.unique(_.map(_.filter(incidentsData, function (r) {
		return _.contains(stations, r.firstPumpStation);
	}), function (r) { return r.borough; }));
}


// returns the mean of an array of numerical values
var mean = function (a) {
	a = [ ].concat(a);
	return _.reduce(a, function (memo, num) { return memo + num; }, 0.0) / a.length;
}


/* This function replaces the 'getStationResponseTime' function in the 
   'GetAreaResponseTime.php' file. It returns the average first pump 
   attendance time to incidents located in the specified ward, by all 
   stations excluding the ones listed in closedStations */ 
var getWardResponseTime = function (ward, closedStations) {
	closedStations = [ ].concat(closedStations);
	return mean(_.map(_.filter(incidentsData, function (incident) {
		return (incident.ward == ward) && !_.contains(closedStations, incident.firstPumpStation);
	}), function (incident) { return incident.firstPumpTime; }));
};


var getStationsInBorough = function (borough) {
	return _.map(_.where(stationsData, { borough: borough }), function (r) {
		return r.name;
	});
};


/* This function replaces the calls to GetAreaResponseTime.php when a borough is
   specified. */
var getBoroughResponseTime = function (borough, closedStations) {
	closedStations = [ ].concat(closedStations);

	/* Below is the old version, before Giacecco and Ulrich decided it was 
	   to redefine borough response time. 

		return mean(_.map(_.filter(getStationsInBorough(borough), function (station) {
			return !_.contains(closedStations, station); }), function (station) {
			return getWardResponseTime(station, closedStations);
	}));
	*/

	// ... and here is the new version
	return mean(_.map(_.filter(incidentsData, function (i) {
		return (i.borough == borough) && !_.contains(closedStations, i.firstPumpStation);
	}), function (i) { return i.firstPumpTime; }));
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
		// Davetaz used a simple square count as id, is that ideal?
		id++; 
		var temp = '{"type":"Feature","id":"' + id + '","properties":{';
		temp += '"incidents":' + square.incidents.length +',';
		temp += '"ward":"' + borough + (closed.length > 0 ? '-minus-' + closed.join('_') : '') + '",';
		temp += '"response":' + square.meanFirstPumpTime + ',';
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

}
