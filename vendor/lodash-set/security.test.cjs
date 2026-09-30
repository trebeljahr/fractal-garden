const assert = require('node:assert/strict');
const test = require('node:test');
const { createRequire } = require('node:module');
const method = createRequire(require.resolve('react-dat-gui'))('lodash.set');

test('nested property behavior remains compatible', () => {
  const target = {};
  assert.equal(method(target, 'camera.position.x', 3), target);
  assert.deepEqual(target, { camera: { position: { x: 3 } } });
});

test('untrusted paths cannot modify Object.prototype', () => {
  for (const path of ['__proto__.polluted', 'constructor.prototype.polluted']) {
    method({}, path, 'unsafe');
    assert.equal({}.polluted, undefined);
  }
});
