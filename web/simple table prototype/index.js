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

var lastFilterFunction = function (data) { return data; };

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

function test () {
	tabulate(undefined, function (data) {
		return _.filter(data, function (row) {
			return row["Station"].substring(0, 1).toLowerCase() != 'a';
		});
	})
}

function removeAllFilters() {
	tabulate(undefined, function (data) { return data; });
}

function tabulate (sortFunction, filterFunction) {

	filterFunction = filterFunction || 
		lastFilterFunction;
	lastFilterFunction = filterFunction;

	sortFunction = sortFunction || 
		sort();

	d3.csv("./ranking.csv", function (data) {

		data = filterFunction(data);
		data = sortFunction(data);

	    var columns = [ 
	    	"Station",
	    	"No. of first appliances",
	    	"First appliances, % <= 6 mins",
	    	"First appliances, % late",
	    	"No. of first appliances from other stations",
	    	"First appliances from other stations, % <= 6 mins",
	    	"First appliances from other stations, % late",
	    	"% late difference"
    	];

    	// formatting
    	// makes into %s all values of all columns <=1
    	data = _.map(data, function (row) {
			_.each(_.keys(row), function (columnName) {
				if (row[columnName] <= 1)
					row[columnName] = d3.format(".2%")(row[columnName]);
			})
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
	});

}
