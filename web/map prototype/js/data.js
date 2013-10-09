var data = undefined;

var loadData = function (callback) {
	d3.csv("data/incidents.csv", function (inputData) {
		data = inputData;
		callback(null);
	});
}