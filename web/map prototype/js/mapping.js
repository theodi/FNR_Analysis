// Setup

//var incidentLayers = ["Newham","Lambeth"];
var incidentLayers = [];
var closeStationsSelection = [];
var markers = {};

// TODO: Resize icons based upon zoom level
var stationIconClosing = L.icon({
	iconUrl: 'images/icon_firetruck_closing.png',
	iconSize: [20, 20]
});

var stationIcon = L.icon({
	iconUrl: 'images/icon_firetruck_ok.png',
	iconSize: [20, 20]
});

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {i
	item = list[i];
        if (item === obj) {
            return true;
        }
    	if (item.indexOf("-minus-") > 0) {
		item = item.substring(0,item.indexOf("-minus-"));
    	}
        if (item === obj) {
            return true;
        }
    }
    return false;
}

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
	log(borough);
	if (document.getElementById(name).checked) {
		if (mapLayerGroups[borough]) {
			showLayer(borough);
			hideLayer("B:"+borough);
		} else {
			loadIncidentClosureData(borough,closeStationsSelection);
		}
	} else {
		// Hide any Incident layers that start with the borough we want to hide
		for (key in mapLayerGroups) {
			if (key.substring(0,borough.length) == borough) {
				hideLayer(key);
				incidentLayers = removeArrayItem(key,incidentLayers);
			}
		}
		// Hide the borough incident detail
		if (mapLayerGroups[borough]) {
			hideLayer(borough);
			showLayer("B:"+borough);
			incidentLayers = removeArrayItem(borough,incidentLayers);
		}
		updateBoroughsSelected();
	}
}

function updateBoroughsSelected() {
	$('boroughs').html("");
	$.getJSON( "data/boroughs.json", function( data ) {
		var items = [];
		$.each( data, function( key, val ) {
			if (containsObject(val,incidentLayers)) {
				items.push(val + "<input id='sel_" + val + "' type='checkbox' checked onClick='boroughControl(\"sel_"+val+"\")'/><br/>" );
			}
		});
		$('boroughs').append(items);
	});
}

function updateBoroughStyle(borough, stations) {
	stations = stations.join(",");
	$.getJSON( "library/GetAreaResponseTime.php?borough="+borough+"&closed=" + stations, function( data ) {
		color = getColor(data);
		log("New response time for " + borough + " is " + data + " color " + color);
		layerhook = mapLayerGroups["B:" + borough]._layers;
		for (key in layerhook) {
			mapLayerGroups["B:" + borough]._layers[key].setStyle({fillColor:color});
			mapLayerGroups["B:" + borough]._layers[key].feature.properties.response = data;
		}
	});
}

function closeStation(name) {
	// Stage one: Add this station to the array of closed stations
	if (!containsObject(name,closeStationsSelection)) {
		closeStationsSelection.push(name);
		closeStationsSelection.sort();
	}
	markers[name].setIcon(stationIconClosing);
	$.each(boroughsReload(closeStationsSelection).boroughs, function(key, val) {
		borough = val;
		if (containsObject(borough, incidentLayers)) {
			loadIncidentClosureData(borough, closeStationsSelection);
		}
		//Change the colors of the borough shading to reflect closures
		updateBoroughStyle(borough, closeStationsSelection.join(","));
	});
	updateBoroughsSelected();
}

function openStation(name) {
	log(incidentLayers);
	closeCache = closeStationsSelection;
	markers[name].setIcon(stationIcon);
	$.getJSON( "library/BoroughsReload.php?stations=" + name, function( data ) {
		$.each( data.boroughs, function( key, val ) {
			if (!containsObject(name,closeCache)) {
				closeCache.push(name);
			}
			borough = val;
			old_borough = borough + "-minus-";
			for (i=0;i<closeCache.length;i++) {
				old_borough = old_borough + closeCache[i] + "_";
			}
			old_borough = old_borough.substring(0,old_borough.length - 1);
			log("Hiding " + old_borough);
			if (containsObject(old_borough,incidentLayers)) {
				hideLayer(old_borough);
			}

			temparrayclosures = removeArrayItem(name,closeStationsSelection);
			if (containsObject(borough,incidentLayers) || containsObject(old_borough,incidentLayers)) {
				if (temparrayclosures.length > 0) {
					loadIncidentClosureData(borough,temparrayclosures);
				} else {
					loadIncidentData(borough);
				}
			}
			updateBoroughStyle(borough,closeStationsSelection)
		});
		closeStationsSelection = removeArrayItem(name,closeStationsSelection);	
		updateBoroughsSelected();
	})
	.error(function() {
		log("error");
	}); 
	
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
	var lg = mapLayerGroups[feature.properties.ward];
	if (lg === undefined) {
		lg = new L.layerGroup();
		mapLayerGroups[feature.properties.ward] = lg;
		log("Layername = " + feature.properties.ward);
		lg.addLayer(layer);
	} else {
		lg.addLayer(layer);	
	}
	
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
	loadIncidentClosureData(props.borough,closeStationsSelection);
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
	$.getJSON( "data/stations.json", function( data ) {
		for (i=0;i<data.length;i++) {
			station = data[i];
			var markerLocation = new L.LatLng(station.latitude, station.longitude);
			if (station.closing == "true") {
				markers[station.name] = new L.Marker(markerLocation, {icon: stationIconClosing, name: station.name});
			} else {
				markers[station.name] = new L.Marker(markerLocation, {icon: stationIcon, name: station.name});
			}
			markers[station.name].on('mouseover', function(evt) {
				showMarkerDetails(evt.target.options.name);
			});
			lg.addLayer(markers[station.name]);
		}
		showLayer("Stations");
	});
}

function loadBoroughBoundary(borough) {
	if (!containsObject(borough,incidentLayers)) {
		$.getJSON( "data/boroughBoundaries/"+borough+".json", function( data ) {
        	        geojson = L.geoJson(data, {
	                        style: boroughStyle,
        	                onEachFeature: onEachBoroughFeature,
	                })
        	        showLayer("B:" + borough);
        	});
	}
}

function loadIncidentData(borough) {
	if (!containsObject(borough,incidentLayers)) {
		incidentLayers.push(borough);
	}
	
	if(mapLayerGroups[borough]) {
		showLayer(borough);
	} else {
		$.getJSON("data/incidentsByBorough/"+borough+".json", function( data ) {
			geojson = L.geoJson(data, {
				style: style,
				onEachFeature: onEachFeature,
			});
			showLayer(borough);
		})
		.error( function() {
			log("Failed to load borough boundary for " + borough);
		});
	}
}

function loadIncidentClosureData(borough,closedStations) {
   closedStations = closeStationsSelection;
	
   if (closedStations.length < 1) {
	loadIncidentData(borough);
   } else {

	plain_borough = borough;
	query_string = "?borough=" + borough + "&close=";
	borough = borough + "-minus-";
	for (i=0;i<closedStations.length;i++) {
		borough = borough + closedStations[i] + "_";
		query_string = query_string + closedStations[i] + ",";
	}
	borough = borough.substring(0,borough.length - 1);
	query_string = query_string.substring(0,query_string.length - 1);
	url = "library/GetBoroughIncidentData.php" + query_string;
	log(url);
		
	if (!containsObject(borough,incidentLayers)) {
		incidentLayers.push(borough);
	}
	
	if(mapLayerGroups[borough]) {
		hideLayer(plain_borough);
		showLayer(borough);
	} else {
		$.getJSON( url, function( data ) {
			geojson = L.geoJson(data, {
				style: style,
				onEachFeature: onEachFeature,
			});
			hideLayer(plain_borough);
			showLayer(borough);
		});
	}
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

