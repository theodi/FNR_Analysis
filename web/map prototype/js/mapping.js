// DAVETAZ TODO: Resize icons based upon zoom level
var stationIconClosing = L.icon({
	iconUrl: 'images/icon_firetruck_closing.png',
	iconSize: [20, 20]
});

var stationIcon = L.icon({
	iconUrl: 'images/icon_firetruck_ok.png',
	iconSize: [20, 20]
});


var boroughsByFirstRespondersPromise;

var impactedBoroughs = function(closed_stations, callback) {
  if(!boroughsByFirstRespondersPromise) {
    boroughsByFirstRespondersPromise = $.get("/data/boroughs_by_first_responders.json")
  }
 boroughsByFirstRespondersPromise.success(function(data) {
  callback(_.uniq(_.flatten(_.map(closed_stations, function(station) {
    return data[station];
  }))));
 });
}


// Hides one borough's incidents.
var hideBoroughIncidents = function (borough) {
	log("Hiding the incidents layer for " + borough + " and replacing with the overall borough view");
	_.each(_.filter(_.keys(mapLayerGroups), function(layerGroupName) {
		return layerGroupName.match(new RegExp(borough)) != null;
	}), function (layerGroupName) {
		hideLayer(layerGroupName);
		incidentLayers = removeArrayItem(layerGroupName, incidentLayers);
	});
	showLayer("B:" + borough);
	updateBoroughsSelected();
}


// This updates the box outside the map, at the top right of the page, listing
// the *closed* stations only. Open stations don't need the same.
var updateBoroughsSelected = function () {
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
		getBoroughResponseTime(borough, closedStations, function(_, data) {
      var color = getColor(data);
      log("New response time for " + borough + " is " + data + " color " + color);
      for (var key in mapLayerGroups["B:" + borough]._layers) {
        mapLayerGroups["B:" + borough]._layers[key].setStyle({ fillColor:color });
        mapLayerGroups["B:" + borough]._layers[key].feature.properties.response = data;
      }
    });
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
    impactedBoroughs(closedStations, function(boroughs) {
      _.each(boroughs, function (borough) {
        if (_.contains(incidentLayers, borough)) {
          loadIncidentData(borough);
        }
        //Change the colors of the borough shading to reflect closures
        updateBoroughStyle(borough);
      });
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
		impactedBoroughs(name, function(boroughs) {
      _.each(boroughs, function (borough) {
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
    });
		updateBoroughsSelected();
	} else {
		log(name + " station is already open.")
	}
}


var openCandidateStations = function () {
	_.each(STATIONS_FACING_CLOSURE_NAMES, openStation);
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
}

var resetHighlight = function (e) {

}


var zoomToFeature = function (e) {
	map.fitBounds(e.target.getBounds());
}

var showMarkerDetails = function (station_name) {
	$('station').html(station_name);
}


var loadStations = function () {
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

/* IncidentLayers is an array listing all layers being visible. The layers
   names are prefixed by "B:", or "I:" depending on the kind of layer
   (borough, incidents) */
var incidentLayers = [ ];

/* stationMarkers is an array of Leaflet 'Marker' objects
   http://leafletjs.com/reference.html#marker representing the positions of the
   stations on the map and their state of open (blue) or closed (red) */
var stationMarkers = { };

