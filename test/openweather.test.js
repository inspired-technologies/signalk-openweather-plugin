const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// axios is replaced before the plugin loads it - no network, no api key required
let respond = null;
require.cache[require.resolve('axios')] = { exports: (config) => respond(config) };

const pluginFactory = require('../index');
const convert = require('../skunits');

const POSITION = { latitude: 54.5, longitude: 10.5 };

function createApp() {
  const app = {
    deltas: [], status: [], errors: [],
    error: (msg) => app.errors.push(msg),
    setPluginStatus: (msg) => app.status.push(msg),
    setPluginError: (msg) => app.errors.push(msg),
    getSelfPath: () => undefined,
    handleMessage: (id, delta) => app.deltas.push(delta),
    subscriptionmanager: { subscribe: () => {} },
  };
  return app;
}

function oneCallResponse() {
  const now = Math.floor(Date.now() / 1000);
  const weather = [{ id: 500, main: 'Rain', description: 'light rain', icon: '10d' }];
  const hour = (i) => ({
    dt: now + i * 3600, temp: 283.15, feels_like: 281, pressure: 1013, humidity: 80, dew_point: 279,
    uvi: 1, clouds: 75, visibility: 9000, wind_speed: 6, wind_deg: 180, wind_gust: 9, weather, pop: 0.4,
  });
  return {
    data: {
      lat: POSITION.latitude, lon: POSITION.longitude, timezone: 'Europe/Berlin',
      current: Object.assign(hour(0), { sunrise: now - 3600, sunset: now + 3600 }),
      hourly: Array.from({ length: 48 }, (_, i) => hour(i)),
    },
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));
const valuesOf = (delta) => Object.fromEntries(delta.updates[0].values.map((v) => [v.path, v.value]));

describe('openweather', () => {
  it('does not duplicate meta after a restart', () => {
    const app = createApp();
    const plugin = pluginFactory(app);
    plugin.start({ apikey: 'key', type: 'full', current: true });
    plugin.stop();
    plugin.start({ apikey: 'key', type: 'full', current: true });
    plugin.stop();

    const [first, second] = app.deltas.map((d) => d.updates[0].meta.map((m) => m.path));
    assert.deepEqual(second, first);
    assert.equal(new Set(second).size, second.length);
    assert.ok(second.includes('environment.outside.weather.visibility'));
    assert.ok(!second.some((p) => p.includes('visbility')));
  });

  it('publishes current and forecast pressure at station elevation', async () => {
    respond = async () => oneCallResponse();
    const app = createApp();
    const plugin = pluginFactory(app);
    const ow = require('../openweather');
    plugin.start({ apikey: 'key', type: 'full', current: true });
    ow.onDeltasUpdate({ updates: [{ values: [{ path: 'navigation.gnss.antennaAltitude', value: 100 }] }] });
    ow.onDeltasUpdate({ updates: [{ values: [{ path: 'navigation.position', value: POSITION }] }] });
    await settle();
    plugin.stop();

    const values = valuesOf(app.deltas.at(-1));
    const station = convert.toStationAltitude(1013, 100, 283.15) * 100;
    assert.ok(station < 101300);
    assert.ok(Math.abs(values['environment.outside.pressure'] - station) < 1);
    assert.ok(Math.abs(values['environment.forecast.pressure'] - station) < 1);
    assert.equal(values['environment.outside.weather.visibility'], 9000);
    assert.deepEqual(app.errors, []);
  });

  it('reports an unreachable service once and recovers', async () => {
    const offline = Object.assign(new Error('getaddrinfo ENOTFOUND api.openweathermap.org'), { code: 'ENOTFOUND' });
    respond = async () => { throw offline; };
    const app = createApp();
    const plugin = pluginFactory(app);
    const ow = require('../openweather');
    const attempt = async () => {
      plugin.start({ apikey: 'key' });   // a (re)start allows an immediate request
      ow.onDeltasUpdate({ updates: [{ values: [{ path: 'navigation.position', value: POSITION }] }] });
      await settle();
      plugin.stop();
    };
    await attempt();
    await attempt();
    assert.deepEqual(app.errors, ['OpenWeather unreachable: ENOTFOUND']); // once, not per attempt

    respond = async () => oneCallResponse();
    await attempt();
    assert.equal(app.errors.length, 1);
    assert.match(app.status.at(-1), /Forecast Position/);
  });
});
