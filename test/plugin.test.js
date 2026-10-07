const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const pluginFactory = require('../index');

// Minimal stand-in for the SignalK server app object. Every member used by
// index.js has to be present, otherwise the plugin fails at startup.
function createApp() {
  const app = {
    deltas: [],
    status: [],
    errors: [],
    unsubscribed: 0,
    debug: () => {},
    error: (msg) => app.errors.push(msg),
    setPluginStatus: (msg) => app.status.push(msg),
    setPluginError: (msg) => app.errors.push(msg),
    getSelfPath: () => undefined,
    handleMessage: (id, delta) => app.deltas.push(delta),
    subscriptionmanager: {
      subscribe: (subscription, unsubscribes) => {
        unsubscribes.push(() => {
          app.unsubscribed += 1;
        });
      },
    },
  };
  return app;
}

describe('plugin', () => {
  it('has required interface', () => {
    const plugin = pluginFactory(createApp());
    assert.equal(typeof plugin.start, 'function');
    assert.equal(typeof plugin.stop, 'function');
    assert.ok(plugin.id);
    assert.ok(plugin.schema);
  });

  it('reports an error and stops cleanly without an api key', (t) => {
    const app = createApp();
    const plugin = pluginFactory(app);
    t.after(() => plugin.stop());

    plugin.start({}, () => {});

    assert.ok(app.errors.some((e) => /API Key/i.test(e)));
    assert.deepEqual(app.deltas, []);

    plugin.stop();
    assert.equal(app.unsubscribed, 1);
  });

  it('starts with an api key, publishes meta and stops cleanly', (t) => {
    const app = createApp();
    const plugin = pluginFactory(app);
    t.after(() => plugin.stop());

    plugin.start({ apikey: 'test-api-key', type: 'simple', horizon: 24, offset: 1 }, () => {});

    assert.deepEqual(app.errors, []);
    assert.equal(app.deltas.length, 1);
    const meta = app.deltas[0].updates[0].meta;
    assert.ok(Array.isArray(meta) && meta.length > 0);
    assert.ok(meta.every((m) => typeof m.path === 'string' && m.value));

    plugin.stop();
    assert.equal(app.unsubscribed, 1);
  });
});