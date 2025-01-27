
# signalk-openweather-plugin

SignalK Plugin to inject forecast data from __[OpenWeather](https://openweathermap.org/)__ public weather service

## Install & Use

*Note: To use this plugin you need to request an apikey, ie. APPID on http://openweathermap.org/appid and start!*
*Please also note* that the plugin uses __[V3.0 OneCall](https://home.openweathermap.org/subscriptions/unauth_subscribe/onecall_30/base)__ which requires payment information within your OWM subscription but is stated as **FREE** for at least 1000 API calls per day. Furthermore an individual limit can be set to not exceed the number of calls per day.

Install the plugin through the SignalK plugin interface. After installation you may want to 'Activate' it through the SignalK Plugin Config interface and enter your pre-requested API key.

The plugin will inject several new SignalK-values, such as:

`environment.forecast.time.*`

`environment.forecast.temperature.*`

`environment.forecast.relativeHumidity`

`environment.forecast.pressure`

`environment.forecast.wind.*`

`environment.forecast.weather.*`

Forecast data is purely based on position - hence `navigation.position` needs to be present. Data will be queried on position change and/or regularily on an hourly-basis. `navigation.gnss.antennaAltitude` (GPS altitude) is required if operated on non-sealevel altitude to compensate atmospheric pressure data to the appropriate elevation. Plugins like *signalk-fixedstation* could be used and the plugin will make calculations by adjusting the pressure accordingly. Default is altitude = 0 (sea level). It may take the plugin a couple of minutes before showing output data, as it will need to collect position information before requesting data from openweathermap.

By default the plugin will update forecast information every hour. No information will be stored or tracked.
*Note: Alerts from openweathermap.org currently not implemented as based on `environment.outside.pressure` like provided by RuuviTag. Severities could be more accurate and it's possible to set an alarm, i.e. via the *Simple Notification-plugin*.

## Details on input data

Output format is based on openweathermaps v3.0 OneCall API - the plugin publishes either a limited (small) set of data
```
{ 
    temp: 277.99,
    humidity: 0.86,
    pressure: 93666.52473007084,
    description: 'overcast clouds',
    rain: 4,
    weathercode: 804 
}
```

or the full OWM output computed as
```
{ 
  environment: { 
      sunlight: { 
        times: {
          sunrise: "2021-03-31T04:53:45.000Z",
          sunset: "2021-03-31T17:41:35.000Z"
        }
      } 
    },
  outside: {
      temperature: 293.76,
      pressure: 101000,
      relativeHumidity: 70,
      weather: 'Clouds',
      wind: { speed: 1.31, direction: 5.096361415823442, gust: 1.37 },
      description: 'broken clouds'
    },
  forecast: {
    pressure: 101000,
    temperature: { outside: 283.92, feelslike: 284.52, dewpoint: 276.95, minimum: 280.3, maximum: 285.2 },
    relativeHumidity: 69,
    precipitation: { probability: 0, rain: 0.26, snow: 3.8 },
    wind: { speed: 1.47, direction: 6.178465552059927, gust: 0.76 },
    weather: { main: 'Clouds', {
      code: 804, 
      icon: '04n' 
      uvindex: 0,
      clouds: 100,
      visibility: 10000,
    },
    description: 'broken clouds'
  }
}
```
  
The plugin adheres to meta-data units according to the SignalK definition. The off-set for forecast data can be configured between 1 and 48 hours. The horizon parameter allows for adjusting the computation of aggregated measure likewise temperature minimum / maximum.

### Release Notes

- v0.5: Comply with the SignalK spec by providing timestamps according to RFC3339.
- v0.6: Support value timeouts according to the SignalK spec.
- v0.7: Feature (PR#5): Option to publish 0h offset forecast as current underneith `environment.outside.*`.
- v0.7: Refactored (PR#6): Interval-based data push
- v0.8: Package updates
- v0.9: Re-factored due to [#9](https://github.com/inspired-technologies/signalk-openweather-plugin/issues/9) OWM v2.5 depcreated.
- v1.0: Minor fixes, released to v1
