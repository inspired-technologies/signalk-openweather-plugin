/*
    conversions-module - specifically for SignalK & Barograph
    reqired by OpenWeather Map | Squid Sailing Forecasting modules
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

// return windspeed in m/s
function fromBeaufort(value, calc) {
    if (typeof value==='string')
        value = Number(value)
    if (calc===undefined || (calc!=='min' && calc!=='max')) {
        return 0.8360 * Math.pow(value, 3/2)
    } else if (value>=0 && value <=12) {
        return calc=='min' ? BEAUFORT_SCALE[value].min : calc=='max' ? BEAUFORT_SCALE[value].max : null; 
    } else
        return null;
}

function toBeaufort (value) {
    return Math.round(Math.pow(value / 0.8360), 2/3)
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
            value = value / 3.6
            skUnit = "m/s"
            break;
        case 'm s-1':
            value = value * 1.0
            skUnit = "m/s"
            break;
        case 'kn':
            value = value / 1.943844
            skUnit = "m/s"
            break;
        case unit.includes('Bft'):
            value = fromBeaufort(value, (unit==='BftMin' ? 'min' : unit==='BftMax' ? 'max' : ''))
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
        case 'km':
            value = value * 1000
            skUnit = "m"
            break;
        case 'nm':
            value = value * 1852
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
            value = new Date(value * 1000).toISOString()
            skUnit = ""   
            break;
        case 'geoJson':
            value = { latitude: value[1], longitude: value[0] }
            skUnit = ""   
            break;
        case 'latLng':
            value = { latitude: value[0], longitude: value[1] }
            skUnit = ""    
            break;
        default:
            value = value * 1.0
            skUnit = unit
        break;                                      
    }
    return { value: value, units: skUnit }
}

// converts to Target as specified
function toTarget(skunit, value, target, precision) {
    let unit
    if ( target==='geoJson' || target==='latLng' ) {
        let geo = []
        if (value.longitude && value.latitude && target==='geoJson') {
            geo.push(typeof precision==='number' ? value.longitude.toFixed(precision) : value.longitude)    
            geo.push(typeof precision==='number' ? value.latitude.toFixed(precision) : value.latitude)
            if (value.altitude) geo.push(value.altitude) 
            value = geo
        } else if (value.longitude && value.latitude && target==='latLng') {
            geo.push(typeof precision==='number' ? value.latitude.toFixed(precision) : value.latitude)
            geo.push(typeof precision==='number' ? value.longitude.toFixed(precision) : value.longitude)    
            if (value.altitude) geo.push(value.altitude) 
            value = geo
        }   
        else
            value = null
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
                } else if (target==='km') {
                    value = value * 3.6
                    unit = target
                } else if (target==='kn') {
                    value = value * 1.943844
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
                if (target === 'ms' || target === 'unixdate' ) {
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
            default:
                unit = skunit
                break;
        }
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

module.exports = {
    toBeaufort,
    fromBeaufort,
    toSeaLevel,
    toStationAltitude,
    toDegreesMinutesAndSeconds,
    toSignalK,
    toTarget
}