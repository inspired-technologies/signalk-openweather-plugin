/*
    conversions-module - specifically for SignalK Barograph, Dashboard & Logbook Apps
    also required by OpenWeather Map | Open-Meteo | Squid Sailing Forecasting modules

    2026-11 - interface unchanged, additive and corrective only:
    - missing values (null, undefined, NaN) stay null instead of 0 / 1970-01-01, units are still returned;
      invalid dates return null instead of throwing
    - Beaufort: 'Bft' / 'BftMin' / 'BftMax' are converted in toSignalK, toBeaufort fixed (was NaN)
    - toSignalK: additional source units (km/h, mph, cm, ft, mi, kPa, inHg, mmHg, psi, l, gal, rpm, Ah, Wh, kWh, h, min, unixtime)
    - toTarget: additional targets for use on land (km/h, mph, ft, mi, cm, mm, kPa, inHg, mmHg, psi, l, gal, rpm, Ah, Wh, kWh),
      target equal to the SignalK unit returns the value unchanged, unknown targets keep the SignalK unit
    - toTarget '{fct}': plain Map cache instead of an md5 hash, results of 0 no longer turn into null
    - toTarget geoJson / latLng: positions on the equator or the prime meridian (0) are valid
*/

// Beaufort Wind Scale
const BEAUFORT_SCALE = [
    { bft: 0, min: 0.0, max: 0.3 },
    { bft: 1, min: 0.3, max: 1.6 },
    { bft: 2, min: 1.6, max: 3.4 },
    { bft: 3, min: 3.4, max: 5.5 },
    { bft: 4, min: 5.5, max: 8.0 },
    { bft: 5, min: 8.0, max: 10.8 },
    { bft: 6, min: 10.8, max: 13.9 },
    { bft: 7, min: 13.9, max: 17.2 },
    { bft: 8, min: 17.2, max: 20.8 },
    { bft: 9, min: 20.8, max: 24.5 },
    { bft: 10, min: 24.5, max: 28.5 },
    { bft: 11, min: 28.5, max: 32.7 },
    { bft: 12, min: 32.7, max: 99.9 },
];

function isMissing(value) {
    return value === null || value === undefined || (typeof value === 'number' && Number.isNaN(value))
}

// return windspeed in m/s
function fromBeaufort(value, calc) {
    if (typeof value==='string')
        value = Number(value)
    if (isMissing(value) || value < 0)
        return null
    if (calc===undefined || (calc!=='min' && calc!=='max')) {
        return 0.8360 * Math.pow(value, 3/2)
    } else if (Number.isInteger(value) && value>=0 && value <=12) {
        return calc=='min' ? BEAUFORT_SCALE[value].min : BEAUFORT_SCALE[value].max
    } else
        return null;
}

// return Beaufort force (0-12) for a windspeed in m/s
function toBeaufort (value) {
    if (isMissing(value))
        return null
    return Math.min(12, Math.round(Math.pow(Math.max(value, 0) / 0.8360, 2/3)))
}

// returns Pressure at Station based on Pressure at SeaLevel, Elevation (m) and Temperature (K) at Station
// return pressure * Math.exp(-elevation / (temperature*29.263));
// see also: https://keisan.casio.com/exec/system/1224579725
function toStationAltitude (pressure, elevation, temperature) {
    return pressure * Math.pow(1-(0.0065*elevation/(temperature+0.0065*elevation)), 5.257)
}

// returns Pressure at SeaLevel based on Pressure at Station, Elevation (m) and Temperature (K) at Station
// return pressure / Math.exp(-elevation / (temperature*29.263));
// see also: https://keisan.casio.com/exec/system/1224575267
function toSeaLevel (pressure, elevation, temperature) {
    return pressure * Math.pow(1-(0.0065*elevation/(temperature+0.0065*elevation)), -1.0*5.257)
}

// converts to SignalK-Units
function toSignalK(unit, value) {
    if (isMissing(value))
        return { value: null, units: toSignalK(unit, 0).units }
    if (typeof unit==='string' && unit.includes('Bft'))
        return { value: fromBeaufort(value, (unit==='BftMin' ? 'min' : unit==='BftMax' ? 'max' : undefined)), units: 'm/s' }
    let skUnit
    switch (unit)
    {
        case '%':
            value = value / 100
            skUnit = 'ratio'
            break;
        case '°C':
        case 'deg':
            value = value + 273.15
            skUnit = 'K'
            break;
        case '°F':
            value = (value - 32) * (5/9) + 273.15
            skUnit = 'K'
            break;
        case 'kmh':
        case 'km/h':
            value = value / 3.6
            skUnit = "m/s"
            break;
        case 'm s-1':
        case 'm/s':
            value = value * 1.0
            skUnit = "m/s"
            break;
        case 'kn':
            value = value / 1.943844
            skUnit = "m/s"
            break;
        case 'mh':
        case 'mph':
            value = value / 2.23693629
            skUnit = "m/s"
            break;
        case '°':
        case 'degrees':
            value = value * (Math.PI/180.0)
            skUnit = 'rad'
            break;
        case 'Pa':
            value = value * 1.0
            skUnit = "Pa"
            break;
        case 'hPa':
        case 'mbar':
            value = value * 100
            skUnit = "Pa"
            break;
        case 'kPa':
            value = value * 1000
            skUnit = "Pa"
            break;
        case 'inHg':
            value = value * 3386.389
            skUnit = "Pa"
            break;
        case 'mmHg':
            value = value * 133.322387
            skUnit = "Pa"
            break;
        case 'psi':
            value = value * 6894.757
            skUnit = "Pa"
            break;
        case 'km':
            value = value * 1000
            skUnit = "m"
            break;
        case 'nm':
            value = value * 1852
            skUnit = "m"
            break;
        case 'mi':
            value = value * 1609.344
            skUnit = "m"
            break;
        case 'ft':
            value = value * 0.3048
            skUnit = "m"
            break;
        case 'cm':
            value = value / 100
            skUnit = "m"
            break;
        case 'm':
            value = value * 1.0
            skUnit = "m"
            break;
        case 'mm':
            value = value * 1.0
            skUnit = "mm"
            break;
        case 'l':
            value = value / 1000
            skUnit = "m3"
            break;
        case 'gal':
            value = value * 0.003785411784
            skUnit = "m3"
            break;
        case 'rpm':
            value = value / 60
            skUnit = "Hz"
            break;
        case 'Ah':
            value = value * 3600
            skUnit = "C"
            break;
        case 'Wh':
            value = value * 3600
            skUnit = "J"
            break;
        case 'kWh':
            value = value * 3600000
            skUnit = "J"
            break;
        case 'h':
            value = value * 3600
            skUnit = "s"
            break;
        case 'min':
            value = value * 60
            skUnit = "s"
            break;
        case 'J kg-1':
            value = value * 1.0
            skUnit = "J/kg"
            break;
        case 'kg m-2 s-1':
            value = value * 1.0
            skUnit = "mm/s"
            break;
        case 'string':
            value = value
            skUnit = ""
            break;
        case 'unixdate':
        case 'unixtime': {
            const date = new Date(value * 1000)
            value = Number.isNaN(date.getTime()) ? null : date.toISOString()
            skUnit = ""
            break;
        }
        case 'geoJson':
            value = { latitude: value[1], longitude: value[0] }
            skUnit = ""
            break;
        case 'latLng':
            value = { latitude: value[0], longitude: value[1] }
            skUnit = ""
            break;
        default:
            // numbers as before - text (e.g. a description) is kept instead of becoming NaN
            value = typeof value==='string' && (value.trim()==='' || Number.isNaN(Number(value))) ? value : value * 1.0
            skUnit = unit
        break;
    }
    return { value: value, units: skUnit }
}

// additional targets per SignalK unit - inverse of the toSignalK conversions
const TARGETS = {
    'm/s': { 'km/h': v => v * 3.6, 'mph': v => v * 2.23693629 },
    'Pa': { 'kPa': v => v / 1000, 'inHg': v => v / 3386.389, 'mmHg': v => v / 133.322387, 'psi': v => v / 6894.757 },
    'm': { 'mi': v => v / 1609.344, 'ft': v => v / 0.3048, 'cm': v => v * 100, 'mm': v => v * 1000 },
    'm3': { 'l': v => v * 1000, 'gal': v => v / 0.003785411784 },
    'Hz': { 'rpm': v => v * 60 },
    'C': { 'Ah': v => v / 3600 },
    'J': { 'Wh': v => v / 3600, 'kWh': v => v / 3600000 },
}
// pseudo units which are no physical units - keep their previous behaviour
const NON_UNITS = ['dt', '{obj}', '{fct}']

const cachedFunctions = new Map()
// converts to Target as specified
function toTarget(skunit, value, target, precision) {
    if (isMissing(value)) {
        const units = target==='geoJson' || target==='latLng' ? target
            : skunit==='{fct}' || skunit==='{obj}' ? '' : toTarget(skunit, 0, target).units
        return { value: null, units: units }
    }
    let unit
    if ( target==='geoJson' || target==='latLng' ) {
        let geo = []
        if (typeof value.longitude==='number' && typeof value.latitude==='number' && target==='geoJson') {
            geo.push(typeof precision==='number' ? value.longitude.toFixed(precision) : value.longitude)
            geo.push(typeof precision==='number' ? value.latitude.toFixed(precision) : value.latitude)
            if (value.altitude) geo.push(value.altitude)
            value = geo
        } else if (typeof value.longitude==='number' && typeof value.latitude==='number' && target==='latLng') {
            geo.push(typeof precision==='number' ? value.latitude.toFixed(precision) : value.latitude)
            geo.push(typeof precision==='number' ? value.longitude.toFixed(precision) : value.longitude)
            if (value.altitude) geo.push(value.altitude)
            value = geo
        }
        else
            value = null
        unit = target
    } else if (target && target===skunit && !NON_UNITS.includes(skunit)) {
        unit = skunit
    } else if (target && TARGETS[skunit] && TARGETS[skunit][target]!==undefined) {
        value = TARGETS[skunit][target](value)
        unit = target
    } else {
        switch (skunit)
        {
            case 'ratio':
                if (!target || target==='%') {
                    value = value * 100.0
                    unit = target===undefined ? '' : '%'
                } else if (target==='decimal' || target==='number') {
                    value = value * 1.0
                    unit = ''
                }
                break;
            case 'K':
                if (!target) {
                    value = value
                    unit = 'K'
                } else if (target==="°C" || target==="deg") {
                    value = value - 273.15
                    unit = target
                } else if (target==='°F') {
                    value = (value - 273.15) * (9/5) + 32
                    unit = target
                }
                break;
            case 'm/s':
                if (!target) {
                    unit = "m/s"
                } else if (target==='kn') {
                    value = value * 1.943844
                    unit = target
                } else if (target==='kmh') {
                    value = value * 3.6
                    unit = target
                } else if (target==='mh') {
                    value = value * 2.23693629
                    unit = target
                } else if (target==='Bft') {
                    value = toBeaufort(value)
                    unit = target
                }
                break;
            case 'rad':
                if (!target || target==='°' || target==='deg' || target==='') {
                    value = value * (180.0/Math.PI)
                    unit = '°'
                }
                break;
            case 'Pa':
                if (!target) {
                    unit = 'Pa'
                } else if (target==='hPa' || target==='mbar') {
                    value = value / 100
                    unit = target
                } else if (target ==='atm') {
                    value = value / 101325
                    unit = target
                }
                break;
            case 'm':
                if (!target || target === 'm') {
                    value = value * 1.0
                    unit = 'm'
                } else if (target === 'km') {
                    value = value / 1000
                    unit = 'km'
                } else if (target === 'nm') {
                    value = value / 1852
                    unit ='nm'
                }
                break;
            case 'dt':
                if (target === 'influx' || target === 'time' ) { // influx standard
                    value = (new Date(value).getTime())*1000*1000
                    unit ='ns'
                } else if (target === 'ms' || target === 'unixdate' ) {
                    value = (new Date(value).getTime())
                    unit ='ms'
                } else if (target === 's' ) {
                    value = (new Date(value).getTime())/1000
                    unit ='s'
                }
                break;
            case 's':
                if (target === 'ms' ) {
                    value = value * 1000
                    unit ='ms'
                }
                else if (target === 's' || target === 'sec' )
                    unit = target
                else if (target === 'm' || target === 'min' ) {
                    value = value / 60
                    unit = target
                } else if (target === 'h' || target === 'hour' ) {
                    value = value / 3600
                    unit = target
                } else if (target === 'd' || target === 'day' ) {
                    value = value / 3600 / 24
                    unit = target
                }
            break;
            case '{obj}':
                if (target && value.hasOwnProperty(target) ) {
                    unit = value[target].hasOwnProperty('unit') ? value[target].unit : ''
                    value = value[target].hasOwnProperty('value') ? value[target].value : value[target]
                }
                break;
            case '{fct}': {
                // target is an expression on 'o' from the app configuration (trusted input only)
                let fct = cachedFunctions.get(target)
                if (!fct) {
                    fct = new Function('o', `return ${target}`)
                    cachedFunctions.set(target, fct)
                }
                const res = fct(value)
                value = res || res === 0 ? res : null
                unit = ''
                break;
            }
            default:
                unit = skunit
                break;
        }
        // unknown target: value unchanged, keep the SignalK unit
        if (unit === undefined && !NON_UNITS.includes(skunit))
            unit = skunit
    }
    if (typeof value==='number' && target!=='geoJson' && target!=='latLng' && typeof precision==='number')
        value = parseFloat(value.toFixed(precision))
    return { value: value, units: unit }
}

function toDegreesMinutesAndSeconds(coordinate) {
    var absolute = Math.abs(coordinate);
    var degrees = Math.floor(absolute);
    var minutesNotTruncated = (absolute - degrees) * 60;
    var minutes = Math.floor(minutesNotTruncated);
    var seconds = Math.floor((minutesNotTruncated - minutes) * 60);
    return degrees + "\°" + minutes + "\'" + seconds +"\"";
  }

function toDMS (lat, lng) {
  return `${toDegreesMinutesAndSeconds(lat)}${lat >= 0 ? "N" : "S"} : ${toDegreesMinutesAndSeconds(lng)}${lng >= 0 ? "E" : "W"}`;
}

module.exports = {
    toBeaufort,
    fromBeaufort,
    toSeaLevel,
    toStationAltitude,
    toDegreesMinutesAndSeconds,
    toDMS,
    toSignalK,
    toTarget
}
