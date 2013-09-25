var _ = require('underscore')
var argv = require('optimist') // https://github.com/substack/node-optimist
    .usage('Usage: $0 -in [filename] -out [filename]')
    .demand(['in', 'out'])
    .alias('in', 'i')
    .alias('out', 'o')
    .argv; 
var csv = require('csv'); // http://www.adaltas.com/projects/node-csv/
var fs = require('fs');


var stationGrounds = { };


function writeOutput () {
    // calculate the performance indeces
    _.each(stationGrounds, function (sg) {

        // own station
        sg.firstAppliancesOwnStation = 
            sg.attendanceTimesOwnStation.length;
        sg.percentageIn6MinutesOwnStation = _.countBy(
            sg.attendanceTimesOwnStation, 
            function (num) {
              return num <= 360 ? 'ok' : 'late';
            }
        ).ok / sg.firstAppliancesOwnStation;
        sg.percentageLateOwnStation = 1.0 - 
            sg.percentageIn6MinutesOwnStation;

        // other stations
        sg.firstAppliancesOtherStations = 
            sg.attendanceTimesOtherStations.length;
        sg.percentageIn6MinutesOtherStations = _.countBy(
            sg.attendanceTimesOtherStations, 
            function (num) {
              return num <= 360 ? 'ok' : 'late';
            }
        ).ok / sg.firstAppliancesOtherStations;
        sg.percentageLateOtherStations = 1.0 - 
            sg.percentageIn6MinutesOtherStations;

        // difference
        sg.differenceInLate = sg.percentageLateOtherStations -
            sg.percentageLateOwnStation;

        // clean up
        delete sg.attendanceTimesOwnStation;
        delete sg.attendanceTimesOtherStations;

    });
    // and write a new .csv as a report
    csv()
        .from.array(
            [ _.keys(stationGrounds[_.keys(stationGrounds)[0]]) ] 
                .concat(_.values(stationGrounds)), 
            { columns: true })
        .to.path(__dirname + '/' + argv.out, {
            header: true,
        })
        .on('end', function (count) {
          console.log('Report completed, ' + count + 
            ' station grounds analysed.');
        })
        .on('error', function (error) {
          console.log(error.message);
        });
}


csv()
    .from.stream(fs.createReadStream(__dirname + '/' + argv.in), {
        columns: true
    })
    .on('record', function (row, index) {
        // if this is a new station ground, initialise its data 
        stationGrounds[row.IncidentStationGround] = 
            stationGrounds[row.IncidentStationGround] || 
            { 
              stationGround: row.IncidentStationGround,
              attendanceTimesOwnStation: [ ],
              attendanceTimesOtherStations: [ ],
            };
        // ... then, add the new attendance time 
        stationGrounds[row.IncidentStationGround][
                row.IncidentStationGround == 
                    row.FirstPumpArriving_DeployedFromStation ?
                        'attendanceTimesOwnStation' : 
                        'attendanceTimesOtherStations'
            ].push(parseFloat(row.FirstPumpArriving_AttendanceTime));
    })
    .on('end', function (count) {
      writeOutput();
      console.log('Number of processed input lines: ' + count);
    })
    .on('error', function (error) {
      console.log(error.message);
    });
