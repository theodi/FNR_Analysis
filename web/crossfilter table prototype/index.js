// source http://www.itv.com/news/london/story/2013-08-05/mayor-forces-through-fire-cuts/
var MAYOR_PLANNED_CLOSURES = [
	"Belsize",
	"Bow",
	"Clerkenwell",
	"Downham",
	"Kingsland",
	"Knightsbridge",
	"Silvertown",
	"Southwark",
	"Westminster",
	"Woolwich",
];

var FULL_DATA = [ ];

var lastSorted = { 
	columnName: undefined,
	asc: true,
}

function sort (columnName, asc) {
	// if columnName is not specified, sorting takes place with
	// the same parameters the last time it was called
	if (!columnName) {
		columnName = lastSorted.columnName;
		asc = lastSorted.asc;
	} else {
		asc = asc || (columnName != lastSorted.columnName ?
			asc = true : asc = !lastSorted.asc);
	}
	// keep memory of the parameters used
	lastSorted = { 
		columnName: columnName,
		asc: asc,
	}
	// the actual sorting function
	return function (data) {
		return data.sort(function (a, b) {
			return (asc ? 1 : -1) 
				* (a[columnName] > b[columnName] ? 1 : -1);
			});
	};
}

function tabulate (sortFunction) {

	sortFunction = sortFunction || sort();

	var calculationTime = new Date();

	if (FULL_DATA.length == 0) {
		d3.select("#container").html("No data to display!")
		return;
	}

	var data = FULL_DATA;
	data = sortFunction(data);

    var columns = _.keys(data[0]);

	// formatting
	// makes into %s all values of all columns <=1
	data = _.map(data, function (row) {
		_.each([
				"First appliances, % <= 6 mins",
				"First appliances, % late",
				"First appliances from other stations, % <= 6 mins",
				"First appliances from other stations, % late",
				"% late difference",
			], function (columnName) {
				if (row[columnName] <= 1)
					row[columnName] = d3.format(".2%")(row[columnName]);
			});
			return row;
	});

    var table = d3.select("#container")
    		.html("")
    		.append("table"),
        thead = table.append("thead"),
        tbody = table.append("tbody");

    // append the header row
    thead.append("tr")
        .selectAll("th")
        .data(columns)
        .enter()
        .append("th")
            .text(function(column) { 
            	return column; 
            })
        	.on('click', function (columnName) {
        		tabulate(sort(columnName));
        	})

    // create a row for each object in the data
    var rows = tbody.selectAll("tr")
        .data(data)
        .enter()
        .append("tr");

    // create a cell in each row for each column
    var cells = rows.selectAll("td")
        .data(function (row) {
            return columns
            	.map(function (column) {
                	return { column: column, value: row[column] };
            });
        })
        .enter()
        .append("td")
            .text(function(d) { 
            	return ((d.column == "Station") &&
            			_.contains(MAYOR_PLANNED_CLOSURES, 
            				d.value) ? "* " : "")  
            		+ d.value; 
            });

	console.log("Table sorted and rendered in " + ((new Date()) - calculationTime) + " milliseconds.");

}

function rank (parameters, callback) {

	var fromDate = (parameters || { fromDate: undefined }).fromDate;
	var toDate = (parameters || { toDate: undefined }).toDate;

	d3.csv("./data.csv", function (inputData) {

		var calculationTime = new Date();
		var stationGrounds = { };

		// filter out the dates that are not interesting
		if (fromDate)
			inputData = _.filter(inputData, function (row) {
				return new Date(row.DateOfCall) >= fromDate;
			})
		if (toDate)
			inputData = _.filter(inputData, function (row) {
				return new Date(row.DateOfCall) <= toDate;
			})
		
		// first pass
		_.each(inputData, function (row) {
	        // if this is a new station ground, initialise its data 
	        stationGrounds[row.IncidentStationGround] = 
	            stationGrounds[row.IncidentStationGround] || 
	            { 
	              "Station": row.IncidentStationGround,
	              attendanceTimesOwnStation: [ ],
	              attendanceTimesOtherStations: [ ],
	            };
	        // ... then, add the new attendance time 
	        stationGrounds[row.IncidentStationGround][
	                row.IncidentStationGround == 
	                    row.FirstPumpArriving_DeployedFromStation ?
	                        'attendanceTimesOwnStation' : 
	                        'attendanceTimesOtherStations'
	            ].push(parseFloat(row.FirstPumpArriving_AttendanceTime));
	    });

		// second pass
	    _.each(stationGrounds, function (sg) {

	        /* TODO: this function still produces results that are slightly
	        misaligned with davetaz's: the 'ok' values calculated by the 
	        _.countBy function are always 1 unit higher than his. The total
	        of 'ok' and 'late' is right. Re-factoring the same calculation 
	        using an old style JavaScript 'for' produces the same result. */

	        // own station
	        sg["No. of first appliances"] = 
	            sg.attendanceTimesOwnStation.length;
	        // if there are no appliances, compliance is 100%
	        sg["First appliances, % <= 6 mins"] = 1.0;
	        if (sg["No. of first appliances"] > 0)
		        sg["First appliances, % <= 6 mins"] = (_.countBy(
		            sg.attendanceTimesOwnStation, 
		            function (num) {
		              return num <= 360. ? 'ok' : 'late';
		            }
		        ).ok || 0) / sg["No. of first appliances"];
	        sg["First appliances, % late"] = 1.0 - 
	            sg["First appliances, % <= 6 mins"];

	        // other stations
	        sg["No. of first appliances from other stations"] = 
	            sg.attendanceTimesOtherStations.length;
	        // if there are no appliances, compliance is 100%
	        sg["First appliances from other stations, % <= 6 mins"] = 1.0;
	        if (sg["No. of first appliances from other stations"] > 0)
		        sg["First appliances from other stations, % <= 6 mins"] = (_.countBy(
		            sg.attendanceTimesOtherStations, 
		            function (num) {
		              return num <= 360. ? 'ok' : 'late';
		            }
		        ).ok || 0) / sg["No. of first appliances from other stations"];
	        sg["First appliances from other stations, % late"] = 1.0 - 
	            sg["First appliances from other stations, % <= 6 mins"];

	        // difference
	        sg["% late difference"] = sg["First appliances from other stations, % late"] -
	            sg["First appliances, % late"];

	        // clean up
	        delete sg.attendanceTimesOwnStation;
	        delete sg.attendanceTimesOtherStations;

	    });

		console.log("Ranking calculated in " + ((new Date()) - calculationTime) + " milliseconds.");

		// make the object into an array, the way d3js can use it
		FULL_DATA = [ ];
		_.each(_.keys(stationGrounds), function (x) {
			FULL_DATA.push(stationGrounds[x]);
		});

		// finished
		callback(null);

	});	

}
