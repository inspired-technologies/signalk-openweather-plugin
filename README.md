# signalk-openweather-plugin
SignalK Plugin to inject forecast data from <a href="https://openweathermap.org/">OpenWeather</a> public weather service

## Install & Use
Note: To use this plugin you need to request an apikey, ie. APPID on http://openweathermap.org/appid and start!
Install the plugin through the SignalK plugin interface. After installation you may want to 'Activate' it through the SignalK Plugin Config interface and enter your pre-requested apikey.<br>The plugin will inject several new SignalK-values, such as:<br>
<p>
<code>'environment.forecast.temperature'<br><br>
'environment.forecast.humidity'<br><br>
'environment.forecast.pressure'<br><br></code><br>
</p>
<p>Forecast data is purely based on position - hence <code>'navigation.position'</code> needs to be present. Data will be queried on position change and/or regularily on an hourly-basis (triggered by signalk-raspberry-pi-temperature-plugin). <code>'navigation.gnss.antennaAltitude'</code> (GPS altitude) is required if operated on non-sealevel altitude to compensate atmospheric pressure data to the appropriate elevation. Plugins like signalk-fixedstation could be used and the plugin will make calculations by adjusting the pressure accordingly. Default is altitude = 0 (sea level).It will take the plugin a few minutes before showing output data, as it will need to collect position information before requesting data from openweathermap.</p><br> 
By default the plugin will update forecast information every hour. No information will be stored or tracked.<br>
Note: Alerts from openweathermap.org currently not implemented as based on <code>'environment.outside.pressure'</code> like provided by RuuviTag. Severities could be more accurate and it's possible to set an alarm, i.e. via the Simple Notification-plugin.<br>

## Details on input data
<p>Simple output format is based on openweather-apis SMART JSON<br>
<code> 
{ 
    temp: 277.99,
    humidity: 0.86,
    pressure: 93666.52473007084,
    description: 'overcast clouds',
    rain: {},
    weathercode: 804 
} 
</code><br>but full output will be created using requiring through openweathermaps onecall API considering the hourly offset entered<br>
<code>
  { 
  forecast:
  { 
    time: "2021-03-31T23:00:00.000Z",
    sunrise: "2021-03-31T04:53:45.000Z",
    sunset: "2021-03-31T17:41:35.000Z",
    main: 'Clouds',
    icon: '04n' 
  },
  simple:
  { 
    temp: 278.3,
    humidity: 0.91,
    pressure: 93117.90832440622,
    description: 'overcast clouds',
    rain: { '1h': 0.26 },
    weathercode: 804 
  },
  full:
  { 
    temp: { min: 277.18, max: 281.45 },
    feelslike: 274.52,
    dewpoint: 276.95,
    uvindex: 0,
    clouds: 100,
    visibility: 10000,
    wind: { speed: 3.47, dir: 4.665 } 
  }
  </code></p>
  
The plugin shall adhere to meta-data units according to the SignalK definition.
### Release Notes
- v0.5: Comply with the SignalK spec by providing timestamps according to RFC3339.
- v0.6: Support value timeouts according to the SignalK spec