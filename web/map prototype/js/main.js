var log = function (s) {
	var entryDate = new Date();
	console.log(entryDate.getFullYear() + "/" + (entryDate.getMonth() < 9 ? '0' : '') + (entryDate.getMonth() + 1) + "/" + (entryDate.getDate() < 10 ? '0' : '') + entryDate.getDate() + " " + (entryDate.getHours() < 10 ? '0' : '') + entryDate.getHours() + ":" + (entryDate.getMinutes() < 10 ? '0' : '') + entryDate.getMinutes() + ":" + (entryDate.getSeconds() < 10 ? '0' : '') + entryDate.getSeconds() + " - " + s);
}

$(document).ready(function() {
	loadData(function (err) {
		loadBoroughsBoundaries(function (err) {
			// updateBoroughStyle(BOROUGHS_NAMES);
		});
		loadStations();
	});
});
