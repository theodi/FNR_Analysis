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
		"Westminster", "Woolwich" ];


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
// borough
var loadIncidents = function (borough, callback) {
	if (_.contains(incidentsDataBoroughs, borough)) {
		if (callback) callback (null);
	} else {
		log("Loading " + borough + " incidents data for the first time...");
		d3.csv("data/incidents/" + borough + ".csv", function (inputData) {
			incidentsDataBoroughs.push(borough);
			forceColumnsToFloat([ 'firstPumpTime', 'secondPumpTime', 'latitude', 'longitude', 'davetazLatitude', 'davetazLongitude' ], inputData);
			incidentsData = incidentsData.concat(inputData);
			log("Borough " + borough + " incidents data loaded.");
			if (callback) callback (null, inputData);
		})
	}
}


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


// GIACECCO TODO: vectorise this
var getStationsInBorough = _.memoize(function (borough) {
	return _.map(_.where(stationsData, { borough: borough }), function (r) {
		return r.name;
	})
});


/* Like getBoroughResponseTime below, but assumes that the data has been loaded
   already */
var getBoroughResponseTimeM = _.memoize(function (borough, closedStations) {
	closedStations = [ ].concat(closedStations);
	return mean(_.map(_.filter(incidentsData, function (i) {
		return (i.borough == borough) && !_.contains(closedStations, i.firstPumpStation);
	}), function (i) { return i.firstPumpTime; }));
}, function (borough, closedStations) {
	closedStations = ([ ].concat(closedStations)).sort();
	return borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '');
});


/* This function replaces the calls to GetAreaResponseTime.php when a borough is
   specified. */
var getBoroughResponseTime = function (borough, closedStations, callback) {
	closedStations = [ ].concat(closedStations);
	loadIncidents(borough, function (err) {
		if (err) {
			callback(err, undefined) 
		} else {
			callback(null, getBoroughResponseTimeM(borough, closedStations));
		}  
	});
};


var getBoroughIncidentDataM = _.memoize(function (borough, closedStations) {
	close = [ ].concat(close);

	// Below is Davetaz's experimental measure for the ideal square on the map
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
	// Note that the calculation of each incident's "Davetaz grid" 
	// coordinates was moved to the pre-processing stage to make the JavaScript 
	// lighter
	boroughSquareIncidents = { };
	_.each(boroughIncidents, function (i) {
		var squareKey =  i.davetazLongitude.toFixed(4) + ',' + i.davetazLatitude.toFixed(4);
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
		temp += '"ward":"' + borough + (closedStations.length > 0 ? '-minus-' + closedStations.join('_') : '') + '",';
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

}, function (borough, closedStations) {
	return borough + (closedStations.length > 0 ? "-minus-" + closedStations.join("_") : "");
});


var getBoroughIncidentData = function (borough, closedStations, callback) {
	closedStations = [ ].concat(closedStations);
	loadIncidents(borough, function (err) {
		err ? callback(err, undefined) : callback(null, getBoroughIncidentDataM(borough, closedStations));  
	});
}
