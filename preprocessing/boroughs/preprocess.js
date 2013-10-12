var fs = require('fs'),
    _ = require('underscore'),
    argv = require('optimist') // https://github.com/substack/node-optimist
      .usage('Usage: $0 --in [filename] --out [folder]')
        .demand([ 'in', 'out' ])
        .alias('in', 'i')
        .alias('out', 'o')
        .argv, 
    parseString = require('xml2js').parseString;

var result = fs.readFileSync(argv.in);
parseString(result, function (err, result) {
    var id = 0;
    _.each(result.kml.Document[0].Placemark, function (d) {
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
                // TODO: Davetaz wrote the borough's default response time here
                // but I am not sure it is the right thing to do
                "response": 0,
            },
            geometry: {
                type: "Polygon",
                coordinates: [ polygon ],
            }
        });
        fs.writeFileSync(argv.out + "/" + d.name + ".json", JSON.stringify(borough));

    });
});
