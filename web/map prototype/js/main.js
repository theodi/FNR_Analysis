var log = function (s) {
	var entryDate = new Date();
	console.log(entryDate.getFullYear() + "/" + (entryDate.getMonth() < 9 ? '0' : '') + (entryDate.getMonth() + 1) + "/" + (entryDate.getDate() < 10 ? '0' : '') + entryDate.getDate() + " " + (entryDate.getHours() < 10 ? '0' : '') + entryDate.getHours() + ":" + (entryDate.getMinutes() < 10 ? '0' : '') + entryDate.getMinutes() + ":" + (entryDate.getSeconds() < 10 ? '0' : '') + entryDate.getSeconds() + " - " + s);
}

//loadBoroughs();
$.getJSON("data/boroughs.json", function( data ) {
	var items = [];
	$.each( data, function( key, val ) {
		loadBoroughBoundary(val);
	});
});

loadStations();
   
for (i = 0; i < incidentLayers.length; i++) {
	loadIncidentData(incidentLayers[i]);
}

$(document).ready(function() {
	log("Starting loading data...");
	loadData(function (err) {
		log("Data loaded (incidents.csv and stations.csv).");
		for (var i = 0; i < incidentLayers.length; i++) {
			loadIncidentData(incidentLayers[i]);
		}
		updateBoroughsSelected();
	});
});
