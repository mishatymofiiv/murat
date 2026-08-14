const express = require('express');
const router = express.Router();

const NP_API_URL = 'https://api.novaposhta.ua/v2.0/json/';

function hasApiKey() {
  return process.env.NOVA_POSHTA_API_KEY && process.env.NOVA_POSHTA_API_KEY !== 'your_novaposhta_api_key';
}

async function callNovaPoshta(modelName, calledMethod, methodProperties) {
  const res = await fetch(NP_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      apiKey: process.env.NOVA_POSHTA_API_KEY,
      modelName,
      calledMethod,
      methodProperties,
    }),
  });
  return res.json();
}

// GET /api/novaposhta/cities?q=Київ — пошук міста для чекауту
router.get('/cities', async (req, res) => {
  try {
    if (!hasApiKey()) {
      return res.status(503).json({ error: 'Nova Poshta API ще не налаштовано (NOVA_POSHTA_API_KEY у .env)' });
    }
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json([]);

    const data = await callNovaPoshta('Address', 'getCities', { FindByString: q, Limit: '15' });
    if (!data.success) {
      return res.status(502).json({ error: 'Nova Poshta API повернуло помилку', details: data.errors });
    }
    const cities = (data.data || []).map((c) => ({
      ref: c.Ref,
      name: c.Description,
      area: c.AreaDescription,
    }));
    res.json(cities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка звʼязку з Nova Poshta API' });
  }
});

// GET /api/novaposhta/warehouses?cityRef=...&q=... — пошук відділень у обраному місті
router.get('/warehouses', async (req, res) => {
  try {
    if (!hasApiKey()) {
      return res.status(503).json({ error: 'Nova Poshta API ще не налаштовано (NOVA_POSHTA_API_KEY у .env)' });
    }
    const { cityRef, q } = req.query;
    if (!cityRef) return res.status(400).json({ error: 'Параметр cityRef обовʼязковий' });

    const methodProperties = { CityRef: cityRef, Limit: '200', Page: '1' };
    if (q) methodProperties.FindByString = q;

    const data = await callNovaPoshta('AddressGeneral', 'getWarehouses', methodProperties);
    if (!data.success) {
      return res.status(502).json({ error: 'Nova Poshta API повернуло помилку', details: data.errors });
    }
    const warehouses = (data.data || []).map((w) => ({
      ref: w.Ref,
      name: w.Description,
      number: w.Number,
      typeOfWarehouse: w.CategoryOfWarehouse,
    }));
    res.json(warehouses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Помилка звʼязку з Nova Poshta API' });
  }
});

module.exports = router;
