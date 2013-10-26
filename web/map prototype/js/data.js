Data = (function() {
  var  host = "http://api.london-fire.labs.theodi.org"
  var _this = {

    histogramUrl:           host + "/getBoroughHist",
    boroughResponseTimeUrl: host + "/getBoroughResponseTime",
    boroughScoreUrl:        host + "/getBoroughScore",
    allBoroughsScoresUrl:   host + "/getAllBoroughsScores",

    boroughDataUrlString:
      'data/boroughBoundaries/{borough}.json',

    boroughs: [ "Barking and Dagenham", "Barnet", "Bexley", "Brent",
      "Bromley", "Camden", "City of London", "Croydon", "Ealing", "Enfield",
      "Greenwich", "Hackney", "Hammersmith and Fulham", "Haringey", "Harrow",
      "Havering", "Hillingdon", "Hounslow", "Islington",
      "Kensington and Chelsea", "Kingston upon Thames", "Lambeth", "Lewisham",
      "Merton", "Newham", "Redbridge", "Richmond upon Thames", "Southwark",
      "Sutton", "Tower Hamlets", "Waltham Forest", "Wandsworth",
      "Westminster" ],

     stations_facing_closure: [ "Belsize", "Bow", "Clerkenwell",
      "Downham", "Kingsland", "Knightsbridge", "Silvertown", "Southwark",
      "Westminster", "Woolwich" ],

     boroughsByFirstRespondersPromise: null,

     boroughDataUrl: function(name) {
       return _this.boroughDataUrlString.replace("{borough}", name)
     },

     forceColumnsToFloat: function (columnNames, a) {
       _.each(a, function (record) {
         _.each(columnNames, function (columnName) {
           record[columnName] = parseFloat(record[columnName]);
         });
       });
     },

     loadStations: function(callback) {
       d3.csv("data/stations.csv", function (stationsData) {
         _this.forceColumnsToFloat([ 'latitude', 'longitude' ], stationsData);
         callback(stationsData);
       });
     },


     impactedBoroughs: function(closedStations, callback) {
       if(!_this.boroughsByFirstRespondersPromise) {
         _this.boroughsByFirstRespondersPromise = $.get("data/boroughs_by_first_responders.json")
       }

       _this.boroughsByFirstRespondersPromise.success(function(data) {
         callback(_.uniq(_.flatten(_.map(closedStations, function(station) {
           return ds =  data[station];
         }))));
       });
     },

    getBoroughData: function(borough, callback) {
      $.getJSON(_this.boroughDataUrl(borough), callback)
    },

     getBoroughHist: function(borough, closedStations, callback) {
       _this.getJSONP(_this.histogramUrl, {
         'borough': borough,
         'close': closedStations,
       }, callback);
     },

    getBoroughMetric: function(metric, borough, closedStations, callback) {
      if(metric == "responseTime") {
        _this.getBoroughResponseTime(borough, closedStations, callback);
      } else if (metric == "score") {
        _this.getBoroughScore(borough, closedStations, callback);
      }
    },

    getBoroughScore: function(borough, closedStations, callback) {
      _this.getJSONP(_this.boroughScoreUrl, {
        'borough': borough,
        'close': closedStations,
      }, callback);
    },

    getBoroughResponseTime: function(borough, closedStations, callback) {
      _this.getJSONP(_this.boroughResponseTimeUrl, {
        'borough': borough,
        'close': closedStations,
      }, callback);
    },

    getAllBoroughsScores: function(closedStations, callback) {
      _this.getJSONP(_this.allBoroughsScoresUrl, {
        'close': closedStations,
      }, callback)
    },

    getJSONP: function(url, data, callback) {
      $.getJSON(url+"?callback=?", data, function(response) {
        callback(response.response);
      });
    },

  }
  return _this;
})();
