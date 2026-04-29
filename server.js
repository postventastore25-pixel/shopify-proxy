const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static('public'));

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET,
  SHOPIFY_SHOP,
  PORT = 3000
} = process.env;

let accessToken = process.env.SHOPIFY_ACCESS_TOKEN || null;

// ── OAuth: paso 1 — redirige a Shopify
app.get('/auth', (req, res) => {
  const scopes = 'read_orders,read_draft_orders,read_customers';
  const redirectUri = `${req.protocol}://${req.get('host')}/auth/callback`;
  const state = crypto.randomBytes(8).toString('hex');
  const url = `https://${SHOPIFY_SHOP}/admin/oauth/authorize?client_id=${SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  res.redirect(url);
});

// ── OAuth: paso 2 — recibe el code y obtiene el token
app.get('/auth/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const response = await axios.post(`https://${SHOPIFY_SHOP}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET,
      code
    });
    accessToken = response.data.access_token;
    console.log('Token obtenido:', accessToken);
    res.redirect('/?connected=1');
  } catch (e) {
    res.status(500).send('Error obteniendo token: ' + e.message);
  }
});

// ── Proxy: draft orders
app.get('/api/draft_orders', async (req, res) => {
  if (!accessToken) return res.status(401).json({ error: 'No autenticado. Ve a /auth' });
  try {
    const status = req.query.status || 'open';
    const r = await axios.get(
      `https://${SHOPIFY_SHOP}/admin/api/2024-01/draft_orders.json?status=${status}&limit=50`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Proxy: orders pendientes
app.get('/api/orders', async (req, res) => {
  if (!accessToken) return res.status(401).json({ error: 'No autenticado. Ve a /auth' });
  try {
    const r = await axios.get(
      `https://${SHOPIFY_SHOP}/admin/api/2024-01/orders.json?financial_status=pending&status=open&limit=50`,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Estado de conexión
app.get('/api/status', (req, res) => {
  res.json({ connected: !!accessToken, shop: SHOPIFY_SHOP });
});

app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
