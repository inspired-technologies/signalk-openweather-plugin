const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const sk = require('../skunits');

const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('skunits toSignalK', () => {
  it('keeps the established conversions', () => {
    assert.deepEqual(sk.toSignalK('%', 50), { value: 0.5, units: 'ratio' });
    assert.ok(close(sk.toSignalK('°C', 10).value, 283.15));
    assert.ok(close(sk.toSignalK('°F', 50).value, 283.15));
    assert.ok(close(sk.toSignalK('kmh', 36).value, 10));
    assert.ok(close(sk.toSignalK('kn', 1.943844).value, 1));
    assert.ok(close(sk.toSignalK('°', 180).value, Math.PI));
    assert.deepEqual(sk.toSignalK('hPa', 1013), { value: 101300, units: 'Pa' });
    assert.deepEqual(sk.toSignalK('nm', 1), { value: 1852, units: 'm' });
    assert.deepEqual(sk.toSignalK('unixdate', 0), { value: '1970-01-01T00:00:00.000Z', units: '' });
    assert.deepEqual(sk.toSignalK('geoJson', [10.5, 54.5]), { value: { latitude: 54.5, longitude: 10.5 }, units: '' });
    assert.deepEqual(sk.toSignalK('mm/h', '7'), { value: 7, units: 'mm/h' });
  });

  it('keeps missing values missing but still returns the units', () => {
    assert.deepEqual(sk.toSignalK('%', null), { value: null, units: 'ratio' });
    assert.deepEqual(sk.toSignalK('°C', undefined), { value: null, units: 'K' });
    assert.deepEqual(sk.toSignalK('hPa', NaN), { value: null, units: 'Pa' });
    assert.deepEqual(sk.toSignalK('unixdate', null), { value: null, units: '' });
    assert.deepEqual(sk.toSignalK('geoJson', null), { value: null, units: '' });
    assert.deepEqual(sk.toSignalK('unixdate', 'n/a'), { value: null, units: '' });
  });

  it('keeps text values instead of NaN', () => {
    assert.deepEqual(sk.toSignalK('', 'Rain'), { value: 'Rain', units: '' });
  });

  it('converts Beaufort', () => {
    assert.ok(close(sk.toSignalK('Bft', 4).value, 0.836 * 8));
    assert.deepEqual(sk.toSignalK('BftMin', 4), { value: 5.5, units: 'm/s' });
    assert.deepEqual(sk.toSignalK('BftMax', 4), { value: 8.0, units: 'm/s' });
    assert.equal(sk.toSignalK('BftMin', 4.5).value, null);
  });

  it('converts additional source units', () => {
    assert.ok(close(sk.toSignalK('km/h', 36).value, 10));
    assert.ok(close(sk.toSignalK('mph', 2.23693629).value, 1));
    assert.ok(close(sk.toSignalK('m/s', 3).value, 3));
    assert.ok(close(sk.toSignalK('cm', 7).value, 0.07));
    assert.ok(close(sk.toSignalK('ft', 1).value, 0.3048));
    assert.ok(close(sk.toSignalK('mi', 1).value, 1609.344));
    assert.ok(close(sk.toSignalK('kPa', 101.325).value, 101325));
    assert.ok(close(sk.toSignalK('inHg', 29.92).value, 101320.76, 0.1));
    assert.deepEqual(sk.toSignalK('l', 100), { value: 0.1, units: 'm3' });
    assert.deepEqual(sk.toSignalK('rpm', 3000), { value: 50, units: 'Hz' });
    assert.deepEqual(sk.toSignalK('Ah', 100), { value: 360000, units: 'C' });
    assert.deepEqual(sk.toSignalK('kWh', 1), { value: 3600000, units: 'J' });
    assert.deepEqual(sk.toSignalK('h', 2), { value: 7200, units: 's' });
    assert.deepEqual(sk.toSignalK('unixtime', 0), { value: '1970-01-01T00:00:00.000Z', units: '' });
  });
});

describe('skunits toTarget', () => {
  it('keeps the established conversions', () => {
    assert.deepEqual(sk.toTarget('ratio', 0.5), { value: 50, units: '' });
    assert.deepEqual(sk.toTarget('K', 283.15, '°C', 1), { value: 10, units: '°C' });
    assert.deepEqual(sk.toTarget('m/s', 10, 'kn', 2), { value: 19.44, units: 'kn' });
    assert.deepEqual(sk.toTarget('Pa', 101300, 'hPa'), { value: 1013, units: 'hPa' });
    assert.deepEqual(sk.toTarget('m', 1852, 'nm'), { value: 1, units: 'nm' });
    assert.deepEqual(sk.toTarget('s', 7200, 'h'), { value: 2, units: 'h' });
    assert.deepEqual(sk.toTarget('pos', { latitude: 54.5, longitude: 10.5 }, 'geoJson'), { value: [10.5, 54.5], units: 'geoJson' });
  });

  it('converts to Beaufort (was NaN)', () => {
    assert.deepEqual(sk.toTarget('m/s', 10, 'Bft'), { value: 5, units: 'Bft' });
    assert.equal(sk.toBeaufort(0), 0);
    assert.equal(sk.toBeaufort(5), 3);
    assert.equal(sk.toBeaufort(40), 12);
    // round trip within the scale
    for (let bft = 0; bft <= 12; bft++) assert.equal(sk.toBeaufort(sk.fromBeaufort(bft)), bft);
  });

  it('returns the value unchanged for the SignalK unit or an unknown target', () => {
    assert.deepEqual(sk.toTarget('K', 280, 'K'), { value: 280, units: 'K' });
    assert.deepEqual(sk.toTarget('rad', 1, 'rad'), { value: 1, units: 'rad' });
    assert.deepEqual(sk.toTarget('K', 280, 'kn'), { value: 280, units: 'K' });
  });

  it('keeps missing values missing', () => {
    assert.deepEqual(sk.toTarget('K', null, '°C'), { value: null, units: '°C' });
    assert.deepEqual(sk.toTarget('ratio', undefined, '%'), { value: null, units: '%' });
    assert.deepEqual(sk.toTarget('m/s', null, 'Bft'), { value: null, units: 'Bft' });
  });

  it('converts to targets for use on land', () => {
    assert.deepEqual(sk.toTarget('m/s', 10, 'km/h'), { value: 36, units: 'km/h' });
    assert.deepEqual(sk.toTarget('m/s', 10, 'mph', 1), { value: 22.4, units: 'mph' });
    assert.deepEqual(sk.toTarget('m', 1609.344, 'mi'), { value: 1, units: 'mi' });
    assert.deepEqual(sk.toTarget('m', 0.3048, 'ft', 3), { value: 1, units: 'ft' });
    assert.deepEqual(sk.toTarget('Pa', 101325, 'kPa'), { value: 101.325, units: 'kPa' });
    assert.deepEqual(sk.toTarget('Pa', 101325, 'inHg', 2), { value: 29.92, units: 'inHg' });
    assert.deepEqual(sk.toTarget('m3', 0.1, 'l'), { value: 100, units: 'l' });
    assert.deepEqual(sk.toTarget('Hz', 50, 'rpm'), { value: 3000, units: 'rpm' });
    assert.deepEqual(sk.toTarget('C', 360000, 'Ah'), { value: 100, units: 'Ah' });
    assert.deepEqual(sk.toTarget('J', 3600000, 'kWh'), { value: 1, units: 'kWh' });
  });

  it('accepts positions on the equator and the prime meridian', () => {
    assert.deepEqual(sk.toTarget('pos', { latitude: 0, longitude: 0 }, 'latLng'), { value: [0, 0], units: 'latLng' });
  });

  it('evaluates and caches {fct} expressions, 0 is a valid result', () => {
    assert.deepEqual(sk.toTarget('{fct}', { a: 2, b: 2 }, 'o.a - o.b'), { value: 0, units: '' });
    assert.deepEqual(sk.toTarget('{fct}', { a: 3, b: 1 }, 'o.a - o.b'), { value: 2, units: '' });
    assert.deepEqual(sk.toTarget('{fct}', {}, 'o.missing'), { value: null, units: '' });
  });
});
