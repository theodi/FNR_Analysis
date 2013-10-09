/* ************************************************************************** */
/* All the parameters you need for the clean-up and transformation are here   */
/* ************************************************************************** */

// There is a quota for the Google geolocation APIs we use for this script
var GOOGLE_THROTTLE_SECONDS = 3;

/* ************************************************************************** */
/* ************************************************************************** */
/* ************************************************************************** */

var _ = require('underscore');
_.mixin(require('underscore.string').exports());
var argv = require('optimist') // https://github.com/substack/node-optimist
    .usage('Usage: $0 -in [filename] -out [filename]')
    .demand([ 'out' ])
    .alias('out', 'o')
    .argv; 
var async = require('async');
var cheerio = require('cheerio');
var csv = require('csv'); // http://www.adaltas.com/projects/node-csv/
var geocoder = require('geocoder'); // https://github.com/wyattdanger/geocoder
var request = require('request');

// with help from http://okfnlabs.org/blog/2013/01/15/web-scraping-with-node-css-selectors.html
request("http://www.london-fire.gov.uk/a-zfirestations.asp", 
	function (err, resp, body) {

      function save (err) {
        csv()
        .from.array(
            [ _.keys(stations[_.keys(stations)[0]]) ] 
                .concat(_.values(stations)), 
            { columns: true })
        .to.path(__dirname + '/' + argv.out, {
            header: true,
        })
        .on('end', function (count) {
          console.log('Station list produced, ' + count + 
            ' stations found.');
        })
        .on('error', function (error) {
          console.log(error.message);
        });
      }

      console.log("The script execution may take some time, as the Google geolocation APIs are constrained by a quota and");
      console.log("we throttle our calls to them. Be patient.");
		  // I parse the webpage with the list of fire stations
  		$ = cheerio.load(body);
  		var stationNames = _.map($("dl dd h2"), function (x) {
  			return _.clean($(x).html());
  		});
		var boroughs = _.map($("dl dd p a"), function (x) {
			return _.clean($(x).html());
		});
  		var stationAddresses = _.map($("dl dd p"), function (x) {
  			return _.filter(_.map($(x).html().split("<br>"), _.clean),
  							function (y) {
								return !y.match(/^Borough/);
							})
              .concat([ "London", "Greater London" ])
  						.join(", ");
  		});
  		var stations = [ ];
  		async.eachSeries(_.range(0, stationNames.length), 
                       _.throttle(function (i, eachCallback) { 
                           console.log("Geolocating " + (i + 1) + " of " + stationNames.length + "...");
                           geocoder.geocode(stationAddresses[i], function (err, data) {        
                             stations.push({ 
                                 name: stationNames[i], 
                                 address: data.results[0].formatted_address,
				 borough: boroughs[i], 
                                 latitude: data.results[0].geometry.location.lat,
                                 longitude: data.results[0].geometry.location.lng,
                             });
                             eachCallback(null);
                          });
                       }, GOOGLE_THROTTLE_SECONDS * 1000), save);
  	});
