/* IncidentLayers is an array listing all layers being visible. The layers 
   names are prefixed by "B:", or "I:" depending on the kind of layer 
   (borough, incidents) */
var incidentLayers = [ ];

/* closedStations is an array listing all the stations that are
   closed */
var closedStations = [ ];

var stationMarkers = { };

// TODO: Resize icons based upon zoom level
var stationIconClosing = L.icon({
	iconUrl: 'images/icon_firetruck_closing.png',
	iconSize: [20, 20]
});

var stationIcon = L.icon({
	iconUrl: 'images/icon_firetruck_ok.png',
	iconSize: [20, 20]
});


function removeArrayItem(item,array) {
	for(var i = array.length - 1; i >= 0; i--) {
 	   if (array[i] === item) {
	       array.splice(i, 1);
	   }
	}
	return array;
}

function boroughControl(name) {
	borough = name.substring(4,name.length);
	console.log(borough);
	if (document.getElementById(name).checked) {
		if (mapLayerGroups[borough]) {
			showLayer("I:"+borough);
			hideLayer("B:"+borough);
		} else {
			loadIncidentData(borough,closedStations);
		}
	} else {
		// Hide any Incident layers that start with the borough we want to hide
		for (key in mapLayerGroups) {
			if (key.substring(0,borough.length) == borough) {
				hideLayer("I:"+key);
				incidentLayers = removeArrayItem(key,incidentLayers);
			}
		}
		// Hide the borough incident detail
		if (mapLayerGroups[borough]) {
			hideLayer("I:"+borough);
			showLayer("B:"+borough);
			incidentLayers = removeArrayItem(borough,incidentLayers);
		}
		updateBoroughsSelected();
	}
}

// This updates the box to the top right of the map, listing the stations that
// are currently simulated as closed.
function updateBoroughsSelected() {
	log("Updating the selected borough box.")
	$('boroughs').html("");
	$.getJSON("data/boroughs.json", function(data) {
		var items = [];
		$.each(data, function( key, val ) {
			if (_.contains(incidentLayers, val)) {
				items.push(val + "<input id='sel_" + val + "' type='checkbox' checked onClick='boroughControl(\"sel_"+val+"\")'/><br/>" );
			}
		});
		$('boroughs').append(items);
	});
}

var updateBoroughStyle = function (borough) {
	var data = getBoroughResponseTime(borough, closedStations);
	var color = getColor(data);
	log("New response time for " + borough + " is " + data + " color " + color);
	for (var key in mapLayerGroups["B:" + borough]._layers) {
		mapLayerGroups["B:" + borough]._layers[key].setStyle({ fillColor:color });
		mapLayerGroups["B:" + borough]._layers[key].feature.properties.response = data;
	}
}

function closeStation(name) {
	if (!_.contains(closedStations, name)) {
		// Add the station to the array of closed stations
		closedStations.push(name);
		closedStations.sort();
		// I set the station icon's to 'closed'
		stationMarkers[name].setIcon(stationIconClosing);
		// For each borough impacted by the closure...
		_.each(boroughsReload(closedStations).boroughs, function (borough) {
			if (_.contains(incidentLayers, borough)) {
				loadIncidentData(borough);
			}
			//Change the colors of the borough shading to reflect closures
			updateBoroughStyle(borough);
		});
		updateBoroughsSelected();
	} else {
		log(name + " station is already closed.");
	}
}

function openStation(name) {
	if (_.contains(closedStations, name)) {
		stationMarkers[name].setIcon(stationIcon);
		closedStations = removeArrayItem(name, closedStations);	
		_.each(boroughsReload(name).boroughs, function (borough) {
			// for each borough impacted by the change, I hide the layers that
			// are currently displayed and are outdated 
			var layerName = borough + "-minus-" + closedStations.join("_");
			if (_.contains(incidentLayers, layerName)) {
				hideLayer("I:"+layerName);
			}
			if (_.contains(incidentLayers, borough) || _.contains(incidentLayers, layerName)) {
				loadIncidentData(borough);
			}
			updateBoroughStyle(borough)
		});
		updateBoroughsSelected();
	} else {
		log(name + " station is already open.")
	}
}

function getColor(d) {
	return d > 1140 ? '#8d4e4a' :
		d > 1020 ? '#ae504c' :
		d > 900 ? '#e14f4e' :
		d > 780 ? '#ed5c5c' :
		d > 660 ? '#f07d78' :
		d > 540 ? '#f49f99' :
		d > 420 ? '#f9c0b9' :
		d > 300 ? '#d7d465' :
		d > 180 ? '#9dd07e' :
		d > 60  ? '#73be52' :
		d < 60  ? '#5f904a' :
		'#FFEDA0';
}

function style(feature) {
	return {
		weight: 1,
		opacity: 1,
		color: getColor(feature.properties.response),
		fillOpacity: 0.7,
		fillColor: getColor(feature.properties.response)
	};
}

function boroughStyle(feature) {
	return {
		weight: 1,
		color: 'grey',
		dashArray: '3',
		fillOpacity: 0.7,
		fillColor: getColor(feature.properties.response),
		opacity: 0.7
	};
}

function highlightFeature(e) {
	var layer = e.target;

	layer.setStyle({
		weight: 5,
		color: '#666',
		dashArray: '',
		fillOpacity: 0.7
	});

	if (!L.Browser.ie && !L.Browser.opera) {
		layer.bringToFront();
	}
	info.update(layer.feature.properties);
}

function resetHighlight(e) {
	geojson.resetStyle(e.target);
	info.update();
}

function zoomToFeature(e) {
	map.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
	var lg = mapLayerGroups["I:" + feature.properties.ward];
	if (!lg) {
		log("Creating the layer I:" + feature.properties.ward + " for the first time");
		lg = new L.layerGroup();
		mapLayerGroups["I:" + feature.properties.ward] = lg;
	}
	console.log("Showing layer I:" + feature.properties.ward);
	lg.addLayer(layer);
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: zoomToFeature
	});	
}

function showBoroughDetail(e) {
	props = e.target.feature.properties;
	borough = props.borough;
	hideLayer("B:" + props.borough);
	loadIncidentData(props.borough,closedStations);
	updateBoroughsSelected();
	map.fitBounds(e.target.getBounds());
}

function onEachBoroughFeature(feature, layer) {
	var lg = mapLayerGroups["B:" + feature.properties.borough];
	if (lg === undefined) {
		lg = new L.layerGroup();
		mapLayerGroups["B:" + feature.properties.borough] = lg;
		lg.addLayer(layer);
	} else {
		lg.addLayer(layer);	
	}
	
	layer.on({
		mouseover: highlightFeature,
		mouseout: resetHighlight,
		click: showBoroughDetail
	});
		
}

function showMarkerDetails(station_name) {
	$('station').html(station_name);
}

function loadStations() {
	var lg = mapLayerGroups["Stations"];
	if (lg === undefined) {
        lg = new L.layerGroup();
        mapLayerGroups["Stations"] = lg;
	}
	$.getJSON("data/stations.json", function(data) {
		for (i=0; i<data.length; i++) {
			station = data[i];
			var markerLocation = new L.LatLng(station.latitude, station.longitude);
			// GIACECCO: where does this .closing property comes from? Can't find it anywhere else in DaveTaz's code
			if (station.closing == "true") {
				stationMarkers[station.name] = new L.Marker(markerLocation, {icon: stationIconClosing, name: station.name});
			} else {
				stationMarkers[station.name] = new L.Marker(markerLocation, {icon: stationIcon, name: station.name});
			}
			stationMarkers[station.name].on('mouseover', function(evt) {
				showMarkerDetails(evt.target.options.name);
			});
			lg.addLayer(stationMarkers[station.name]);
		}
		showLayer("Stations");
	});
}


// loads the borough boundaries data
var loadBoroughsBoundaries = function (callback) {
	log("Loading and displaying London boroughs' boundaries.");
	$.getJSON( "data/boroughs.json", function( data ) {
		_.each(data, function (val) {
			loadBoroughBoundary(val);
		});
		if (callback) callback(null);
	});
}


// loads and shows one borough's boundaries on the map, if the borough
// requires displaying
var loadBoroughBoundary = function (borough, callback) {
	$.getJSON( "data/BoroughBoundaries/" + borough + ".json", function(data) {
        geojson = L.geoJson(data, { 
			style: boroughStyle,
	        onEachFeature: onEachBoroughFeature,
        });
		if (!_.contains(incidentLayers, borough)) {
    	  	showLayer("B:" + borough);
		}
		if (callback) callback(null);
    });
}


function loadIncidentData (borough) {
   	closedStations = closedStations;

   	if (closedStations.length > 0) {
		plain_borough = borough;
		borough = borough + "-minus-" + closedStations.join("_");
		if(mapLayerGroups["B:"+borough]) {
			hideLayer("B:"+plain_borough);
		}
	}

	if (!_.contains(incidentLayers, borough)) {
		incidentLayers.push(borough);
	}
	
	if(mapLayerGroups["I:"+borough]) {
		showLayer("I:"+borough);
	} else {
		var data = getBoroughIncidentData(borough, closedStations);
		geojson = L.geoJson(data, {
			style: style,
			onEachFeature: onEachFeature,
		});
		showLayer("I:"+borough);
	}
}


function showLayer(id) {
	if (mapLayerGroups[id]) {
		var lg = mapLayerGroups[id];
		map.addLayer(lg);   
	}
}


function hideLayer(id) {
	if (mapLayerGroups[id]) {
		lg = mapLayerGroups[id];
		map.removeLayer(lg);   
	}
}


var map = L.map('map').setView([51.5, 0.04], 14);

var cloudmade = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png', {
	attribution: 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
	key: 'BC9A493B41014CAABB98F0471D759707',
	styleId: 22677
}).addTo(map);

// control that shows state info on hover
var info = L.control();

info.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'info');
	this.update();
	return this._div;
};

info.update = function (props) {
	if (props) {
		if (props.borough) {
			this._div.innerHTML = ('Borough: <b>' + props.borough + '</b>');
		} else {
			this._div.innerHTML = (
			'Number of Incidents: <b>' + props.incidents + '</b><br />Average Response Time: <b>' + props.response + '</b><br/>Managing Station: <b>' + props.managing + '</b><br/>Stations responding: <b>' + props.attending + '</b>');
		}
	} else {
		this._div.innerHTML = ( ' Hover over an area ');
	}
}	

info.addTo(map);

var geojson;
var mapLayerGroups = [];

map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {

	var div = L.DomUtil.create('div', 'info legend'),
		grades = [0, 60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140],
		labels = [],
		from, to;

	for (var i = 0; i < grades.length; i++) {
		from = grades[i];
		to = grades[i + 1];

		labels.push(
			'<i style="background:' + getColor(from + 1) + '"></i> ' +
			from + (to ? '&ndash;' + to : '+'));
	}

	div.innerHTML = labels.join('<br>');
	return div;
};

legend.addTo(map);
   
