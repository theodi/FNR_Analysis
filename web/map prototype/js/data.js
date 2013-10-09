var data = undefined;

var loadData = function (callback) {
	d3.csv("data/incidents.csv", function (inputData) {
		data = inputData;
		callback(null);
	});
}

/* This function replaces the calls to BoroughsReload.php. Input is one station 
   name or an array of station names. It returns an { boroughs: [Array] } object
   with the list of borough names whose incidents have been attended by the 
   stations as 'first pumps'. */
var boroughsReload = function (stations) {
	stations = [ ].concat(stations);
	return { boroughs: _.unique(_.map(_.filter(data, function (r) {
		return _.contains(stations, r.firstPumpStation);
	}), function (r) { return r.borough; })) };
}
