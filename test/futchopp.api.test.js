import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, TEAMS } from '../server/catalog.js';
import { startTestApp, checkoutBody, unit } from './helpers.js';

test('lista de times: 40 times, 20 na Série A e 20 na B, sem repetição', () => {
  assert.equal(TEAMS.length, 40);
  assert.equal(TEAMS.filter((t) => t.serie === 'A').length, 20);
  assert.equal(TEAMS.filter((t) => t.serie === 'B').length, 20);
  assert.equal(new Set(TEAMS.map((t) => t.slug)).size, 40);
  assert.equal(TEAMS[0].slug, 'flamengo'); // ordem "maiores torcidas primeiro" preservada
});

test('catálogo: preços iguais aos da referência (R$ 293,10 / R$ 500,00; 2 un = 1,8x)', () => {
  assert.equal(catalog.product.price, 29310);
  assert.equal(catalog.product.compare_at_price, 50000);
  assert.equal(catalog.product.slug, 'futchopp');
});

test('API rejeita não gravar: time inexistente, série trocada e nome vazio ficam marcados como incompletos', async () => {
  const t = await startTestApp();
  try {
    for (const bad of [unit({ team: 'time-fantasma', teamName: 'Time Fantasma' }), unit({ serie: 'B' }), unit({ name: '' })]) {
      const r = await t.post('/api/public/create-payment', checkoutBody({ units: [bad] }));
      assert.equal(r.status, 200, r.text);
      const o = t.orders.getOrder(r.json.orderId);
      assert.equal(o.personalization_complete, false);
      assert.equal(o.units[0].complete, false);
    }
  } finally {
    await t.close();
  }
});

test('nome personalizado: maiúsculas e máximo de 20 caracteres, como no campo do site', async () => {
  const t = await startTestApp();
  try {
    const r = await t.post('/api/public/create-payment', checkoutBody({ units: [unit({ name: 'maria eduarda de souza lima' })] }));
    const o = t.orders.getOrder(r.json.orderId);
    assert.equal(o.units[0].custom_name, 'MARIA EDUARDA DE SOU');
    assert.equal(o.units[0].custom_name.length, 20);
  } finally {
    await t.close();
  }
});

test('2 unidades: cada uma com o próprio time/série/nome, na ordem', async () => {
  const t = await startTestApp();
  try {
    const r = await t.post('/api/public/create-payment', checkoutBody({ units: [unit({ name: 'PAI' }), unit({ serie: 'B', team: 'sport', teamName: 'Sport', name: 'FILHO' })] }));
    const o = t.orders.getOrder(r.json.orderId);
    assert.deepEqual(o.units.map((u) => `${u.team}/${u.serie}/${u.custom_name}`), ['flamengo/A/PAI', 'sport/B/FILHO']);
    assert.equal(o.personalization_complete, true);
  } finally {
    await t.close();
  }
});

test('reserva: sem objeto estruturado, a API reconstrói pelo texto "Unidade N: Time (Série X) • Nome: Y"', async () => {
  const t = await startTestApp();
  try {
    const body = checkoutBody({ units: [unit()] });
    delete body.items[0].personalization;
    const r = await t.post('/api/public/create-payment', body);
    const o = t.orders.getOrder(r.json.orderId);
    assert.equal(o.units[0].team, 'flamengo');
    assert.ok(o.warnings.some((w) => /reconstruída/.test(w)));
  } finally {
    await t.close();
  }
});
