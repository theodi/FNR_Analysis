/* FT's and Davetaz's prototype used 
var COLOUR_GRADES_MAX_VALUE = [60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140]; */

/* Giacecco's first attempt at an improvement
var COLOURS_GRADES = [ '#5f904a', '#73be52', '#9dd07e', '#d7d465', '#f9c0b9', 
		'#f49f99', '#f07d78', '#ed5c5c', '#e14f4e', '#ae504c', '#8d4e4a' ],
	COLOUR_GRADES_MAX_VALUE = [ 90, 180, 270, 360, 450, 540, 630, 720, 810, 900]; */

/* Second attempt, same number of grades (11), calculated using 
   http://www.perbang.dk/rgbgradient/ , inverse HSV gradient from 0FDB3A 
   to E60800
var COLOURS_GRADES = [ '#0FDB39', '#0EDC0D', '#3BDD0C', '#68DE0A', '#96DF09',
		'#C5E007', '#E1CC06', '#E29D04', '#E36C03', '#E43A01', '#E60800' ],
	COLOUR_GRADES_MAX_VALUE = [ 60, 120, 180, 240, 300, 360, 420, 480, 540, 600]; */

/* Third attempt, lower number of grades (6), calculated using 
   http://www.perbang.dk/rgbgradient/ , inverse HSV gradient from 0FDB3A 
   to E60800 */
var COLOURS_GRADES = [ '#0FDB39', '#3BDD0C', '#96DF09', '#E1CC06', '#E36C03',
		'#E60800' ],
	COLOUR_GRADES_MAX_VALUE = [ 120, 240, 360, 480, 600 ]; 


// DAVETAZ TODO: Resize icons based upon zoom level
var stationIconClosing = L.icon({
	iconUrl: 'images/icon_firetruck_closing.png',
	iconSize: [20, 20]
});

var stationIcon = L.icon({
	iconUrl: 'images/icon_firetruck_ok.png',
	iconSize: [20, 20]
});


// Hides one borough's incidents. 
function hideBoroughIncidents (borough) {
	log("Hiding the incidents layer for " + borough + " and replacing with the overall borough view");
	_.each(_.filter(_.keys(mapLayerGroups), function(layerGroupName) {
		return layerGroupName.substring(0, borough.length) == borough;
	}), function (layerGroupName) {
		hideLayer(layerGroupName);
		incidentLayers = removeArrayItem(layerGroupName, incidentLayers);
	});
	showLayer("B:" + borough);
	updateBoroughsSelected();
}


// This updates the box outside the map, at the top right of the page, listing 
// the *closed* stations only. Open stations don't need the same.
function updateBoroughsSelected() {
	log("Updating the selected borough box.")
	$('boroughs').html("");
	var items = [ ];
	_.each(BOROUGHS_NAMES, function(borough) {
		if (_.contains(incidentLayers, borough)) {
			items.push(borough + "<input id='sel_" + borough + "' type='checkbox' checked onClick='hideBoroughIncidents(\"" + borough + "\")'/><br/>" );
		}
	});
	$('boroughs').append(items);
}


var updateBoroughStyle = function (boroughList) {
	boroughList = [ ].concat(boroughList);
	_.each(boroughList, function (borough) { 
		var data = getBoroughResponseTime(borough, closedStations);
		var color = getColor(data);
		log("New response time for " + borough + " is " + data + " color " + color);
		for (var key in mapLayerGroups["B:" + borough]._layers) {
			mapLayerGroups["B:" + borough]._layers[key].setStyle({ fillColor:color });
			mapLayerGroups["B:" + borough]._layers[key].feature.properties.response = data;
		}
	});
}


var closeStation = function (name) {
	if (!_.contains(closedStations, name)) {
		// Add the station to the array of closed stations
		closedStations.push(name);
		closedStations.sort();
		// I set the station icon's to 'closed'
		stationMarkers[name].setIcon(stationIconClosing);
		// For each borough impacted by the closure...
		_.each(getImpactedBoroughs(closedStations), function (borough) {
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


// GIACECCO TODO: this can likely be made faster by calling the stations in
// reverse alphabetical order
var closeCandidateStations = function () {
	_.each(STATIONS_FACING_CLOSURE_NAMES, closeStation);
}


var openStation = function (name) {
	if (_.contains(closedStations, name)) {
		stationMarkers[name].setIcon(stationIcon);
		closedStations = removeArrayItem(name, closedStations);	
		_.each(getImpactedBoroughs(name), function (borough) {
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


var openCandidateStations = function () {
	_.each(STATIONS_FACING_CLOSURE_NAMES, openStation);
}


var getColor = function (d) {
	var i;
	for(i = 0; d > COLOUR_GRADES_MAX_VALUE[i]; i++) { }
	return COLOURS_GRADES[i];
}


var style = function (feature) {
	return {
		weight: 1,
		opacity: 1,
		color: getColor(feature.properties.response),
		fillOpacity: 0.7,
		fillColor: getColor(feature.properties.response)
	};
}


var boroughStyle = function (feature) {
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


var resetHighlight = function (e) {
	boroughsGeoJson.resetStyle(e.target);
	info.update();
}


var zoomToFeature = function (e) {
	map.fitBounds(e.target.getBounds());
}


function showBoroughDetail(e) {
	props = e.target.feature.properties;
	borough = props.borough;
	hideLayer("B:" + props.borough);
	loadIncidentData(props.borough,closedStations);
	updateBoroughsSelected();
	map.fitBounds(e.target.getBounds());
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
	_.each(stationsData, function (station) {
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
	});
	showLayer("Stations");
}


// loads the borough boundaries data
var loadBoroughsBoundaries = function (callback) {
	log("Loading and displaying London boroughs' boundaries.");
	_.each(BOROUGHS_NAMES, function (borough) {
		loadBoroughBoundary(borough);
	});
	if (callback) callback(null);
}


// Loads and shows one borough's boundaries on the map, if the borough
// requires displaying.
// GIACECCO: not clear if this is called on page creation only or later, too
var loadBoroughBoundary = function (borough, callback) {

	var onEachBoroughFeature = function (feature, layer) {
		var lg = mapLayerGroups["B:" + feature.properties.borough];
		if (!lg) {
			// The layer group for the borough did not exist
			lg = new L.layerGroup();
			mapLayerGroups["B:" + feature.properties.borough] = lg;
		}
		lg.addLayer(layer);	
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
			click: showBoroughDetail
		});
	}

	$.getJSON( "data/boroughBoundaries/" + borough + ".json", function(data) {
		// Differently from Davetaz's original code, I calculate the borough
		// response time with all stations open on the fly, rather than storing 
		// it into the borough definition JSON files. 
		data.features[0].properties.response = getBoroughResponseTime(borough, closedStations);
        boroughsGeoJson = L.geoJson(data, { 
			style: boroughStyle,
	        onEachFeature: onEachBoroughFeature,
        });
		if (!_.contains(incidentLayers, borough)) {
    	  	showLayer("B:" + borough);
		}
		if (callback) callback(null);
    });
}


var loadIncidentData = function (borough) {

	var onEachIncidentsFeature = function (feature, layer) {
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
		boroughsGeoJson = L.geoJson(data, {
			style: style,
			onEachFeature: onEachIncidentsFeature,
		});
		showLayer("I:"+borough);
	}
}


var showLayer = function (id) {
	if (mapLayerGroups[id]) {
		var lg = mapLayerGroups[id];
		map.addLayer(lg);   
	}
}


var hideLayer = function (id) {
	if (mapLayerGroups[id]) {
		lg = mapLayerGroups[id];
		map.removeLayer(lg);   
	}
}


/* *****************************************************************************
   Leaflet map initialisation and display
   ************************************************************************** */

var map = L.map('map').setView([51.5, 0.04], 14);

var cloudmade = L.tileLayer('http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png', {
	attribution: 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
	key: 'BC9A493B41014CAABB98F0471D759707',
	styleId: 22677
}).addTo(map);

/* GIACECCO TODO: we may likely want something similar to the commented line 
   below from the census example we started from, but stating the fact that the 
   data is actually open! */
// map.attributionControl.addAttribution('Population data &copy; <a href="http://census.gov/">US Census Bureau</a>');

/* boroughsGeoJson is a Leaflet GeoJSON object 
   http://leafletjs.com/reference.html#geojson containing the boroughs' 
   GeoJSON data */
var boroughsGeoJson;

/* mapLayerGroups is a hash of Leaflet LayerGroup objects 
   http://leafletjs.com/reference.html#layergroup , still not clear how
   Davetaz used it */
var mapLayerGroups = { };

/* IncidentLayers is an array listing all layers being visible. The layers 
   names are prefixed by "B:", or "I:" depending on the kind of layer 
   (borough, incidents) */
var incidentLayers = [ ];

/* closedStations is an array listing all the stations that are
   closed 
   THIS MUST BE KEPT SORTED AS MANY FUNCTIONS RELY ON THE ALPHABETICAL
   ORDER TO UNIQUELY IDENTIFY A SET OF CLOSED STATIONS */
var closedStations = [ ];

/* stationMarkers is an array of Leaflet 'Marker' objects 
   http://leafletjs.com/reference.html#marker representing the positions of the
   stations on the map and their state of open (blue) or closed (red) */ 
var stationMarkers = { };

/* *****************************************************************************
   The section below creates and updates the map information box in the top 
   right corner.
   ************************************************************************** */

var info = L.control();

info.onAdd = function (map) {
	this._div = L.DomUtil.create('div', 'info');
	this.update();
	return this._div;
};

/* This function updates the information box at the top right of the map. */
info.update = function (props) {
	if (props) {
		// 'props.borough' is a reference to the tile's 'borough' property in 
		// its JSON definition 
		if (props.borough) {
			this._div.innerHTML = ('Borough: <b>' + props.borough + '</b>');
		} else {
			// TODO: the 'else' branch is valid only until we start displaying 
			// the wards rather than the boroughs. This will have to be 
			// rewritten
			this._div.innerHTML = (
			'Number of Incidents: <b>' + props.incidents + '</b><br />Average Response Time: <b>' + props.response + '</b><br/>Managing Station: <b>' + props.managing + '</b><br/>Stations responding: <b>' + props.attending + '</b>');
		}
	} else {
		this._div.innerHTML = ( ' Hover over an area ');
	}
}	

info.addTo(map);


/* *****************************************************************************
   Map legend creation and display.
   Note: on Chrome - and likely other browsers - it is normal that the legend
   disappears if you open the JavaScript console. 
   ************************************************************************** */

var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
	var div = L.DomUtil.create('div', 'info legend'),
		grades = [ 0 ].concat(COLOUR_GRADES_MAX_VALUE),
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
