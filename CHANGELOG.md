# Changelog

## [1.2.2]
### Fix
- Restart no longer publishes the meta data of every path twice.
- Current pressure (`environment.outside.pressure`) is adjusted to station elevation like the forecast - it was converted to sea level a second time.
- Path `environment.outside.weather.visbility` renamed to `environment.outside.weather.visibility` - please update dashboards using the old path.
- Request timeout of 20 s; an unreachable service (offline at sea) is reported once and recovers with the next refresh.
- Logging via the `openweather-signalk` debug log only.
- skunits update: missing values stay missing instead of 0, Beaufort conversions, additional units.

## [1.2]
- Test added
- Package updates

## [1.1]
### Feature
- Today's Min & Max temp value published

## [1.0]
- Release v1

## [0.9]
- Re-factored due to [#9](https://github.com/inspired-technologies/signalk-openweather-plugin/issues/9) OWM v2.5 depcreated.

## [0.8]
- Package updates

## [0.7]
### Feature PR#5
- Option to publish 0h offset forecast as current underneith `environment.outside.*`.
### Refactored PR#6
- Interval-based data push

## [0.6]
- Support value timeouts according to the SignalK spec.

## [0.5]
- Comply with the SignalK spec by providing timestamps according to RFC3339.
