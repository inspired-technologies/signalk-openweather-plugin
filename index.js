/*
    Copyright © 2024 Inspired Technologies GmbH (www.inspiredtechnologies.eu)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
*/

'use strict'
const debug = require("debug")("signalk:openweather-signalk")
const ow = require('./openweather')

module.exports = function (app) {
    var plugin = {};

    plugin.id = 'openweather-signalk';
    plugin.name = 'OpenWeather Forecast';
    plugin.description = 'Provide forecast data from OpenWeather Service';

    var unsubscribes = [];
    let timerId = null;
    plugin.start = function (options, restartPlugin) {

        app.debug('Plugin starting ...');
        app.setPluginStatus('Initializing');
        timerId = ow.init(sendDelta, app.getSelfPath, { status: app.setPluginStatus, error: app.setPluginError }, app.debug);

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
            delta => ow.onDeltasUpdate(delta)
        );

        let meta = ow.preLoad(options["apikey"], options["type"], 
            { horizon: options["horizon"] || 23, offset: options["offset"] || 1, current: options["current"] || false, partial: options["partial"] || undefined } )
        if (meta.length>0)
            sendMeta(meta)
        app.debug('Plugin initialized.');
    };

    plugin.stop = function () {
        app.debug('Plugin stopping...');
        unsubscribes.forEach(f => f());
        if (timerId!==null) clearInterval(timerId);
        unsubscribes = [];
        app.debug('Plugin stopped.');
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
          horizon: {
            type: 'number',
            title: 'Forecast Horizon',
            description: 'Time horizon for which the forecast must be computed (in hours, max. 48)',
            default: 24
          },          
          offset: {
            type: 'number',
            title: 'Forecast offset to localtime',
            description: 'Publish offset from localtime (full next hour within <offset> hours, max. see above)',
            default: 1
          },
          current: {
            type: 'boolean',
            title: "Publish current on the 'environment' path",
            description: "turn this on, only if no other signals for 'outside' on the network (eg. BME280, RUUVI)",
            default: false
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

    return plugin;
};