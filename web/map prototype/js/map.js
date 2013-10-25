Map = (function() {
  _this = {

    initCenter: [51.485, -0.120],
    initZoom:   10,


    overlayHueMin: 0.0,
    overlayHueMax: 0.15,
    overlaySatMin: 1,
    overlaySatMax: 1,
    overlayValMin: 1.0,
    overlayValMax: 0.8,

    responseTimeLowerScale: 330,
    responseTimeUpperScale: 290,

    scoreLowerScale: 4.05,
    scoreUpperScale: 3.80,

    gradeMinValues: [0, 180, 360, 540],

    boroughOutlineWeight:     1,
    boroughOutlineColor:      '#2D0D01',
    boroughOutlineOpacity:    0.9,
    boroughOutlineDashArray:  '',
    boroughFillOpacity:       0.9,

    hoverBoroughOutlineWeight:    2,
    hoverBoroughOutlineColor:     '#2D0D01',
    hoverBoroughOutlineOpacity:   0.9,
    hoverBoroughOutlineDashArray: '',
    hoverBoroughFillOpacity:      0.9,

    selectedBoroughOutlineWeight:    2,
    selectedBoroughOutlineColor:     '#2D0D01',
    selectedBoroughOutlineOpacity:   0.9,
    selectedBoroughOutlineDashArray: '',
    selectedBoroughFillOpacity:      0.9,

    cloudMadeKey: 'BC9A493B41014CAABB98F0471D759707',
    mapStyleId:   22677, //111403,

    cloudMadeUrlString:
      'http://{s}.tile.cloudmade.com/{key}/{styleId}/256/{z}/{x}/{y}.png',
    mapAttribution:
      'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
    infoDefault:
      'Hover or click an area',

    stationIconClosing: L.icon({
      iconUrl: 'img/icon_firetruck_closing.png',
      iconSize: [20, 20]
    }),

    stationIcon: L.icon({
      iconUrl: 'img/icon_firetruck_ok.png',
      iconSize: [20, 20]
    }),

    initialize: function(container) {
      _this.blockingProcessesCount = 0;
      _this.container = container;
      _this.mapLayerGroups = {};
      _this.activeIncidentLayers = [];
      _this.boroughsGeoJson = null;
      _this.boroughScores = {};
      _this.closedStations = [];
      _this.stationMarkers = [];
      _this.currentMetric = "responseTime",
      _this.initMap();
      _this.initTileLayer();
      _this.initInfo();
      //_this.initLegend();
      _this.initBoroughBoundaries();
      _this.initStations();
      _this.initSwitches();
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

    initInfo: function() {
      var hoverinfo = document.createElement("div");
      hoverinfo.setAttribute("id","info");
      hoverinfo.innerHTML = _this.infoDefault,
      document.getElementById("map").appendChild(hoverinfo);
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

      $("#legend").html(Util.template("legend", {"grades": grades}));
    },

    initBoroughBoundaries: function() {
      _.each(Data.boroughs, function (borough) {
        _this.initBoroughBoundary(borough);
      });
    },

    initStations: function() {
      _this.showLayer("stations", "stations", function(lg, cont) {
        _this.blockUI();
        Data.loadStations(function(stationsData) {
          _this.unblockUI();
          _.each(stationsData, function (station) {
            var markerLocation = new L.LatLng(station.latitude, station.longitude);
            var marker = new L.Marker(markerLocation, {icon: _this.stationIcon, name: station.name});
            _this.stationMarkers[station.name] = marker
            marker.on('click', _this.toggleStation);
            lg.addLayer(marker);
            cont();
          });
        });
      })
    },

    initBoroughBoundary: function(borough) {
      _this.showBoroughLayer(borough, function(lg, cont) {
        _this.blockUI();
        Data.getBoroughData(borough, function(data) {
          _this.unblockUI();
          _this.boroughsGeoJson = L.geoJson(data, {
            style: _this.boroughStyle,
            onEachFeature: function (feature, layer) {
              _this.boroughScores[feature.properties.borough] = feature.properties.response
              _this.setScore();
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

    initSwitches: function() {
      $("#closures-switch").click(function(event)  {
        if(!$(this).is(":checked")){
          _this.openAllClosedStations();
        } else {
          _this.closeCandidateStations();
        }
      });
      $("#metric-switch").click(function(event)  {
        if(!$(this).is(":checked")){
          _this.setResponseTimeMetric();
        } else {
          _this.setScoreMetric();
        }
      });
    },

    setScoreMetric: function() {
      _this.currentMetric = "score";
      _this.refreshAllBoroughs();
    },

    setResponseTimeMetric: function() {
      _this.currentMetric = "responseTime";
      _this.refreshAllBoroughs();
    },

    setScore: function() {
      var score = Util.mean(_.values(_this.boroughScores));
      var mands = Util.minutesAndSeconds(score);
      $("#score .minutes").html(mands[0]);
      $("#score .seconds").html(mands[1]);
    },

    updateInfo: function(props) {
      var info;
      if(props) {
        var template_name = props.borough ? "info-borough" : "info-ward";
        info = Util.template(template_name, props);
      } else {
        info = _this.infoDefault;
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
      var borough = event.target.feature.properties.borough;
      if(borough != _this.selectedBorough) _this.boroughsGeoJson.resetStyle(event.target);
      event.target.setStyle({fillColor: _this.getColor(_this.boroughScores[borough]) });
      _this.updateInfo();
    },

    showBoroughDetail: function(event) {
      var target = event.target
      var props = target.feature.properties;
      var borough = props.borough;
      if(_this.selectedBoroughLayer) _this.boroughsGeoJson.resetStyle(_this.selectedBoroughLayer);
      _this.selectedBoroughLayer = target
      _this.selectedBorough = borough;
      _this.updateBoroughHistogram(borough);
      _this.updateBoroughSidebar(borough);
    },

    updateBoroughSidebar: function(borough) {
      var mands = Util.minutesAndSeconds(_this.boroughScores[borough]);
      var text = Util.template("borough-sidebar", {
        'borough': borough,
        'response': (mands[0] + " minutes, " + mands[1] + " seconds.")
      });
      $("#borough").html(text);
    },

    updateBoroughHistogram: function(borough) {
      _this.blockUI();
      Data.getBoroughHist(borough, _this.closedStations, function(bins)  {
        _this.unblockUI();
        if(!_this.histogram) {
          _this.initializeBoroughHistogram(bins);
        } else {
          _this.redrawBoroughHistogram(bins);
        }
      });
    },

    initializeBoroughHistogram: function(data) {
      var w = 14;
      var h = 120;

      var x = d3.scale.linear()
        .domain([0, 1])
        .range([0, w]);

      var x2 = d3.scale.linear()
        .domain([0, 20])
        .range([0, 280]);

      var xAxis = d3.svg.axis()
        .scale(x2)
        .tickSize(0);

      var maxY = _.max(_.map(data, function(d) { return d.incidents }));

      var y = d3.scale.linear()
        .domain([0, maxY])
        .rangeRound([0, 100]);

      var chart = d3.select("#histogram").append("svg")
        .attr("class", "chart")
        .attr("width", w * data.length - 1)
        .attr("height", h + 60)

      chart.selectAll("rect")
        .data(data)
        .enter().append("rect")
        .attr("x", function(d, i) { return x(i) - .5; })
        .attr("y", function(d) { return h - y(d.incidents) - .5; })
        .attr("fill", function(d) {
          return _this.getColor(d.timeMax);
        })
        .attr("width", w)
        .attr("height", function(d) { return y(d.incidents); })

      chart.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(6," + h + ")")
        .style("font-size", "70%")
        .attr("fill", "#eee")
        .call(xAxis);

      chart.append("line")
        .attr("x1", 0)
        .attr("x2", w * data.length)
        .attr("y1", h - .5)
        .attr("y2", h - .5)
        .attr("fill", "#eee")
        .style("stroke", "#eee");

      chart.append("line")
        .attr("x1", 84)
        .attr("x2", 84)
        .attr("y1", 0)
        .attr("y2", h)
        .style("stroke","#eee")

        chart.append("svg:text")
        .attr("x",90)
        .attr("y",h-110)
        .attr("fill", "#eee")
        .style("font-size", "80%")
        .text(function(d) {
          return "Target - 6 Min"
        });

      chart.append("svg:text")
        .attr("x",w*20-62)
        .attr("y",h+25)
        .attr("fill", "#eee")
        .style("font-size", "80%")
        .text(function(d) {
          return "Minutes"
        });

      _this.histogram = chart;
      _this.histogramScale = y;
      _this.histogramHeight = h;
    },

    redrawBoroughHistogram: function(data)  {
      var maxY = _.max(_.map(data, function(d) { return d.incidents }));
      _this.histogramScale.domain([0, maxY]);
      _this.histogram.selectAll("rect")
        .data(data)
        .transition()
        .duration(1000)
        .attr("y", function(d) { return _this.histogramHeight - _this.histogramScale(d.incidents) - .5; })
        .attr("height", function(d) { return _this.histogramScale(d.incidents); });
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


    closeCandidateStations: function() {
      _this.closeStations(Data.stations_facing_closure);
    },

    closeStation: function(name) {
      _this.closeStations([name]);
    },

    closeStations: function(names) {
      _this.closedStations = _.uniq(_.union(_this.closedStations, names));
      _.each(names, function(name) {
        _this.stationMarkers[name].setIcon(_this.stationIconClosing);
      });
      _this.updateImpactedBoroughs(names);
    },

    openAllClosedStations: function() {
      _this.openStations(_this.closedStations);
    },

    openStation: function(name) {
      _this.openStations([name]);
    },

    openStations: function(names) {
      _this.closedStations = _.difference(_this.closedStations, names);
      _.each(names, function(name) {
        _this.stationMarkers[name].setIcon(_this.stationIcon);
      });
      _this.updateImpactedBoroughs(names);
    },

    updateImpactedBoroughs: function(closedStations) {
      _this.blockUI();
      Data.impactedBoroughs(closedStations, function(boroughs) {
        _this.unblockUI();
        _.each(boroughs, function (borough) {
          _this.updateBoroughDisplay(borough);
        });
      })
    },

    refreshAllBoroughs: function() {
      _.each(Data.boroughs, function (borough) {
        _this.updateBoroughDisplay(borough);
      });
    },
    updateBoroughDisplay: function(borough) {
      _this.blockUI();
      Data.getBoroughMetric(_this.currentMetric, borough, _this.closedStations, function(resp) {
        _this.unblockUI();
        _this.boroughScores[borough] = resp;
        var layerGroup = _this.mapLayerGroups["boroughs"][borough]
        _.each(layerGroup.getLayers(), function(layer) {
          layer.setStyle({"fillColor": _this.getColor(resp) });
        });

        if(_this.selectedBorough == borough) {
          _this.updateBoroughSidebar(borough);
          _this.updateBoroughHistogram(borough);
        }
        _this.setScore();
      });
    },

    updateBoroughsSelected: function() {
      var boroughs = _.map(_this.activeIncidentLayers, function(borough) {
        return {
          name:       borough,
          id: "sel_" + borough.toLowerCase().replace("", "_")
        }
      });
      var inputs = Util.template("boroughs-selected", {"boroughs": boroughs});
      $('#boroughs div').html(inputs);
      $("#boroughs input").click(_this.handleBoroughCheckboxClick)
    },

    handleBoroughCheckboxClick: function(event) {
      var checkbox = $(this);
      var borough = checkbox.attr("data-borough-name");
      _this.toggleIncidentLayer(borough);
    },

    getColor: function(score) {
      var p = Util.logistic((score - _this.currentMetricLowerScale()) / (_this.currentMetricUpperScale() - _this.currentMetricLowerScale()));

      var h = _this.overlayHueMin + p * (_this.overlayHueMax - _this.overlayHueMin);
      var s = _this.overlaySatMin + p * (_this.overlaySatMax - _this.overlaySatMin);
      var v = _this.overlayValMin + p * (_this.overlayValMax - _this.overlayValMin);
      var rgb = Util.hsvToRgb(h, s, v);
      var str = "#" + _.map(rgb, function(n) {
        hex = Math.floor(n).toString(16);
        return Math.floor(n) < 16 ? "0" + hex : hex;
      }).join("")
      return str;
    },

    currentMetricLowerScale: function() {
     if(_this.currentMetric == "responseTime")  {
      return _this.responseTimeLowerScale;
     } else if(_this.currentMetric == "score")  {
      return _this.scoreLowerScale;
     }
    },

    currentMetricUpperScale: function() {
     if(_this.currentMetric == "responseTime")  {
      return _this.responseTimeUpperScale;
     } else if(_this.currentMetric == "score")  {
      return _this.scoreUpperScale;
     }
    },

    showBoroughLayer: function(borough, callback) {
      _this.showLayer("boroughs", borough, callback);
    },

    hideBoroughLayer: function(borough) {
      _this.hideLayer("boroughs", borough);
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

    blockUI: function() {
      if(_this.blockingProcessesCount == 0) $.blockUI({message : "<img src='img/loading.gif' alt='Loading' />", css: {backgroundColor: "transparent", border: "none"}});
      _this.blockingProcessesCount++;
    },

    unblockUI: function() {
      if(_this.blockingProcessesCount > 0) _this.blockingProcessesCount--;
      if(_this.blockingProcessesCount == 0) $.unblockUI();
    },

  };
  return _this;
}());
