Map = (function() {
  _this = {

    initCenter: [51.485, -0.120],
    initZoom:   10,


    overlayHueMin: 0.0,
    overlayHueMax: 0.1,
    overlaySatMin: 1,
    overlaySatMax: 1,
    overlayValMin: 0.8,
    overlayValMax: 1.0,

    scoreLowerScale: 325,
    scoreUpperScale: 275,

    gradeMinValues: [0, 180, 360, 540],

    boroughOutlineWeight:     1,
    boroughOutlineColor:      '#2D0D01',
    boroughOutlineOpacity:    0.8,
    boroughOutlineDashArray:  '',
    boroughFillOpacity:       0.8,

    hoverBoroughOutlineWeight:    2,
    hoverBoroughOutlineColor:     '#2D0D01',
    hoverBoroughOutlineOpacity:   0.8,
    hoverBoroughOutlineDashArray: '',
    hoverBoroughFillOpacity:      0.8,

    incidentOutlineWeight:      0,
    incidentOutlineColor:       '#2D0D01',
    incidentOutlineOpacity:     0.8,
    incidentOutlineDashArray:   '',
    incidentFillOpacity:        0.8,

    cloudMadeKey: 'BC9A493B41014CAABB98F0471D759707',
    mapStyleId:   22677, //111403,

    cloudMadeUrlString:
      'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
    mapAttribution:
      'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',

    boroughDataUrlString:
      'data/boroughBoundaries/{borough}.json',

    stationIconClosing: L.icon({
      iconUrl: 'images/icon_firetruck_closing.png',
      iconSize: [20, 20]
    }),

    stationIcon: L.icon({
      iconUrl: 'images/icon_firetruck_ok.png',
      iconSize: [20, 20]
    }),

    initialize: function(container) {
      _this.container = container;
      _this.mapLayerGroups = {};
      _this.activeIncidentLayers = [];
      _this.boroughsGeoJson = null;
      _this.closedStations = [];
      _this.stationMarkers = [];
      _this.initMap();
      _this.initTileLayer();
      _this.initLegend();
      _this.initBoroughBoundaries();
      _this.initStations();
    },

    initMap: function() {
      _this.map = L.map(_this.container);
      _this.map.setView(_this.initCenter, _this.initZoom);
    },

    initTileLayer: function() {
      L.tileLayer(_this.cloudMadeUrlString, {
        attribution: _this.mapAttribution,
        key:         _this.cloudMadeKey,
        styleId:     _this.mapStyleId,
      }).addTo(_this.map);
    },

    initLegend: function() {
      var gradeMaxValues = _.rest(_this.gradeMinValues);
      var gradeBounds = _.zip(_this.gradeMinValues, gradeMaxValues);
      var grades = _.map(gradeBounds, function(grade) {
        return {
          from: grade[0] / 60,
          to: grade[1] / 60,
          color: _this.getColor(grade[0])
        }
      });

      $("#legend").html(_this.template("legend", {"grades": grades}));
    },

    initBoroughBoundaries: function() {
      log("Loading and displaying London boroughs' boundaries.");
      _.each(BOROUGHS_NAMES, function (borough) {
        _this.initBoroughBoundary(borough);
      });
    },

    initStations: function() {
      _this.showLayer("stations", "stations", function(lg, cont) {
        _.each(stationsData, function (station) {
          var markerLocation = new L.LatLng(station.latitude, station.longitude);
          var marker = new L.Marker(markerLocation, {icon: _this.stationIcon, name: station.name});
          _this.stationMarkers[station.name] = marker
          marker.on('click', _this.toggleStation);
          lg.addLayer(marker);
          cont();
        });
      })
    },


    initBoroughBoundary: function(borough) {
      _this.showBoroughLayer(borough, function(lg, cont) {
        $.getJSON(_this.boroughDataUrl(borough), function(data) {
          _this.boroughsGeoJson = L.geoJson(data, {
            style: _this.boroughStyle,
            onEachFeature: function (feature, layer) {
              lg.addLayer(layer);
              layer.on({
                mouseover: _this.highlightFeature,
                mouseout:  _this.resetHighlight,
                click:     _this.showBoroughDetail
              });
              cont();
            }
          });
        });
      });
    },

    updateInfo: function(props) {
      var info;
      if(props) {
        var template_name = props.borough ? "info-borough" : "info-ward";
        info = _this.template(template_name, props);
      } else {
        info = "";
      }
      $("#info").html(info);
    },



    highlightFeature: function(event) {
      var layer = event.target;
      layer.setStyle({
        weight:      _this.hoverBoroughOutlineWeight,
        color:       _this.hoverBoroughOutlineColor,
        opacity:     _this.hoverBoroughOutlineOpacity,
        dashArray:   _this.hoverBoroughDashArray,
        fillOpacity: _this.hoverBoroughFillOpacity
      });

      if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
      }
      _this.updateInfo(layer.feature.properties);
    },

    resetHighlight: function(event) {
	    _this.boroughsGeoJson.resetStyle(event.target);
	    _this.updateInfo();
    },

    showBoroughDetail: function(event) {
      var target = event.target
      var props = target.feature.properties;
      var borough = props.borough;
      _this.showBoroughIncidentData(borough);
      _this.map.fitBounds(target.getBounds());
    },

    zoomToIncident: function(event) {
	    _this.map.fitBounds(event.target.getBounds());
    },

    toggleStation: function(event) {
      var name = event.target.options.name;
      if(_this.stationClosed(name)) {
        _this.closeStation(name);
      } else {
        _this.openStation(name);
      }
    },

    stationClosed: function(name) {
      return !_.contains(_this.closedStations, name);
    },

    closeStation: function(name) {
      if (!_.contains(_this.closedStations, name)) _this.closedStations.push(name);
      _this.stationMarkers[name].setIcon(_this.stationIconClosing);
      impactedBoroughs(_this.closedStations, function(boroughs) {
        console.log(boroughs);
        _.each(boroughs, function (borough) {
          _this.updateBoroughDisplay(borough);
        });
      })
    },

    openStation: function(name) {

    },

    updateBoroughDisplay: function(borough) {
      if(_this.incidentLayerActive(borough))  {
        _this.updateBoroughIncidentDisplay(borough);
      } else {
        _this.updateBoroughOverviewDisplay(borough);
      }
    },


    updateBoroughOverviewDisplay: function(borough) {
      getBoroughResponseTime(borough, _this.closedStations, function(err, resp) {
        var layerGroup = _this.mapLayerGroups["boroughs"][borough]
        _.each(layerGroup.getLayers(), function(layer) {
          layer.feature.properties.set("response", resp);
        });
      })
    },

    showBoroughIncidentData: function(borough) {
      _this.showIncidentLayer(borough, function(lg, cont) {
        getBoroughDetailedResponse(borough, _this.closedStations, function (_, data) {
          var incidentGeoJSON = L.geoJson(data, {
            style: _this.incidentStyle,
            onEachFeature: function(feature, layer) {
              lg.addLayer(layer);
              layer.on({
                mouseover:  _this.highlightFeature,
                mouseout:   _this.resetHighlight,
                click:      _this.zoomToIncident,
              });
            }
          });
          cont();
          _this.updateBoroughsSelected();
        });
      });
    },

    updateBoroughsSelected: function() {
      var boroughs = _.map(_this.activeIncidentLayers, function(borough) {
        return {
          name:       borough,
          id: "sel_" + borough.toLowerCase().replace("", "_")
        }
      });
      var inputs = _this.template("boroughs-selected", {"boroughs": boroughs});
      $('#boroughs div').html(inputs);
      $("#boroughs input").click(_this.handleBoroughCheckboxClick)
    },

    handleBoroughCheckboxClick: function(event) {
      var checkbox = $(this);
      var borough = checkbox.attr("data-borough-name");
      _this.toggleIncidentLayer(borough);
    },

    getColor: function(score) {
      var p = _this.logistic((score - _this.scoreLowerScale) / (_this.scoreUpperScale - _this.scoreLowerScale));

      var h = _this.overlayHueMin + p * (_this.overlayHueMax - _this.overlayHueMin);
      var s = _this.overlaySatMin + p * (_this.overlaySatMax - _this.overlaySatMin);
      var v = _this.overlayValMin + p * (_this.overlayValMax - _this.overlayValMin);
      var rgb = _this.hsvToRgb(h, s, v);
      var str = "#" + _.map(rgb, function(n) {
        hex = Math.floor(n).toString(16);
        return Math.floor(n) < 16 ? "0" + hex : hex;
      }).join("")
      return str;
    },

    template: function(name, data) {
     var template_string = $("#template-"+name).html();
     return _.template(template_string, data);
    },

    showBoroughLayer: function(borough, callback) {
      _this.showLayer("boroughs", borough, callback);
    },

    hideBoroughLayer: function(borough) {
      _this.hideLayer("boroughs", borough);
    },

    showIncidentLayer: function(borough, callback) {
      _this.showLayer("incidents", borough, callback);
      _this.hideBoroughLayer(borough);
      if (!_.contains(_this.activeIncidentLayers, borough)) {
        _this.activeIncidentLayers.push(borough);
      }
    },

    toggleIncidentLayer: function(borough, callback) {
      if(_this.incidentLAyerActive(borough))  {
        _this.hideIncidentLayer(borough);
      } else {
        _this.showIncidentLayer(borough, callback);
      }
    },

    hideIncidentLayer: function(borough) {
      _this.activeIncidentLayers = removeArrayItem(borough, _this.activeIncidentLayers);
      _this.hideLayer("incidents", borough);
      _this.showBoroughLayer(borough);
    },

    incidentLayerActive: function(borough) {
      return _.contains(_this.activeIncidentLayers, borough);
    },

    boroughStyle: function(feature) {
      var response = feature.properties.response;
      return {
        weight:       _this.boroughOutlineWeight,
        color:        _this.boroughOutlineColor,
        dashArray:    _this.hoverBoroughDashArray,
        fillOpacity:  _this.boroughFillOpacity,
        fillColor:    _this.getColor(response),
        opacity:      _this.boroughOutlineOpacity,
      };
    },

    incidentStyle: function(feature) {
      var response = feature.properties.response;
      return {
        weight:       _this.incidentOutlineWeight,
        opacity:      _this.incidentOutlineOpacity,
        color:        _this.incidentOutlineColor,
        dashArray:    _this.incidentOutlineDashArray,
        fillOpacity:  _this.incidentFillOpacity,
        fillColor:    _this.getColor(response)
	    };
    },

    boroughDataUrl: function(name) {
      return _this.boroughDataUrlString.replace("{borough}", name)
    },

    showLayer: function(type, key, callback) {
      if(!_this.mapLayerGroups[type]) _this.mapLayerGroups[type] = {};
      var lg = _this.mapLayerGroups[type][key];
      if (lg) {
        _this.map.addLayer(lg);
      } else {
        _this.mapLayerGroups[type][key] = lg = new L.layerGroup();
        if(callback) callback(lg, function() { _this.map.addLayer(lg); });
      }
    },

    hideLayer: function(type, key) {
      var lg = (_this.mapLayerGroups[type] || {})[key];
      if (lg) {
        _this.map.removeLayer(lg);
      }
    },

    logistic: function(x) {
      return 1 / (1 + Math.pow(Math.E, 0-x));
    },

    hsvToRgb: function(h, s, v){
      var r, g, b;

      var i = Math.floor(h * 6);
      var f = h * 6 - i;
      var p = v * (1 - s);
      var q = v * (1 - f * s);
      var t = v * (1 - (1 - f) * s);

      switch(i % 6){
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
      }

      return [r * 255, g * 255, b * 255];
    },
  };
  return _this;
}());
