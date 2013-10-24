var fs = require('fs'),
    _ = require('underscore'),
    csv = require('csv'), // http://www.adaltas.com/projects/node-csv/
    argv = require('optimist') // https://github.com/substack/node-optimist
      .usage('Usage: $0 --kml [filename] --incidents [incidents .csv folder] --out [folder]')
        .demand([ 'kml', 'incidents', 'out' ])
        .alias('in', 'i')
        .alias('out', 'o')
        .argv, 
    parseString = require('xml2js').parseString;

var mean = function (values) {
    return _.reduce(values, function (memo, num) { return memo + num; }, 0.0) / values.length;
}


var median = function (values) {
    // Thanks to http://caseyjustus.com/finding-the-median-of-an-array-with-javascript
    values.sort(function(a,b) {return a - b;});
    var half = Math.floor(values.length / 2);
    return (values.length % 2 == 0) ? values[half] : (values[half - 1] + values[half]) / 2.0;
}

// TODO
// This is a simplified version of getBoroughScoreM of 'data.js', this function
// should be manually kept in line with the other, until a better solution is
// implemented.
var getBoroughScore = function (responseTimesSeries, footfallSeries) {
    var A = 0.75,
        medianResponseTimes = median(_.map(responseTimesSeries, function (x) { return x / 60; })),
        medianFootfall = median(footfallSeries);
    return Math.pow(medianResponseTimes, A) * 
        Math.pow(Math.log(medianFootfall) / Math.log(10), 1 - A);
};

var result = fs.readFileSync(argv.kml);
parseString(result, function (err, result) {
    var id = 0;
    _.each(result.kml.Document[0].Placemark, function (d) {
        var performance = [ ];
        var footfall = [ ];
        csv()
            .from.stream(fs.createReadStream(__dirname + '/' + argv.incidents + '/' + d.name[0] + '.csv'), {
                columns: true
            })
            .on('record', function (row, index) {
                performance.push(parseFloat(row.firstPumpTime));
                footfall.push(parseFloat(row.footfall));
            })
            .on('error', function (error) {
              console.log(error.message);
            })
            .on('end', function (count) {
                score = parseFloat(getBoroughScore(performance, footfall));
                performance = Math.round(mean(performance));
                var polygon = _.map(d.Polygon[0].outerBoundaryIs[0].LinearRing[0].coordinates[0].split(" "), function (point) {
                    return [ parseFloat(point.split(",")[0]), parseFloat(point.split(",")[1]) ];
                });
                var borough = { type: "FeatureCollection" };
                borough.features = [ ];
                borough.features.push({
                    type: "Feature",
                    id: ++id,
                    properties: {
                        "borough": d.name[0],
                        "response": performance,
                        "score": score
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [ polygon ]
                    }
                });
                fs.writeFileSync(argv.out + "/" + d.name + ".json", JSON.stringify(borough));
            });
    });
});
