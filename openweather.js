
var owm = require ('openweather-apis')
let convert = require ('./skunits')
let log = null
let type = 'simple'
let offset = 0

const navigationPosition = 'navigation.position';
const navigationElevation = 'navigation.gnss.antennaAltitude';
const environmentRPi = 'environment.cpu.temperature';
const oneMinute = 60*1000;
const oneHour = 60*60*1000;
const refreshRate = oneHour;

const subscriptions = [
    { path: navigationPosition, period: refreshRate, policy: "instant", minPeriod: refreshRate },
    { path: navigationElevation, period: refreshRate, policy: "instant", minPeriod: oneMinute },
    // workaround required as policy "ideal" not available for navigationPosition
    { path: environmentRPi, period: refreshRate, policy: "instant", minPeriod: oneMinute },
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
const currentTempPath = "environment.outside.temperature";
const pathPrefix = "environment.forecast.";
const forecastTime = pathPrefix+"time";
const forecastSunrise = pathPrefix+"time.sunrise";
const forecastSunset = pathPrefix+"time.sunset";
const simpleTemp = pathPrefix+'temperature';
const simpleHumidity = pathPrefix+'humidity';
const simplePressure = pathPrefix+'pressure';
const simpleDescription = pathPrefix+'description';
const simpleRain = pathPrefix+'rain';
const simpleWeatherCode = pathPrefix+'weather.code';
const fullMain = pathPrefix+'weather';
const fullIcon = pathPrefix+'weather.icon';
const fullTempMin = pathPrefix+'temperature.minimum';
const fullTempMax = pathPrefix+'temperature.maximum';
const fullFeelsLike = pathPrefix+'temperature.feelslike';
const fullDewPoint = pathPrefix+'temperature.dewpoint';
const fullUVIndex = pathPrefix+'weather.uvindex';
const fullClouds = pathPrefix+'weather.clouds';
const fullVisibility = pathPrefix+'weather.visibility';
const fullWindSpeed = pathPrefix+'wind.speed';
const fullWinDir = pathPrefix+'wind.direction';

const latest = {
    update: null,
    currentTemp: null,
    forecast: {
        time: null,
        lat: null,
        lon: null,
        sunrise: null,
        sunset: null,
        main: null, 
        icon: null 
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
        temp: { min: null, max: null },   
        feelslike: null,
        dewpoint : null,
        uvindex : null,
        clouds : null,
        visibility : null,
        wind: { speed: null, dir: null }
    },
    altitude: {
        elevation: 0,
    }
}

let deltaMessages = [];

const subscriptionHandler = [
    { path: navigationPosition, handle: (value) => onPositionUpdate(value, addMessages) },
    { path: navigationElevation, handle: (value) => onElevationUpdate(value) },
    { path: environmentRPi, handle: (value) => onPositionUpdate({ "latitude":latest.forecast.lat, "longitude":latest.forecast.lon }, addMessages) },
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

function onPositionUpdate(value, callback) {
    if (value == null) log("PositionUpdate: Cannot add null value");

    latest.forecast.lat = value.latitude;
    latest.forecast.lon = value.longitude;

    if (!lastUpdateWithin(refreshRate) && isValidPosition(latest.forecast.lat, latest.forecast.lon))
    {
        latest.update = Date.now();

        owm.setCoordinate(value.latitude, value.longitude);
        log("OWM Coordinates "+value.latitude+","+value.longitude);

        // get the Temperature  
	    owm.getTemperature(function(err, temp){
		    if (!err)
            {
                log('Current temperature:'+ temp);
                latest.currentTemp = temp;
            }
	    });

        if (type==='simple' && offset==0) {
            // get a simple JSON Object with temperature, humidity, pressure and description
            owm.getSmartJSON(function(err, smart){
                if (!err)
                {
                    log(smart);
                    latest.forecast.time = latest.update/1000 // getting ms instead of s
                    latest.simple.temp = smart.temp
		    latest.currentTemp = smart.temp
                    latest.simple.humidity = smart.humidity
                    latest.simple.pressure = convert.toStationAltitude(smart.pressure * 100, latest.altitude.elevation, smart.temp) // getting hPa instead of Pa
                    latest.simple.description = smart.description
                    latest.simple.rain = smart.rain
                    latest.simple.weathercode = smart.weathercode
                }
                else
                {
                    log(err);
                    latest.forecast.time = null
                    latest.simple.temp = null
                    latest.simple.humidity = null
                    latest.simple.pressure = null
                    latest.simple.description = err
                    latest.simple.rain = null
                    latest.simple.weathercode = null            
                }
                callback(prepareUpdate(latest.forecast, latest.simple, null));
            });
        }
        else if ((type==='simple' && offset>0) || type==='full') {
            owm.setExclude('minutely,daily,alerts')
            // get a simple JSON Object with temperature, humidity, pressure and description
            owm.getWeatherOneCall(function(err, data){
                if (!err)
                {
                    latest.forecast.sunrise = data.current.sunrise
                    latest.forecast.sunset = data.current.sunset
                    latest.forecast.time = (offset==0 ? data.current.dt : data.hourly[offset].dt) 
                    latest.simple.temp = (offset==0 ? data.current.temp : data.hourly[offset].temp)
                    latest.full.feelslike = (offset==0 ? data.current.feels_like : data.hourly[offset].feels_like)
                    latest.simple.pressure = convert.toStationAltitude((offset==0 ? data.current.pressure : data.hourly[offset].pressure) * 100, 
                        latest.altitude.elevation, latest.simple.temp), // getting hPa instead of Pa
                    latest.simple.humidity = (offset==0 ? data.current.humidity : data.hourly[offset].humidity)
                    latest.full.dewpoint = (offset==0 ? data.current.dew_point : data.hourly[offset].dew_point)
                    latest.full.uvindex = (offset==0 ? data.current.uvi : data.hourly[offset].uvi)
                    latest.full.clouds = (offset==0 ? data.current.clouds : data.hourly[offset].clouds)
                    latest.full.visibility = (offset==0 ? data.current.visibility : data.hourly[offset].visibility)
                    latest.full.wind.speed = (offset==0 ? data.current.wind_speed : data.hourly[offset].wind_speed)
                    latest.full.wind.dir = (offset==0 ? data.current.wind_deg : data.hourly[offset].wind_deg)
                    latest.simple.description = (offset==0 ? data.current.weather[0].description : data.hourly[offset].weather[0].description)
                    latest.forecast.icon = (offset==0 ? data.current.weather[0].icon : data.hourly[offset].weather[0].icon)
                    latest.forecast.main = (offset==0 ? data.current.weather[0].main : data.hourly[offset].weather[0].main)
                    latest.simple.rain = (data.hourly[offset].rain!==undefined ? data.hourly[offset].rain : {})
                    latest.simple.weathercode = (offset==0 ? data.hourly[0].weather[0].id : data.hourly[offset].weather[0].id)
                    for (i=0; i<Math.min(data.hourly.length, 23); i++)
                    {
                        if (latest.full.temp.min==null || data.hourly[i].temp < latest.full.temp.min)
                            latest.full.temp.min = data.hourly[i].temp
                        if (latest.full.temp.max==null || data.hourly[i].temp > latest.full.temp.max)
                            latest.full.temp.max = data.hourly[i].temp
                    }
                    if (type==='simple') log(latest.simple); else log(latest);
                }
                else
                {
                    log(err);
                    latest.forecast.sunrise = null
                    latest.forecast.sunset =null
                    latest.forecast.time = null 
                    latest.simple.temp = null
                    latest.full.feelslike = null
                    latest.simple.pressure = null
                    latest.simple.humidity = null
                    latest.full.dewpoint = null
                    latest.full.uvindex = null
                    latest.full.clouds = null
                    latest.full.visibility = null
                    latest.full.wind.speed = null
                    latest.full.wind.dir = null
                    latest.simple.description = null
                    latest.forecast.icon = null
                    latest.forecast.main = null
                    latest.simple.rain = null
                    latest.simple.weathercode = null
                }
                callback(prepareUpdate(latest.forecast, latest.simple, latest.full));
            });
        }        
    }
}

function onElevationUpdate(value) {
    if (value == null) 
    {
        log("Cannot add null value as elevation - using 0 instead");
        latest.altitude.elevation = 0
    }
    else if (value!=="waiting ...")
    {
        latest.altitude.elevation = value
        log("Elevation set to "+value+"m above sea level");
    }
}

function prepareUpdate(forecast, weather, full) {
    const noData = "waiting ..."    // only sending for "description"
    const noVal = null              // sending null until data is available
    switch (type) {
        case 'simple': return [
            buildDeltaUpdate(currentTempPath, latest.currentTemp),
            buildDeltaUpdate(forecastTime, forecast.time !== null ? convert.toSignalK('unixdate', forecast.time).value : noVal),

            buildDeltaUpdate(simpleDescription, weather.description !== null ? weather.description : noData),
            buildDeltaUpdate(simpleTemp, weather.temp),
            buildDeltaUpdate(simpleHumidity, weather.humidity !== null ? convert.toSignalK('%', weather.humidity).value : noVal),
            buildDeltaUpdate(simplePressure, weather.pressure),
            buildDeltaUpdate(simpleRain, weather.rain !== null ? weather.rain : {}),
            buildDeltaUpdate(simpleWeatherCode, weather.weathercode)
        ];
        case 'full': return [
            buildDeltaUpdate(currentTempPath, latest.currentTemp),
            buildDeltaUpdate(forecastTime, forecast.time !== null ? convert.toSignalK('unixdate', forecast.time).value : noVal),
            buildDeltaUpdate(forecastSunrise, forecast.sunrise !== null ? convert.toSignalK('unixdate', forecast.sunrise).value : noVal),
            buildDeltaUpdate(forecastSunset, forecast.sunset !== null ? convert.toSignalK('unixdate', forecast.sunset).value : noVal),

            buildDeltaUpdate(simpleDescription, weather.description !== null ? weather.description : noData),
            buildDeltaUpdate(fullIcon, forecast.icon),
            buildDeltaUpdate(fullMain, forecast.main),

            buildDeltaUpdate(simpleTemp, weather.temp),
            buildDeltaUpdate(fullTempMin, full.temp.min),
            buildDeltaUpdate(fullTempMax, full.temp.max),
            buildDeltaUpdate(fullFeelsLike, full.feelslike),
            buildDeltaUpdate(simplePressure, weather.pressure),
            buildDeltaUpdate(simpleHumidity, weather.humidity !== null ? convert.toSignalK('%', weather.humidity).value  : noVal),
            buildDeltaUpdate(fullDewPoint, full.dewpoint),
            buildDeltaUpdate(fullUVIndex, full.uvindex),
            buildDeltaUpdate(fullClouds, full.clouds),
            buildDeltaUpdate(fullVisibility, full.visibility),                       
            buildDeltaUpdate(fullWindSpeed, full.wind.speed),
            buildDeltaUpdate(fullWinDir, full.wind.dir !== null ? convert.toSignalK('°', full.wind.dir).value : noVal),                       
            buildDeltaUpdate(simpleRain, weather.rain !== null ? weather.rain : {}),
            buildDeltaUpdate(simpleWeatherCode, weather.weathercode)
        ];
        case 'meta-simple': return [
            buildDeltaUpdate(currentTempPath, { units: "K" }),
            buildDeltaUpdate(simpleTemp, { units: "K" }),
            buildDeltaUpdate(simpleHumidity, { units: "ratio" }),
            buildDeltaUpdate(simplePressure, { units: "Pa" }),
            buildDeltaUpdate(forecastTime, {}),
            buildDeltaUpdate(simpleDescription, {}),
            buildDeltaUpdate(simpleRain, {}),
            buildDeltaUpdate(simpleWeatherCode, {})
        ];
        case 'meta-full': return [
            buildDeltaUpdate(currentTempPath, { units: "K" }),
	    buildDeltaUpdate(simpleTemp, { units: "K" }),
            buildDeltaUpdate(fullTempMin, { units: "K" }),
            buildDeltaUpdate(fullTempMax, { units: "K" }),
            buildDeltaUpdate(fullFeelsLike, { units: "K" }),
            buildDeltaUpdate(simpleHumidity, { units: "ratio" }),
            buildDeltaUpdate(simplePressure, { units: "Pa" }),
            buildDeltaUpdate(fullDewPoint, { units: "K" }),
            buildDeltaUpdate(fullWindSpeed, { units: "m/s" }),
            buildDeltaUpdate(fullWinDir, { units: "rad" }),
            buildDeltaUpdate(forecastTime, {}),
            buildDeltaUpdate(forecastSunrise, {}),
            buildDeltaUpdate(forecastSunset, {}),
            buildDeltaUpdate(simpleDescription, {}),
            buildDeltaUpdate(fullIcon, {}),
            buildDeltaUpdate(fullMain, {}),
            buildDeltaUpdate(fullUVIndex, {}),
            buildDeltaUpdate(fullClouds, {}),
            buildDeltaUpdate(fullVisibility, {}),
            buildDeltaUpdate(simpleRain, {}),
            buildDeltaUpdate(simpleWeatherCode, {})
        ];
        default:
            return [];
    }
}

function buildDeltaUpdate(path, value) {
    if (type.startsWith("meta-") && value !== null) value.timeout = refreshRate/1000;
    return {
        path: path,
        value: value
    }
}

function preLoad(lat, lon, apikey, configtype, configoffset) {
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
    if (type!==undefined && type!==null)
        type = configtype.split('-')[0].trim();
    if (offset!==undefined && offset!==null)
    {
        if (offset>48) { log("Forecast supported max. 48Hours!") }
        offset = Math.min(configoffset, 47);
    } 
	// 'metric'  'internal'  'imperial'
 	owm.setUnits('internal');
	// check http://openweathermap.org/appid#get for get the APPID
    owm.setAPPID(apikey); 
    // return empty data set
    let initial = prepareUpdate(latest.forecast, latest.simple, latest.full);
    let meta = null
    // add units to updates
    if (initial) {
        type = 'meta-'+type
        meta = prepareUpdate(null, null, null);
        type = type.replace('meta-', '')        
    }
    return { "update": initial, "meta": meta }
}

function lastUpdateWithin(interval) {
    return latest.update !== null ? (Date.now() - latest.update) <= interval : false;
}

function isValidPosition(lat, lon) {
    return (lat!==null&&lon!==null && lat!==undefined&&lon!==undefined);
}

module.exports = {
    subscriptions,
    preLoad,
    onDeltasUpdate,
    onDeltasPushed,

    init: function(loghandler) {
        log = loghandler;
        latest.update = null;
    }
}
