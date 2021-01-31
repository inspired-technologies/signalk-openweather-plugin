var owm = require ('openweather-apis')

const navigationPosition = 'navigation.position';
const outsideBattery = 'environment.outside.battery';
const oneMinute = 60*1000;
const oneHour = 60*60*1000;

const subscriptions = [
    { path: navigationPosition, period: oneHour, policy: "instant", minPeriod: oneHour },
    { path: outsideBattery, period: oneHour, policy: "instant", minPeriod: oneMinute },
];

// SmartJSON 
/* 
    temp : 25,
    humidity : 88,
    pressure : 101325,
    description : 'sun',
    rain: 4,
    weathercode : 200 
*/
const pathPrefix = "environment.forecast.";
const forecastTime = pathPrefix+"time";
const simpleTemp = pathPrefix+'temperature';
const simpleHumidity = pathPrefix+'humidity';
const simplePressure = pathPrefix+'pressure';
const simpleDescription = pathPrefix+'description';
const simpleRain = pathPrefix+'rain';
const simpleWeatherCode = pathPrefix+'weathercode';

const latest = {
    forecast: {
        time: null,
        lat: null,
        lon: null,        
    },
    simple: {
        temp : null,
        humidity : null,
        pressure : null,
        description : null,
        rain: null,
        weathercode : null
    },
    full: {
        time: null,
    }
}

let deltaMessages = [];

const subscriptionHandler = [
    { path: navigationPosition, handle: (value) => onUpdate(value, addMessages) },
    { path: outsideBattery, handle: (value) => onUpdate({ "latitude":latest.forecast.lat, "longitude":latest.forecast.lon }, addMessages) },
]

function onDeltasUpdate(deltas) {
    if (deltas === null && !Array.isArray(deltas) && deltas.length === 0) {
        throw "Deltas cannot be null";
    }

    deltas.updates.forEach(u => {
        u.values.forEach((value) => {
            let onDeltaUpdated = subscriptionHandler.find((d) => d.path === value.path);

            if (onDeltaUpdated !== null) {
                onDeltaUpdated.handle(value.value, addMessages);
            }
        });
    });

    return deltaMessages;
}

function onDeltasPushed () {
    deltaMessages = [];
}

function addMessages (updates) {
    if (updates !== null && updates !== undefined) {
        updates.forEach((u) => deltaMessages.push(u));
    }
} 

function onUpdate(value, callback) {
    if (value == null) throw new Error("Cannot add null value");

    latest.forecast.lat = value.latitude;
    latest.forecast.lon = value.longitude;

    if (!lastUpdateWithin(oneHour))
    {
        latest.forecast.time = Date.now();

        owm.setCoordinate(value.latitude, value.longitude);
        // get a simple JSON Object with temperature, humidity, pressure and description
        owm.getSmartJSON(function(err, smart){
            if (!err)
            {
                latest.simple.temp = smart.temp
                latest.simple.humidity = smart.humidity,
                latest.simple.pressure = smart.pressure * 100, // getting hPa instead of Pa
                latest.simple.description = smart.description,
                latest.simple.rain = smart.rain,
                latest.simple.weathercode = smart.weathercode
            }
            else
            {
                latest.simple.temp = null
                latest.simple.humidity = null,
                latest.simple.pressure = null,
                latest.simple.description = err,
                latest.simple.rain = null,
                latest.simple.weathercode = null            
            }
            callback(prepareUpdate(latest.forecast, latest.simple));                
        });
    }
}

function prepareUpdate(forecast, weather) {
    const noData = "waiting ..."
    return [
        buildDeltaUpdate(forecastTime, forecast.time !== null ? forecast.time : noData),

        buildDeltaUpdate(simpleDescription, weather.description !== null ? weather.description : noData),
        buildDeltaUpdate(simpleTemp, weather.temp !== null ? weather.temp : noData),
        buildDeltaUpdate(simpleHumidity, weather.humidity !== null ? weather.humidity : noData),
        buildDeltaUpdate(simplePressure, weather.pressure !== null ? weather.pressure : noData),
        buildDeltaUpdate(simpleRain, weather.rain !== null ? weather.rain : noData),
        buildDeltaUpdate(simpleWeatherCode, weather.weathercode !== null ? weather.weathercode : noData)
    ];
}

function buildDeltaUpdate(path, value) {
    return {
        path: path,
        value: value
    }
}

function preLoad(lat, lon, apikey, type, offset) {
    owm.setLang('en');
	// English - en, Russian - ru, Italian - it, Spanish - es (or sp),
	// Ukrainian - uk (or ua), German - de, Portuguese - pt,Romanian - ro,
	// Polish - pl, Finnish - fi, Dutch - nl, French - fr, Bulgarian - bg,
	// Swedish - sv (or se), Chinese Tra - zh_tw, Chinese Sim - zh (or zh_cn),
	// Turkish - tr, Croatian - hr, Catalan - ca

    // set the coordinates (latitude,longitude)
    latest.forecast.lat = lat;
    latest.forecast.lon = lon;
    latest.simple.description = 'connecting to openweathermap...';
	// owm.setCoordinate(lat, lon);
	// 'metric'  'internal'  'imperial'
 	owm.setUnits('internal');
	// check http://openweathermap.org/appid#get for get the APPID
    owm.setAPPID(apikey); 
    // return empty data set
    return prepareUpdate(latest.forecast, latest.simple);
}

function lastUpdateWithin(interval) {
    return latest.forecast.time !== null ? (Date.now() - latest.forecast.time) <= interval : false;
}

module.exports = {
    subscriptions,
    preLoad,
    onDeltasUpdate,
    onDeltasPushed
}