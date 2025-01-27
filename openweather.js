/*
    Copyright © 2025 Inspired Technologies (www.inspiredtechnologies.eu)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.
*/

const axios = require ('axios')
const convert = require ('./skunits')
const ONECALLAPI = 'https://api.openweathermap.org/data/3.0/onecall'
const DEFAULTTYPE = 'simple'
const CURRENTPATH = 'outside'
let log
// let logwarning = true
let sendVal
let pluginStatus
let pluginError
let apiKey = ''
let variables = []
let output = []
let meta
let horizon = {
    hours: 48,
    unit: 'h'
}
let offset = 1

const navigationPosition = 'navigation.position';
const navigationElevation = 'navigation.gnss.antennaAltitude';
const oneMinute = 60*1000;
const oneHour = 60*60*1000;
const refreshRate = oneHour;

const subscriptions = [
    { path: navigationPosition, period: refreshRate, policy: "instant", minPeriod: refreshRate },
    { path: navigationElevation, period: refreshRate, policy: "instant", minPeriod: 5*oneMinute },
];

// basic Path definitions
const pathEnvironment = 'environment.';
const pathCurrent = `environment.${CURRENTPATH}.`;
const currentSunrise = pathEnvironment+'sunlight.times.sunrise'
const currentSunset = pathEnvironment+'sunlight.times.sunset'
const currentTemp = pathCurrent+'temperature';
const currentFeelsLike = pathCurrent+'temperature.feelslike';
const currentPressure = pathCurrent+'pressure';
const currentHumidity = pathCurrent+'relativeHumidity';
const currentDewPoint = pathCurrent+'temperature.dewpoint';
const currentClouds = pathCurrent+'weather.clouds';
const currentUVI = pathCurrent+'weather.uvindex';
const currentVisibility = pathCurrent+'weather.visbility';
const currentWindSpeed = pathCurrent+'wind.speed';
const currentWindDir = pathCurrent+'wind.direction';
const currentWindGust = pathCurrent+'wind.gust';
const currentRain = pathCurrent+'precipitation.rain';
const currentSnow = pathCurrent+'precipitation.snow';
const currentMain = pathCurrent+'weather';
const currentWeather = pathCurrent+'weather.code';
const currentDesc = pathCurrent+'description';
const currentIcon = pathCurrent+'weather.icon';
const pathPrefix = "environment.forecast.";
const forecastTime = pathPrefix+"time";
const forecastPressure = pathPrefix+'pressure';
const forecastTemperature = pathPrefix+'temperature';
const forecastTempMin = pathPrefix+'temperature.minimum';
const forecastTempMax = pathPrefix+'temperature.maximum';
const forecastTodayMin = pathPrefix+'today.temperature.minimum';
const forecastTodayMax = pathPrefix+'today.temperature.maximum';
const forecastFeelsLike = pathPrefix+'temperature.feelslike';
const forecastHumidity = pathPrefix+'relativeHumidity';
const forecastPrecipProp = pathPrefix+'precipitation.probability';
const forecastPrecipRain = pathPrefix+'precipitation.rain';
const forecastPrecipSnow = pathPrefix+'precipitation.snow';
const forecastDewPoint = pathPrefix+'temperature.dewpoint';
const forecastClouds = pathPrefix+'weather.clouds';
const forecastUVI = pathPrefix+'weather.uvindex';
const forecastVisibility = pathPrefix+'weather.visibility';
const forecastWindSpeed = pathPrefix+'wind.speed';
const forecastWindDir = pathPrefix+'wind.direction';
const forecastWindGust = pathPrefix+'wind.gust';
const forecastMain = pathPrefix+'weather';
const forecastWeather = pathPrefix+'weather.code';
const forecastDesc = pathPrefix+'description';
const forecastIcon = pathPrefix+'weather.icon';

const latest = {
    update: null,
    forecast: { time: null, tz: null },
    position: { lat: null, lon: null },
    current: {
        publish: false,
        partial: [],
        sunrise : { path: currentSunrise, value: null, unit: 'unixdate', key: 'sunrise', description: 'Sunrise time, UTC. For polar areas in midnight sun and polar night periods this parameter is not returned in the response' },
        sunset : { path: currentSunset, value: null, unit: 'unixdate', key: 'sunset', description: 'Sunset time, Unix, UTC. For polar areas in midnight sun and polar night periods this parameter is not returned in the response' },
        temperature : { path: currentTemp, value: null, unit: 'K', key: 'temp', description: 'Current temperature' },
        feelslike : { path: currentFeelsLike, value: null, unit: 'K', key: 'feels_like', description: 'Current temperature, accounts for the human perception of weather.' },
        todayMin : { path: forecastTodayMin, value: null, unit: 'K', key: 'today:min', description: 'Today\'s minimum temperature' },
        todayMax : { path: forecastTodayMax, value: null, unit: 'K', key: 'today:max', description: 'Today\'s maximum temperature' },
        pressure : { path: currentPressure, value: null, unit: 'hPa', key: 'pressure', description: 'Current atmospheric pressure on the sea level' },        
        humidity : { path: currentHumidity, value: null, unit: 'ratio', key: 'humidity', description: 'Current relative humidity' },
        dewpoint : { path: currentDewPoint, value: null, unit: 'K', key: 'dew_point', description: 'Current atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form' },
        clouds : { path: currentClouds, value: null, unit: 'ratio', key: 'clouds', description: 'Current cloudiness' },
        uvindex : { path: currentUVI, value: null, unit: '', key: 'uvi', description: 'Current UV index' },
        visibility : { path: currentVisibility, value: null, unit: 'm', key: 'visibility', description: 'Average visibility. The maximum value of the visibility is 10km' },
        wind: {
            speed : { path: currentWindSpeed, value: null, unit: 'm/s', key: 'wind_speed', description: 'Wind speed' },
            direction : { path: currentWindDir, value: null, unit: 'degrees', key: 'wind_deg', description: 'Wind direction, angle counting clockwise from the North' },
            gust : { path: currentWindGust, value: null, unit: 'm/s', key: 'wind_gust', description: 'Gust wind speed' },
        },
        rain : { path: currentRain, value: null, unit: 'mm/h', key: '0:rain.1h', description: 'Precipitation, where available' },
        snow : { path: currentSnow, value: null, unit: 'mm/h', key: '0:snow.1h', description: 'Precipitation, where available' },
        weather : {
            id: { path: currentWeather, value: null, unit: '', key: '0:weather.id', description: 'Weather condition id' },
            main: { path: currentMain, value: null, unit: 'string', key: '0:weather.main', description: 'Group of weather parameters (Rain, Snow etc.)' },
            desc: { path: currentDesc, value: null, unit: 'string', key: '0:weather.description', description: 'Weather condition within the group. Output available in multiple languages' },
            icon: { path: currentIcon, value: null, unit: 'string', key: '0:weather.icon', description: 'Weather icon id' },
        }
    },
    pressure: {
        simple: "sealevel",
        sealevel : { path: forecastPressure, value: null, unit: 'hPa', key: 'pressure', description: 'Atmospheric pressure on the sea level' },
    },
    temperature: {
        simple: "outside",
        outside : { path: forecastTemperature, value: null, unit: 'K', key: 'temp', description: 'Temperature' },
        feelslike : { path: forecastFeelsLike, value: null, unit: 'K', key: 'feels_like', description: 'Temperature, accounts for the human perception of weather' },
        minimum : { path: forecastTempMin, value: null, unit: 'K', key: 'min:temp', description: 'Minimum temperature over forecast horizon' },
        maximum : { path: forecastTempMax, value: null, unit: 'K', key: 'max:temp', description: 'Maximum temperature over forecast horizon' },
    },
    humidity: {
        simple: "relative",
        relative : { path: forecastHumidity, value: null, unit: '%', key: 'humidity', description: 'Humidity' },
    },
    precipitation: {
        simple: "rain",
        pop : { path: forecastPrecipProp, value: null, unit: 'ratio', key: 'pop', description: 'Probability of precipitation. Values vary between 0 and 1, where 0 is equal to 0%, 1 is equal to 100%' },
        rain : { path: forecastPrecipRain, value: null, unit: 'mm/h', key: '0:rain.1h', description: 'Precipitation, mm/h - where available' },
        snow : { path: forecastPrecipSnow, value: null, unit: 'mm/h', key: '0:snow.1h', description: 'Precipitation, mm/h - where available' },         
    },
    wind: {
        simple: null,
        speed : { path: forecastWindSpeed, value: null, unit: 'm/s', key: 'wind_speed', description: 'Wind speed' },
        direction : { path: forecastWindDir, value: null, unit: 'degrees', key: 'wind_deg', description: 'Wind direction, angle counting clockwise from the North' },
        gust : { path: forecastWindGust, value: null, unit: 'm/s', key: 'wind_gust', description: 'Gust wind speed' },
    },
    atmospherics: {
        simple: null,
        dewpoint : { path: forecastDewPoint, value: null, unit: 'K', key: 'dew_point', description: 'Atmospheric temperature (varying according to pressure and humidity) below which water droplets begin to condense and dew can form' },
        uvindex : { path: forecastUVI, value: null, unit: '', key: 'uvi', description: 'UV index' },
        clouds : { path: forecastClouds, value: null, unit: '%', key: 'clouds', description: 'Cloudiness' },
        visibility : { path: forecastVisibility, value: null, unit: 'm', key: 'visibility', description: 'Average visibility, metres. The maximum value of the visibility is 10km' },
    },
    weather : {
        simple: "id",
        id: { path: forecastWeather, value: null, unit: 'string', key: '0:weather.id', description: 'Weather condition id' },
        main: { path: forecastMain, value: null, unit: 'string', key: '0:weather.main', description: 'Group of weather parameters (Rain, Snow etc.)' },
        desc: { path: forecastDesc, value: null, unit: 'string', key: '0:weather.description', description: 'Weather condition within the group. Output available in multiple languages' },
        icon: { path: forecastIcon, value: null, unit: 'string', key: '0:weather.icon', description: 'Weather icon id' },
    },
    alerts : {
        simple: null,
        sender: { path: null, value: null, unit: 'string', key: 'alerts.sender_name', description: 'Name of the alert source' },
        event: { path: null, value: null, unit: 'string', key: 'alerts.event', description: 'Alert event name' },
        start: { path: null, value: null, unit: 'unixdate', key: 'alerts.start', description: 'UTC start of the alert' },
        end: { path: null, value: null, unit: 'unixdate', key: 'alerts.end', description: 'UTC end of the alert' },
        desc: { path: null, value: null, unit: 'string', key: 'alerts.description', description: 'Description of the alert' },
        tags: { path: null, value: null, unit: 'string', key: 'alerts.tags', description: 'Type of severe weather' },
    },
    altitude: {
        elevation: 0,
    }
}

const subscriptionHandler = [
    { path: navigationPosition, handle: (value) => onPositionUpdate(value) },
    { path: navigationElevation, handle: (value) => onElevationUpdate(value) },
]

function onDeltasUpdate(deltas) {
    if (apiKey==='')
        return
    else if (deltas === null && !Array.isArray(deltas) && deltas.length === 0) {
        throw "Deltas cannot be null";
    }

    deltas.updates.forEach(u => {
        u.values.forEach((value) => {
            let onDeltaUpdated = subscriptionHandler.find((d) => d.path === value.path);

            if (onDeltaUpdated !== null) {
                onDeltaUpdated.handle(value.value);
            }
        });
    });
}

async function onPositionUpdate(value) {
    if (value == null) log("PositionUpdate: Cannot add null value");

    latest.position.lat = value.latitude;
    latest.position.lon = value.longitude;

    if (!lastUpdateWithin(refreshRate) && isValidPosition(latest.position.lat, latest.position.lon))
    {
        log(`OpenWeather Coordinates ${latest.position.lat},${latest.position.lon}`);

        let measures = '' 
        if (variables.length>0) variables.forEach(v => measures = (measures==='' ? v : measures+','+v));
        let excludes = typeof meta === 'undefined' ? 'minutely,daily' : 'minutely,daily,metadata' 
        let fchours = horizon.hours+','+horizon.unit
        let config = {
            method: 'get',
            url: ONECALLAPI+`?lat=${latest.position.lat}&lon=${latest.position.lon}&exclude=${excludes}&appid=${apiKey}`,
            headers: { 
            'Content-Type': 'application/json',
            }
        };
            
        const response = axios(config)
            .then( (response) => {
                if (latest.update===null || latest.weather.id.value===null)
                    pluginStatus('Started')
                let result = {}
                
                // update snap data
                latest.position.lat = response.data.lat
                latest.position.lon = response.data.lon
                let newDay = latest.forecast.time === null || new Date(latest.forecast.time).getDate() != new Date((response.data.current.dt + (offset)*3600)*1000).getDate()
                latest.forecast.time = response.data.hourly.length>0 && response.data.hourly.length>offset ? (response.data.current.dt + (offset)*3600)*1000 : null
                latest.forecast.tz = response.data.timezone
                log(`Forecast received for ${new Date(latest.forecast.time).toString()}`)

                // update latest values from response.current
                for (const o of Object.keys(latest.current)) 
                    if (typeof latest.current[o]==='object' && !Array.isArray(latest.current[o]) && !latest.current[o].hasOwnProperty('key')) 
                        for (const sub of Object.keys(latest.current[o]))    
                        {
                            let key = latest.current[o][sub].key
                            if (key.includes(':') && Array.isArray(response.data.current[key.split(':')[1].split('.')[0]]))
                                {   // all weather
                                    let lookup = response.data.current[key.split(':')[1].split('.')[0]][key.split(':')[0]]
                                    latest.current[o][sub].value = convert.toSignalK(latest.current[o][sub].unit, lookup[key.split('.')[1]])
                                }
                            else if (response.data.current.hasOwnProperty(key))
                                latest.current[o][sub].value = convert.toSignalK(latest.current[o][sub].unit, response.data.current[key])
                        }
                    else if (typeof latest.current[o]==='object' && !Array.isArray(latest.current[o]) && latest.current[o].hasOwnProperty('key')) {
                        let key = latest.current[o].key
                        if (key.includes('today:'))
                            {   // Today's min & max Temp
                                if (latest.current[o].value === null || newDay)
                                {
                                    let min = Math.min(...response.data.hourly.slice(0,24).map(t => t.temp))
                                    let max = Math.max(...response.data.hourly.slice(0,24).map(t => t.temp))
                                    latest.current[o].value = convert.toSignalK(latest.current[o].unit, key.split(':')[1] === 'min' ? min : key.split(':')[1] === 'max' ? max : null)    
                                }
                            }
                        else if (key.includes(':') && Array.isArray(response.data.current[key.split(':')[1].split('.')[0]]))
                            {   // all weather
                                let lookup = response.data.current[key.split(':')[1].split('.')[0]][key.split(':')[0]]
                                latest.current[o].value = convert.toStationAltitude(latest.current[o].unit, lookup[key.split('.')[1]])                      
                            }
                        else if (key.includes(':') && typeof response.data.current[key.split(':')[1].split('.')[0]]==='object')
                            {   // precipitation, wind
                                let lookup = response.data.current[key.split(':')[1].split('.')[0]]
                                latest.current[o].value = convert.toSignalK(latest.current[o].unit, lookup[key.split(':')[1].split('.')[1]])
                            }                                    
                        else if (o==='pressure' && response.data.current.hasOwnProperty(key))
                            {   // pressure                               
                                latest.current[o].value = convert.toSignalK(latest.current[o].unit, response.data.current[key])
                                if (latest.current[o].value)
                                    latest.current[o].value.value = convert.toSeaLevel(latest.current[o].value.value / 100, 
                                        latest.altitude.elevation, latest.current.temperature.value.value || 273.15) * 100
                            }
                        else if (response.data.current.hasOwnProperty(key))
                            latest.current[o].value = convert.toSignalK(latest.current[o].unit, response.data.current[key])                            
                    }

                // update latest values from response.hourly by offset                    
                if (response.data.hourly.length>0 && response.data.hourly.length>offset) {
                    for (const m of Object.keys(latest).filter(m => latest[m]!==null && latest[m].hasOwnProperty('simple')))
                        for (const o of Object.keys(latest[m]).filter(o => o!=='simple'))
                            if (typeof latest[m][o]==='object' && !latest[m][o].hasOwnProperty('key')) 
                                for (const sub of Object.keys(latest[m][o]))    
                                {
                                    let key = latest[m][o][sub].key
                                    if (key.includes(':') && Array.isArray(response.data.hourly[offset][key.split(':')[1].split('.')[0]]))
                                        {
                                            let lookup = response.data.hourly[offset][key.split(':')[1].split('.')[0]][key.split(':')[0]]
                                            latest[m][o][sub].value = convert.toSignalK(latest[m][o][sub].unit, lookup[key.split('.')[1]])                           
                                        }
                                    else if (response.data.hourly[offset].hasOwnProperty(key))
                                        latest[m][o][sub].value = convert.toSignalK(latest[m][o][sub].unit, response.data.hourly[offset][key])
                                }
                            else if (typeof latest[m][o]==='object' && latest[m][o].hasOwnProperty('key')) {
                                let key = latest[m][o].key
                                if (key.includes(':') && Array.isArray(response.data.hourly[offset][key.split(':')[1].split('.')[0]]))
                                    {
                                        let lookup = response.data.hourly[offset][key.split(':')[1].split('.')[0]][key.split(':')[0]]
                                        latest[m][o].value = convert.toSignalK(latest[m][o].unit, lookup[key.split('.')[1]])               
                                    }
                                else if (key.includes(':') && (key.split(':')[0]==='min' || key.split(':')[0]==='max' || key.split(':')[0]==='avg') &&
                                        response.data.hourly[0].hasOwnProperty(key.split(':')[1]))
                                    {
                                        let calc = null
                                        if (key.split(':')[0]==='min')
                                            calc = Math.min(...response.data.hourly.map(d => d[key.split(':')[1]]).slice(0, horizon.hours))
                                        else if (key.split(':')[0]==='max')
                                            calc = Math.max(...response.data.hourly.map(d => d[key.split(':')[1]]).slice(0, horizon.hours))
                                        else if (key.split(':')[0]==='avg')
                                            calc = Math.avg(...response.data.hourly.map(d => d[key.split(':')[1]]).slice(0, horizon.hours))
                                        latest[m][o].value = convert.toSignalK(latest[m][o].unit, calc)
                                    }
                                else if (key.includes(':') && typeof response.data.hourly[offset][key.split(':')[1].split('.')[0]]==='object')
                                    {
                                        let lookup = response.data.hourly[offset][key.split(':')[1].split('.')[0]]
                                        latest[m][o].value = convert.toSignalK(latest[m][o].unit, lookup[key.split(':')[1].split('.')[1]])
                                    }                                    
                                else if (o==='sealevel' && response.data.current.hasOwnProperty(key))
                                    {                               
                                        latest[m][o].value = convert.toSignalK(latest[m][o].unit, response.data.hourly[offset][key])
                                        if (latest[m][o].value)
                                            latest[m][o].value.value = convert.toStationAltitude(latest[m][o].value.value / 100, latest.altitude.elevation, 
                                                latest.temperature.outside.value!==null ? latest.temperature.outside.value.value : latest.current.temperature.value.value || 273.15) * 100
                                    }
                                else if (response.data.hourly[offset].hasOwnProperty(key))
                                    latest[m][o].value = convert.toSignalK(latest[m][o].unit, response.data.hourly[offset][key])
                            }                                            
                }

                let measures = Object.keys(latest).filter(k => latest[k]!==null &&
                    (k==='current' || latest[k].hasOwnProperty('simple')) &&  
                    (publishType==='simple' ? latest[k].simple!==null : true))
                output = []
                for (const m of measures)
                    Object.keys(latest[m]).forEach(o => { 
                        if (publishType==='simple' && typeof latest[m][o]==='object' && latest[m][o].hasOwnProperty('key') && 
                            latest[m][o].path!==null && latest[m].simple===o)
                                output.push({ path: latest[m][o].path, val: latest[m][o].value })
                        else if (publishType==='full' && typeof latest[m][o]==='object' &&  latest[m][o]!==null && 
                            latest[m][o].hasOwnProperty('key') && latest[m][o].path!==null)
                                output.push({ path: latest[m][o].path, val: latest[m][o].value })
                        else if (publishType==='full' && typeof latest[m][o]==='object' && latest[m][o]!==null && 
                            !latest[m][o].hasOwnProperty('key'))
                            for (const s of Object.keys(latest[m][o]))
                                if (typeof latest[m][o][s]==='object' && latest[m][o][s].hasOwnProperty('key') && latest[m][o][s].path!==null)
                                    output.push({ path: latest[m][o][s].path, val: latest[m][o][s].value })
                            })

                output.filter(o => o.path!==null && o.val!==null && o.val.value!==null)
                .filter(o => !o.path.includes(CURRENTPATH) || latest.current.publish && o.path.includes(CURRENTPATH) || 
                    latest.current.partial.length>0 && o.path.includes(CURRENTPATH) && 
                        (latest.current.partial.indexOf(o.path.split('.')[o.path.split('.').length===4 ? 3 : 2])!==-1))
                .forEach(o => {
                    let res = o.path.includes(CURRENTPATH) ? o.path.replace('environment.', '').split('.') : 
                              o.path.replace('environment.forecast.', '').split('.')
                    let val = result
                    for (i=0; i<res.length; i++)
                        if (i===res.length-1)
                            val[res[i]] = o.val.value
                        else if (!val.hasOwnProperty(res[i]))
                        {
                            val[res[i]] = {}
                            val = val[res[i]]
                        }
                        else
                            val = val[res[i]]

                })
                log(result);
                sendVal(prepareUpdate('values'))
            })
            .finally(() => {
                latest.update = Date.now();
            })
            .catch( (error) => {
                if (error.hasOwnProperty('code') && error.code==="ERR_BAD_REQUEST" && error.response.status===401) {
                    log(`Unauthorized: ${error.message.replace('Please note that using One Call','OpenWeather')}`)
                    pluginError('Error: OpenWeather API unauthorized')
                } else {
                    log(error);
                }   
            });
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

function prepareUpdate(type) {
    let update = []
    switch (type) {
        case 'values': {
            update.push(buildDeltaUpdate(forecastTime, (new Date(latest.forecast.time)).toISOString()))
            output.filter(o => !o.path.includes(CURRENTPATH) || latest.current.publish && o.path.includes(CURRENTPATH) || 
                latest.current.partial.length>0 && o.path.includes(CURRENTPATH) && 
                    latest.current.partial.indexOf(o.path.split('.')[o.path.split('.').length===4 ? 3 : 2])!==-1)
            .forEach(o => { if (o.val && typeof o.val.value!=='undefined') 
                update.push(buildDeltaUpdate(o.path, o.val.value)) 
            });
            break;
        }
        case 'meta': {
            output.filter(o => o.val).forEach(o => update.push(buildDeltaUpdate(o.path, o.val.hasOwnProperty('unit') ? 
                { units: convert.toSignalK(o.val.unit, null).units, timeout: refreshRate / 1000, description: o.val.description } :
                { timeout: refreshRate / 1000, description: o.val.description }
             )));
            break;
            }
        default:
            break;
    }
    return update;
}

function buildDeltaUpdate(path, value) {
    return {
        path: path,
        value: value
    }
}

function preLoad(apikey, config, param) {
    // authorization
    if (!apikey || apikey==='') {
        log("API-Key not provided - OpenWeather forecasts deactivated!")
        pluginError('Error: Invalid API Key')
        return [];
    } 
    else
        apiKey = apikey

    // configuration
    if (config && Array.isArray(config.split('-')) && config.split('-')[0]!=='')
        publishType = config.split('-')[0].trim();
    else
        publishType = DEFAULTTYPE;

    for (const m of Object.keys(latest).filter(k => latest[k]!==null && latest[k].hasOwnProperty('simple')))
        for (const o of Object.keys(latest[m]).filter(o => o!=='simple'))
            if (latest[m][o].hasOwnProperty('path') && latest[m][o].path!==null && latest[m][o].hasOwnProperty('key') && 
               (latest[m].simple!==null || publishType==='full'))
                output.push({ path: latest[m][o].path, val: {
                    value: latest[m][o].value,
                    unit: latest[m][o].unit,
                    description: latest[m][o].description
                } });
            else if (!latest[m][o].hasOwnProperty('key') && (latest[m].simple!==null || publishType==='full')   )
                for (const s of Object.keys(latest[m][o]).filter(k => k.path!==null))
                    output.push({ path: latest[m][o][s].path, val: {
                        value: latest[m][o][s].value,
                        unit: latest[m][o][s].unit,
                        description: latest[m][o][s].description
                } });


    latest.current.partial = []
    if (param.current || param.partial)
        for (const o of Object.keys(latest.current)) {
            if (latest.current[o].hasOwnProperty('path') && latest.current[o].hasOwnProperty('key') && latest.current[o].path!==null)
                output.push({ path: latest.current[o].path, val: {
                    value: latest.current[o].value,
                    unit: latest.current[o].unit,
                    description: latest.current[o].description
                } });
            else if (!latest.current[o].hasOwnProperty('key'))
                for (const s of Object.keys(latest.current[o]).filter(k => k.path!==null))
                    output.push({ path: latest.current[o][s].path, val: {
                        value: latest.current[o][s].value,
                        unit: latest.current[o][s].unit,
                        description: latest.current[o][s].description
                } })
            if (param.partial && param.partial.split(',').indexOf(o)!==-1)  
                if (latest.current[o].hasOwnProperty('key'))
                    latest.current.partial.push(o)
                else
                    for (const s of Object.keys(latest.current[o])) 
                        latest.current.partial.push(s)
        }
        latest.current.publish = param.current && output.map(o => o.path.includes(CURRENTPATH)).indexOf(true)!==-1;

    // other parameters
    if (param && param.offset!==undefined && param.offset!==null)
        {
            if (param.offset>47) { log("Offset shall not exceed max. 48 hours!") }
            offset = param.offset<=0 ? 1 : Math.min(param.offset, 47);
        }
        if (param && param.horizon!==undefined && param.horizon!==null)
        {
            if (param.horizon>24*4) { log("Forecast only supports max. 4 days!") }
            horizon = { 
                hours: param.horizon<=0 ? 8 : Math.min(Math.max(param.offset+1, param.horizon), 24*4),
                unit: 'h'
            }
        }
    return prepareUpdate('meta');
}

function lastUpdateWithin(interval) {
    return latest && latest.hasOwnProperty('update') && 
        latest.update!==null ? (Date.now() - latest.update + 5*oneMinute) < interval : false;
}

function isValidPosition(lat, lon) {
    return lat && lon && lat!==null && lon!==null &&
        !isNaN(lat) && lat>=-90 && lat <=90 && 
        !isNaN(lon) && lon>=-180 && lon<=180;
}

module.exports = {
    subscriptions,
    preLoad,
    onDeltasUpdate,

    init: function(msgHandler, getVal, stateHandlers, logHandler) {
        sendVal = msgHandler
        pluginStatus = stateHandlers.status
        pluginError = stateHandlers.error
        log = logHandler     
        latest.update = null
        let timerId = null
        if (refreshRate) {
            timerId = setInterval(() => {
                if (!lastUpdateWithin(refreshRate)) {
                    onPositionUpdate(getVal(navigationPosition).value);
                }
            }, refreshRate)
            log(`Interval started, refresh rate ${refreshRate/60/1000}min`);
        }
        return timerId;
    }
}