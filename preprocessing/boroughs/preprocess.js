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

var mean = function (a) {
    a = [ ].concat(a);
    return _.reduce(a, function (memo, num) { return memo + num; }, 0.0) / a.length;
}

var result = fs.readFileSync(argv.kml);
parseString(result, function (err, result) {
    var id = 0;
    _.each(result.kml.Document[0].Placemark, function (d) {
        var performance = [ ];
        csv()
            .from.stream(fs.createReadStream(__dirname + '/' + argv.incidents + '/' + d.name[0] + '.csv'), {
                columns: true
            })
            .on('record', function (row, index) {
                performance.push(parseFloat(row.firstPumpTime));
            })
            .on('error', function (error) {
              console.log(error.message);
            })
            .on('end', function (count) {
                performance = mean(performance);
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
                    },
                    geometry: {
                        type: "Polygon",
                        coordinates: [ polygon ],
                    }
                });
                fs.writeFileSync(argv.out + "/" + d.name + ".json", JSON.stringify(borough));
            });
    });
});
