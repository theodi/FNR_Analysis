Map = (function() {
  _this = {

    initCenter: [51.511, -0.120],
    initZoom:   10,

    gradeColors:
      ['#0FDB39', '#3BDD0C', '#96DF09', '#E1CC06', '#E36C03', '#E60800'],
	  gradeMinValues: [0, 120, 240, 360, 480],


    boroughOutlineWeight:     1,
    boroughOutlineColor:      'grey',
    boroughOutlineOpacity:    0.7,
    boroughOutlineDashArray:  '3',
    boroughFillOpacity:       0.7,

    hoverBoroughOutlineWeight:    5,
    hoverBoroughOutlineColor:     '#666',
    hoverBoroughOutlineDashArray: '',
    hoverBoroughFillOpacity:      0.7,

    cloudMadeKey: 'BC9A493B41014CAABB98F0471D759707',
    mapStyleId:   22677,

    cloudMadeUrlString:
      'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
    mapAttribution:
      'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',

    boroughDataUrlString:
      'data/boroughBoundaries/{borough}.json',

     callToAction: "Hover over an area",

    initialize: function(container) {
      _this.container = container;
      _this.mapLayerGroups = [];
      _this.boroughsGeoJson = null;
      _this.closedStations = [];

      _this.initMap();
      _this.initTileLayer();
      _this.initInfoBox();
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

    initInfoBox: function() {
      _this.info = L.control();
      _this.info.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'info');
        this.update();
        return this._div;
      };
      _this.info.update = _this.updateInfoBox;
      _this.info.addTo(_this.map)
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

    },


    initBoroughBoundary: function(borough) {
      $.getJSON(_this.boroughDataUrl(borough), function(data) {
        _this.boroughsGeoJson = L.geoJson(data, {
          style: _this.boroughStyle,
          onEachFeature: function (feature, layer) {
            var borough_name = feature.properties.borough
            var lg = _this.boroughMapLayerGroup(borough_name)
            lg.addLayer(layer);
            layer.on({
              mouseover: _this.highlightFeature,
              mouseout:  _this.resetHighlight,
              click:     _this.showBoroughDetail
            });
          }
        });

        _this.showBoroughLayer(borough);
      });
    },

    updateInfoBox: function(props) {
      if (props) {
        var template_name = props.borough ? "info-borough" : "info-ward"
        this._div.innerHTML = _this.template(template_name, props);
      } else {
        this._div.innerHTML = _this.callToAction;
      }
    },



    highlightFeature: function(event) {
      var layer = event.target;
      layer.setStyle({
        weight: _this.hoverBoroughOutlineWeight,
        color: _this.hoverBoroughOutlineColor,
        dashArray: _this.hoverBoroughDashArray,
        fillOpacity: _this.hoverBoroughFillOpacity
      });

      if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
      }
      _this.info.update(layer.feature.properties);
    },

    resetHighlight: function(event) {
	    _this.boroughsGeoJson.resetStyle(event.target);
	    _this.info.update();
    },

    showBoroughDetail: function(event) {
      var target = event.target
      var props = target.feature.properties;
      var borough = props.borough;
      _this.hideBoroughLayer(borough);
      _this.showBoroughIncidentData(borough);
      //updateBoroughsSelected();
      _this.map.fitBounds(target.getBounds());
    },

    showBoroughIncidentData: function(borough) {
      var borough_and_closures = _this.boroughWithClosuresKey(borough);;

      if (_this.closedStations.length > 0) {
        if(_this.mapLayerGroups[_this.boroughLayerGroupKey(borough_and_closures)]) {
          _this.hideBoroughLayer(borough);
        }
      }

      if (!_.contains(incidentLayers, borough_and_closures)) {
        incidentLayers.push(borough_and_closures);
      }

      if(!mapLayerGroups[_this.incidentLayerGroupKey(borough_and_closures)]) {
        var data = getBoroughDetailedResponse(borough, _this.closedStations, function (_, data) {
          boroughsGeoJson = L.geoJson(data, {
            style: style,
            onEachFeature: function (feature, layer) {
              var lg = mapLayerGroups["I:" + feature.properties.ward];
              if (!lg) {
                log("Creating the layer I:" + feature.properties.ward + " for the first time");
                lg = new L.layerGroup();
                mapLayerGroups["I:" + feature.properties.ward] = lg;
              }
              lg.addLayer(layer);
              layer.on({
                mouseover: highlightFeature,
                mouseout: resetHighlight,
                click: zoomToFeature
              });
            }
          });
          showLayer("I:"+borough_and_closures);
        });
      }
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

    showBoroughLayer: function(borough) {
      _this.showLayer(_this.boroughLayerGroupKey(borough));
    },

    hideBoroughLayer: function(borough) {
      _this.hideLayer(_this.boroughLayerGroupKey(borough));
    },

    showIncidentLayer: function(borough) {
      _this.showLayer(_this.incidentLayerGroupKey(borough));
    },

    hideIncidentLayer: function(borough) {
      _this.hideLayer(_this.incidentLayerGroupKey(borough));
    },

    boroughStyle: function(feature) {
      var response = feature.properties.response;
      return {
        weight: _this.boroughOutlineWeight,
        color: _this.boroughOutlineColor,
        dashArray: _this.hoverBoroughDashArray,
        fillOpacity: _this.boroughFillOpacity,
        fillColor: _this.getColor(response),
        opacity:_this.boroughOutlineOpacity,
      };
    },

    boroughDataUrl: function(name) {
      return _this.boroughDataUrlString.replace("{borough}", name)
    },

    boroughMapLayerGroup: function(borough) {
      var key = _this.boroughLayerGroupKey(borough);
      var lg = _this.mapLayerGroups[key];
      if (!lg) {
        lg = new L.layerGroup();
        _this.mapLayerGroups[key] = lg;
      }
      return lg;
    },

    boroughLayerGroupKey: function(borough) {
      return "B:" + _this.boroughWithClosuresKey(borough);
    },

    boroughWithClosuresKey: function(borough) {
      if(_this.closedStations.length > 0) {
        return borough + "-minus-" + _this.closedStations.join("_");
      } else {
        return borough;
      }
    },

    incidentLayerGroupKey: function(borough) {
      return "I:" + _this.boroughWithClosuresKey(borough);
    },

    showLayer: function(key) {
      if (_this.mapLayerGroups[key]) {
        var lg = _this.mapLayerGroups[key];
        _this.map.addLayer(lg);
      }
    },

    hideLayer: function(key) {
      if (_this.mapLayerGroups[key]) {
        var lg = _this.mapLayerGroups[key];
        _this.map.removeLayer(lg);
      }
    }
  };
  return _this;
}());
