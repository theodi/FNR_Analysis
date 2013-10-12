var log = function (s) {
	var entryDate = new Date();
	console.log(entryDate.getFullYear() + "/" + (entryDate.getMonth() < 9 ? '0' : '') + (entryDate.getMonth() + 1) + "/" + (entryDate.getDate() < 10 ? '0' : '') + entryDate.getDate() + " " + (entryDate.getHours() < 10 ? '0' : '') + entryDate.getHours() + ":" + (entryDate.getMinutes() < 10 ? '0' : '') + entryDate.getMinutes() + ":" + (entryDate.getSeconds() < 10 ? '0' : '') + entryDate.getSeconds() + " - " + s);
}

$(document).ready(function() {
	loadData(function (err) {
		loadBoroughsBoundaries();
		loadStations();
		log("Loading incidents data for selected boundaries.");
		// in reality, the map never loads for the first time with incidents
		// showing
		for (var i = 0; i < incidentLayers.length; i++) {
			loadIncidentData(incidentLayers[i]);
		}
		updateBoroughsSelected();
	});
});
