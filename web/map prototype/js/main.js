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
	for (i = 0; i < incidentLayers.length; i++) {
		loadIncidentData(incidentLayers[i]);
	}
	updateBoroughsSelected();
});
