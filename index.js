'use strict'
const debug = require("debug")("signalk:openweather-signalk")
const ow = require('./openweather')

module.exports = function (app) {
    var plugin = {};

    plugin.id = 'openweather-signalk';
    plugin.name = 'OpenWeather Forecast';
    plugin.description = 'Provide forecast data from OpenWeather Service';

    var unsubscribes = [];
    plugin.start = function (options, restartPlugin) {

        app.debug('Plugin started');
        ow.init(log);

        let localSubscription = {
            context: 'vessels.self',
            subscribe: ow.subscriptions
        };

        app.subscriptionmanager.subscribe(
            localSubscription,
            unsubscribes,
            subscriptionError => {
                app.error('Error:' + subscriptionError);
            },
            delta => sendDelta(ow.onDeltasUpdate(delta))
        );

        let delta = ow.preLoad(null, null, options["apikey"], options["type"], options["offset"])
        if (delta)
        {
            sendDelta(delta.update)
            sendMeta(delta.meta)
        }

    };

    plugin.stop = function () {
        unsubscribes.forEach(f => f());
        unsubscribes = [];
        app.debug('Plugin stopped');
    };

    plugin.schema = {
        // The plugin schema
        type: "object",
        title: "OpenWeather Service Configuration",
        description: "Configure open weather data ()",
        required: ['apikey'],
        properties: {
          apikey: {
            type: 'string',
            title: 'APPID. Required to extract data from OWMap - http://openweathermap.org/appid'
          },
          type: {
            type: 'string',
            title: 'Type. Simple or Full data object',
            enum: ['simple - temp, humidity, pressure, desc, rain, weathercode', 'full - complete openweathermap json'],
            default: 'simple'
          },
          offset: {
            type: 'number',
            title: 'Forecast offset to localtime (0 = current, otherwise next full hour within <offset> hours (max. 47)',
            default: 0
          },
        }
    };

    /**
     * 
     * @param {Array<[{path:path, value:value}]>} messages 
     */
    function sendDelta(messages) {
        app.handleMessage('openweather-signalk', {
            updates: [
                {
                    values: messages
                }
            ]
        });
        ow.onDeltasPushed();
    }

    function sendMeta(units) {
        app.handleMessage('openweather-signalk', {
            updates: [
                {
                    meta: units
                }
            ]   
        })
    }

    function log(msg) { app.debug(msg); }

    return plugin;
};