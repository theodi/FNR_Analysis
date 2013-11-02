var fs = require('fs'),
    _ = require('underscore'),
    csv = require('csv'), // http://www.adaltas.com/projects/node-csv/
    argv = require('optimist') // https://github.com/substack/node-optimist
        .usage('Usage: $0 --kml filename --incidents incidentsCsvFile --out folderWithBoroughsDefinitions')
        .demand([ 'out' ])
        .default('kml', '../data/raw/London boroughs KML definition.kml')
        .default('incidents', '../data/preprocessed/incidents.csv')
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

var getBoroughScore = function (responseTimesSeries, footfallSeries) {
    var A = 0.75,
        medianResponseTimes = median(_.map(responseTimesSeries, function (x) { return x / 60; })),
        medianFootfall = median(footfallSeries);
    return Math.pow(medianResponseTimes, A) * 
        Math.pow(Math.log(medianFootfall + 2) / Math.log(10), 1 - A);
};

var result = fs.readFileSync(argv.kml);
parseString(result, function (err, result) {
    var performance = { },
        footfall = { };
    csv()
        .from.stream(fs.createReadStream(__dirname + '/' + argv.incidents), {
            columns: true
        })
        .on('record', function (row, index) {
            performance[row.borough] = performance[row.borough] || [ ];
            performance[row.borough].push(parseFloat(row.firstPumpTime));
            footfall[row.borough] = footfall[row.borough] || [ ];
            footfall[row.borough].push(parseFloat(row.footfall));
        })
        .on('error', function (error) {
          console.log(error.message);
        })
        .on('end', function (count) {
            var id = 0;
            _.each(result.kml.Document[0].Placemark, function (d) {
                boroughResponseTime = Math.round(mean(performance[d.name[0]]));
                boroughScore = parseFloat(getBoroughScore(performance[d.name[0]], footfall[d.name[0]]));
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
                        "response": boroughResponseTime,
                        "score": boroughScore
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
