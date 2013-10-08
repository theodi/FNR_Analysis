var defaultIncidentLayers = ["Newham","Lambeth"];

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }

    return false;
}

function checkThis(name) {
	if (document.getElementById(name).checked) {
		if (mapLayerGroups[name]) {
			showLayer(name);
		} else {
			loadIncidentData(name);
		}
	} else {
		if (mapLayerGroups[name]) {
			hideLayer(name);
		}
	}
}

function showBoroughs() {
	$.getJSON( "js/boroughs.json", function( data ) {
		var items = [];
		$.each( data, function( key, val ) {
			if (containsObject(val,defaultIncidentLayers)) {
				items.push(val + "<input id='" + val + "' type='checkbox' checked onClick='checkThis(\""+val+"\")'/><br/>" );
			} else {
				items.push(val + "<input id='" + val + "' type='checkbox' onClick='checkThis(\""+val+"\")'/><br/>" );
			}
		});
		$('body').append(items);
//.appendTo( "boroughs" );
	});
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
	this._div.innerHTML = (props ?
			'Number of Incidents: <b>' + props.incidents + '</b><br />Average Response Time: <b>' + props.response + '</b><br/>Managing Station: <b>' + props.managing + '</b><br/>Stations responding: <b>' + props.attending + '</b>'
			: ' Hover over an area' );
};

info.addTo(map);


// get color depending on population density value
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

var geojson;
var mapLayerGroups = [];

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
		click: zoomToFeature
	});
		
}


function loadBoroughBoundary(borough) {
	if (!containsObject(borough,defaultIncidentLayers)) {
		$.getJSON( "kml/"+borough+".json", function( data ) {
        	        geojson = L.geoJson(data, {
	                        style: boroughStyle,
        	                onEachFeature: onEachBoroughFeature,
	                })
        	        showLayer("B:" + borough);
        	});
	}
}

function loadIncidentData(borough) {
	$.getJSON( "boroughs/"+borough+".js", function( data ) {
		geojson = L.geoJson(data, {
			style: style,
			onEachFeature: onEachFeature,
		})
		showLayer(borough);
	});
}

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

function showLayer(id) {
	var lg = mapLayerGroups[id];
	map.addLayer(lg);   
}

function hideLayer(id) {
	var lg = mapLayerGroups[id];
	map.removeLayer(lg);   
}

//loadBoroughs();
$.getJSON( "js/boroughs.json", function( data ) {
	var items = [];
	$.each( data, function( key, val ) {
		loadBoroughBoundary(val);
	});
});
   
for (i = 0; i < defaultIncidentLayers.length; i++) {
	loadIncidentData(defaultIncidentLayers[i]);
}

$( document ).ready(function() {
	showBoroughs();
});
