Map = (function() {
  _this = {

    initCenter: [51.511, -0.120],
    initZoom:   10,

    gradeColors:
      ['#125a8d', '#dc4710'],
	  gradeMinValues: [0, 360],


    boroughOutlineWeight:     0,
    boroughOutlineColor:      'grey',
    boroughOutlineOpacity:    0.0,
    boroughOutlineDashArray:  '',
    boroughFillOpacity:       0.7,

    hoverBoroughOutlineWeight:    3,
    hoverBoroughOutlineColor:     '#666',
    hoverBoroughOutlineOpacity:   0.0,
    hoverBoroughOutlineDashArray: '',
    hoverBoroughFillOpacity:      0.7,

    incidentOutlineWeight:      0,
    incidentOutlineColor:       'grey',
    incidentOutlineOpacity:     0.0,
    incidentOutlineDashArray:   '',
    incidentFillOpacity:        0.7,


    cloudMadeKey: 'BC9A493B41014CAABB98F0471D759707',
    mapStyleId:   22677,

    cloudMadeUrlString:
      'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
    mapAttribution:
      'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',

    boroughDataUrlString:
      'data/boroughBoundaries/{borough}.json',

    initialize: function(container) {
      _this.container = container;
      _this.mapLayerGroups = {};
      _this.activeIncidentLayers = [];
      _this.boroughsGeoJson = null;
      _this.closedStations = [];

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
      var legend = L.control({position: 'bottomright'});

      legend.onAdd = function (map) {
	      var div = L.DomUtil.create('div', 'info legend');

        var gradeMaxValues = _.rest(_this.gradeMinValues);
        var gradeBounds = _.zip(_this.gradeMinValues, gradeMaxValues);
        var grades = _.map(gradeBounds, function(grade) {
          return {
            from: grade[0],
            to: grade[1],
            color: _this.getColor(grade[0])
          }
        });

        div.innerHTML = _this.template("legend", {"grades": grades});
        return div;
      }

      legend.addTo(_this.map);
    },

    initBoroughBoundaries: function() {
      log("Loading and displaying London boroughs' boundaries.");
      _.each(BOROUGHS_NAMES, function (borough) {
        _this.initBoroughBoundary(borough);
      });
    },

    initStations: function() {
      console.log("TODO tim", "add the stations to the new map");
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
      log("Updating the selected borough box.");
      var boroughs = _.map(_this.activeIncidentLayers, function(borough) {
        return {
          name:       borough,
          id: "sel_" + borough.toLowerCase().replace("", "_")
        }
      });
      var inputs = _this.template("boroughs-selected", {"boroughs": boroughs})
      $('#boroughs div').html(inputs);
      $("#boroughs input").click(_this.handleBoroughCheckboxClick)
    },

    handleBoroughCheckboxClick: function(event) {
      var checkbox = $(this);
      var borough = checkbox.attr("data-borough-name");
      _this.toggleIncidentLayer(borough);
    },

    getColor: function(score) {
      return _.last(_.filter(_.zip(_this.gradeMinValues, _this.gradeColors), function(pair) {
        return pair[0] <= score;
      }))[1];
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
      if(_.contains(_this.activeIncidentLayers, borough))  {
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

    boroughMapLayerGroup: function(borough) {
      var state = _this.closedStationsKey()
      var lg = _this.mapLayerGroups["boroughs"][borough][state];
      if (!lg) {
        lg = new L.layerGroup();
        _this.mapLayerGroups["boroughs"][borough][state] = lg;
      }
      return lg;
    },

    showLayer: function(type, key, callback) {
      var state = _this.closedStationsKey();
      if(!_this.mapLayerGroups[type]) _this.mapLayerGroups[type] = {};
      if(!_this.mapLayerGroups[type][key]) _this.mapLayerGroups[type][key] = {};
      var lg = _this.mapLayerGroups[type][key][state];
      if (lg) {
        _this.map.addLayer(lg);
      } else {
        _this.mapLayerGroups[type][key][state] = lg = new L.layerGroup();
        if(callback) callback(lg, function() { _this.map.addLayer(lg); });
      }
    },

    hideLayer: function(type, key) {
      var state = _this.closedStationsKey();
      var lg = ((_this.mapLayerGroups[type] || {})[key] || {})[state];
      if (lg) {
        _this.map.removeLayer(lg);
      }
    },

    closedStationsKey: function() {
      return _this.closedStations.join(",");
    }
  };
  return _this;
}());
