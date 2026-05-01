const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({limit: '10mb'}));
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.get('/api/draft_orders', async (req, res) => {
  const token = req.headers['x-shopify-token'];
  const shop = req.headers['x-shopify-shop'];
  if (!token || !shop) return res.status(401).json({ error: 'Falta token o tienda' });
  try {
    const status = req.query.status || 'open';
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/draft_orders.json?status=${status}&limit=50`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message, details: e.response?.data });
  }
});

app.get('/api/orders', async (req, res) => {
  const token = req.headers['x-shopify-token'];
  const shop = req.headers['x-shopify-shop'];
  if (!token || !shop) return res.status(401).json({ error: 'Falta token o tienda' });
  try {
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/orders.json?financial_status=pending&status=open&limit=50`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message, details: e.response?.data });
  }
});

app.get('/api/verify', async (req, res) => {
  const token = req.headers['x-shopify-token'];
  const shop = req.headers['x-shopify-shop'];
  if (!token || !shop) return res.status(401).json({ error: 'Falta token o tienda' });
  try {
    const r = await axios.get(
      `https://${shop}/admin/api/2024-01/shop.json`,
      { headers: { 'X-Shopify-Access-Token': token } }
    );
    res.json({ ok: true, name: r.data.shop.name });
  } catch (e) {
    res.status(401).json({ ok: false, error: 'Token inválido' });
  }
});

app.post('/api/claude', async (req, res) => {
  try {
    const r = await axios.post('https://api.anthropic.com/v1/messages', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': process.env.ANTHROPIC_API_KEY
      }
    });
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
