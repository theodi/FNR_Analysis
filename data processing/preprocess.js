/* ************************************************************************** */
/* All the parameters you need for the clean-up and transformation are here   */
/* ************************************************************************** */

// The script does not perform any date filtering. 

var INVALID_COLUMNS_WITH_NULL_OR_EMPTY_VALUES = [ 
  'FirstPumpArriving_DeployedFromStation', 'Easting_rounded', 
  'Northing_rounded',
];

var INVALID_COLUMNS_WITH_NON_NUMERIC_VALUES = [ 
  'FirstPumpArriving_AttendanceTime', 
];

var EXCLUDED_VALUES = [
    // Example:
    // { columnName: 'IncidentGroup', 
    //   values: [ 'Special Service', 'False Alarm' ] }, 
];

var COLUMNS_FOR_DESTINATION_FILE = [ 
  'DateOfCall', 'IncidentGroup', 'latitude', 'longitude', 
  'IncidentStationGround', 'FirstPumpArriving_AttendanceTime', 
  'FirstPumpArriving_DeployedFromStation', 'SecondPumpArriving_AttendanceTime', 
  'SecondPumpArriving_DeployedFromStation', 
];

var DATE_TRANSFORMATION_FUNCTION = function (row) {
  var tempDate = new Date(row.DateOfCall);
  tempDate.setHours(row.TimeOfCall.substring(0, 2));
  tempDate.setMinutes(row.TimeOfCall.substring(3, 5))
  tempDate.setSeconds(row.TimeOfCall.substring(6, 8));
  return tempDate.toJSON();
}

/* ************************************************************************** */
/* ************************************************************************** */
/* ************************************************************************** */

var _ = require('underscore')
var argv = require('optimist') // https://github.com/substack/node-optimist
    .usage('Usage: $0 -in [filename] -out [filename]')
    .demand(['in', 'out'])
    .alias('in', 'i')
    .alias('out', 'o')
    .argv; 
var geo = require('UkGeoTool'); // https://github.com/dbamber/UkGeoTool
var csv = require('csv'); // http://www.adaltas.com/projects/node-csv/
var fs = require('fs');

var newCount = 0;
csv()
    .from.stream(fs.createReadStream(__dirname + '/' + argv.in), {
        columns: true,
    })
    .to.path(__dirname + '/' + argv.out, {
        header: true,
        columns: COLUMNS_FOR_DESTINATION_FILE,
    })
    .transform(function (row, index) {
        // remove rows that have NULL as value in any of the specified columns
        if(_.some(INVALID_COLUMNS_WITH_NULL_OR_EMPTY_VALUES,
                  function (x) { 
                    return (row[x] == 'NULL') || (row[x] == ''); 
                  })) {
          row = "";
        // remove rows that have a non numeric value in any of the specified 
        // columns
        } else if(_.some(INVALID_COLUMNS_WITH_NON_NUMERIC_VALUES,
                  function (x) {
                    return _.isNumber(row[x]);
                  })) {
          row = "";
        } else if(_.some(EXCLUDED_VALUES, function (excludedValue) {
                    return _.contains(excludedValue.values, 
                                      row[excludedValue.columnName]);
                  })) {
          row = "";
        } else {
            newCount++;
            // TODO: is this the ideal data format D3 will require?
            row.DateOfCall = DATE_TRANSFORMATION_FUNCTION(row);
            var coordinates = geo.eastNorthToLatLong(row.Northing_rounded,
                row.Easting_rounded);
            row.latitude = coordinates.lat;
            row.longitude = coordinates.long;        
            return row;
        }
    })
    .on('end', function (count) {
      console.log('Number of processed input/output lines: ' + count + '/' + 
        newCount);
    })
    .on('error', function (error) {
      console.log(error.message);
    });
