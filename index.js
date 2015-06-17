#! /usr/bin/env node

var gmapsCsv = function() {

    'use strict';

    var chalk = require('chalk');
    var csv = require('csv');
    var fs = require('fs');
    var request = require('request');
    var Promise = require("bluebird");
    var result = [];
    var i = 0;



    Promise.promisifyAll(request);



    var parseCsv = function(file, callback) {

        var content = fs.readFileSync(file).toString();

        csv.parse(content, [], callback);

    };

    var getAddress = function(key, address) {

        console.info(chalk.blue('Requesting details for ::' + address));


        var url = 'https://maps.googleapis.com/maps/api/geocode/json?address=' + address + '&key=' + key;

        return request.getAsync(url).then(function(response) {

            if (response[0].statusCode == 200) {

                var content = JSON.parse(response[1]);

                if (content.error_message) {
                    console.error(chalk.red('Error making request to geocode API:: ' + content.error_message));
                    return;
                }

                if (address[0] === '' && address[1] === '' || !content.results[0]) {
                    console.warn(chalk.yellow('You are missing a name or address in this entry or both || Results did not come back'));
                    console.warn(chalk.yellow(address, url));
                    return ['Not Found', address[1], '', '', '', url];
                }

                var lng = content.results[0].geometry.location.lng || 'not found';
                var lat = content.results[0].geometry.location.lat || 'not found';
                var link = ('https://www.google.co.uk/maps?z=18&q=' + content.results[0].geometry.location.lat + ',' + content.results[0].geometry.location.lng) || 'not found';
                var name = address[0];
                var formatted = content.results[0].formatted_address;

                return [name, address[1], formatted, lat, lng, link];
            }

        }).catch(function(error) {
            if (error) {
                console.error(chalk.red('Error making request to geocode API:: ' + error));
                return;
            }
        });
    };


    var addAdresses = function(key, data, callback) {

        result[0] = ['name', 'address', 'formatted_address', 'latitude', 'longitude', 'link'];

        function indiv() {
        	if (data[i]) {

                Promise.resolve(getAddress(key, data[i])).then(function(content) {
                    result.push(content);
                }).then(function() {
                    i += 1;
                    setTimeout(indiv, 250);
                });

            } else {
                callback();
            }
        }

        indiv();        

    };

    var init = function() {

        var userArgs = process.argv.slice(2);

        if (!userArgs[0] || !userArgs[1]) {
            console.error(chalk.red('You need to provide both an api key and a file in that order.'));
        }

        var apiKey = userArgs[0];
        var file = userArgs[1];

        var data = parseCsv(file, function(err, response) {

            if (err) {
                console.error(chalk.red('Error parsing CSV:: ' + err));
            }

            addAdresses(apiKey, response, function() {

                csv.stringify(result, function(err, output) {
                    if (err) {
                        console.log(chalk.red('Error generating file:: ' + err));
                        return;
                    }

                    fs.writeFileSync('Output-csv-' + new Date() + '.csv', output);
                });
            });

        });



    }();

    return;


}();

module.exports = gmapsCsv;