Util = (function () {
  var _this = {
    mean: function (values) {
      return _.reduce(values, function (memo, num) {
        return memo + num;
      }, 0.0) / values.length;
    },

    template: function(name, data) {
     var template_string = $("#template-"+name).html();
     return _.template(template_string, data);
    },

    minutesAndSeconds: function(secs) {
      var minutes = Math.floor(secs / 60);
      var seconds = Math.floor(secs % 60);
      return [minutes, seconds]
    },

    gaussian: function(mu, sigma) {
      var sigma2 = Math.pow(sigma, 2);
      return function(x) {
       return 1/Math.sqrt(2 * Math.PI * sigma2) * Math.exp(0- (Math.pow(x - mu, 2)/(2 * sigma2)));
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
})();
