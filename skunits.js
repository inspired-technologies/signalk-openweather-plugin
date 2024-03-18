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
function toSignalK(units, value) {
    let skUnits
    if ( units === '%' ) {
        value = value / 100
        skUnits = 'ratio'
    } else if ( units === '°C' || units === 'deg' ) {
        value = value + 273.15
        skUnits = 'K'
    } else if ( units === '°F' ) {
        value = (value - 32) * (5/9) + 273.15
        skUnits = 'K'    
    } else if ( units === 'kmh' ) {
        value = value / 3.6
        skUnits = "m/s"
    } else if ( units === 'm s-1' ) {
        value = value * 1.0
        skUnits = "m/s"
    } else if ( units === 'kn' ) {
        value = value / 1.943844
        skUnits = "m/s"
    } else if ( units.includes('Bft') ) {
        value = fromBeaufort(value, (units==='BftMin' ? 'min' : units==='BftMax' ? 'max' : ''))
        skUnits = "m/s"
    } else if ( units === '°' || units === 'degrees' ) {
        value = value * (Math.PI/180.0)
        skUnits = 'rad'
    } else if ( units === 'Pa' ) {
        value = value * 1.0
        skUnits = "Pa"
    } else if ( units === 'hPa' || units=== 'mbar' ) {
        value = value * 100
        skUnits = "Pa"
    } else if ( units === 'km' ) {
        value = value * 1000
        skUnits = "m"
    } else if ( units === 'nm' ) {
        value = value * 1852
        skUnits = "m"
    } else if ( units === 'm' ) {
        value = value * 1.0
        skUnits = "m"
    } else if ( units === 'mm' ) {
        value = value * 1.0
        skUnits = "mm"
    } else if ( units === 'J kg-1' ) {
        value = value * 1.0
        skUnits = "J/kg"
    } else if ( units === 'kg m-2 s-1' ) {
        value = value * 1.0
        skUnits = "mm/s"
    } else if ( units === 'unixdate' ) {
        value = new Date(value * 1000).toISOString()
        skUnits = ""
    } else if ( units === 'geoJson' ) {
        value = { latitude: value[1], longitude: value[0] }
        skUnits = ""
    } else if ( units === 'latLng' ) {
        value = { latitude: value[0], longitude: value[1] }
        skUnits = ""
    }
    return { value: value, units: skUnits }
}

// converts from SignalK-Units
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
    } else if ( skunit === 'ratio' && ( target===undefined || target==='%' ) ) {
        value = value * 100.0
        unit = target===undefined ? '' : '%'
    } else if ( skunit === 'ratio' && ( target==='decimal' || target==='number' ) ) {
        value = value * 1.0
        unit = ''
    } else if ( skunit === 'K' && (target===undefined) ) {
        value = value
        unit = 'K'
    } else if ( skunit === 'K' && (target==="°C" || target==="deg") ) {
        value = value - 273.15
        unit = target
    } else if ( skunit === 'K' && (target==='°F') ) {
        value = (value - 273.15) * (9/5) + 32
        unit = target
    } else if ( skunit === 'm/s' && (target==='undefined') ) {
        unit = "m/s"
    } else if ( skunit === 'm/s' && (target==='kn') ) {
        value = value * 1.943844
        unit = target
    } else if ( skunit === 'm/s' && (target==='km') ) {
        value = value * 3.6
        unit = target
    } else if ( skunit === 'm/s' && (target==='kn') ) {
        value = value * 1.943844
        unit = target
    } else if ( skunit === 'm/s' && (target==='Bft') ) {
        value = toBeaufort(value)
        unit = target
    } else if ( skunit ==='rad' && (target === '°' || target==='deg' || target==='') ) {
        value = value * (180.0/Math.PI)
        unit = '°'
    } else if ( skunit === 'Pa' && (target===undefined) ) {
        unit = 'Pa'
    } else if ( skunit === 'Pa' && (target==='hPa' || target==='mbar' ) ) {
        value = value / 100
        unit = target
    } else if ( skunit === 'Pa' && (target ==='atm') ) {
        value = value / 101325
        unit = target        
    } else if ( skunit === 'm' && (target ==='m' || target === undefined) ) {
        value = value * 1.0
        unit = 'm'
    } else if ( skunit === 'm' && target === 'km' ) {
        value = value / 1000
        unit = 'km'
    } else if ( skunit === 'm' && target === 'nm' ) {
        value = value / 1852
        unit ='nm'
    } else if ( skunit === 'dt' && (target === 'ms' || target === 'unixdate' )) {
        value = (new Date(value).getTime())
        unit ='ms'
    } else if ( skunit === 'dt' && target === 's' ) {
        value = (new Date(value).getTime())/1000
        unit ='s'
    } else if ( skunit === '{obj}' && target!==undefined && value.hasOwnProperty(target) ) {
        unit = value[target].hasOwnProperty('unit') ? value[target].unit : ''
        value = value[target].hasOwnProperty('value') ? value[target].value : value[target]
    } else {
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

module.exports = {
    toBeaufort,
    fromBeaufort,
    toSeaLevel,
    toStationAltitude,
    toDegreesMinutesAndSeconds,
    toSignalK,
    toTarget
}