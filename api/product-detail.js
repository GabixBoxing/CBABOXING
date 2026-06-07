// api/product-detail.js — CJ Product Variants
// Returns all colors, sizes, prices for a product

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) return res.status(500).json({ error: 'NO_KEY' });

  const { pid } = req.query;
  if (!pid) return res.status(400).json({ error: 'pid required' });

  const CBA_MARGIN = 1.40;

  try {
    // Auth
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({apiKey:CJ_API_KEY}) }
    );
    const authJson = await authRes.json();
    if (!authJson.data?.accessToken) return res.status(500).json({ error: 'AUTH_FAILED' });
    const TOKEN = authJson.data.accessToken;

    // Get product variants
    const r = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/variant/query?pid=${pid}`,
      { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
    );
    const d = await r.json();

    if (!d.data) return res.status(200).json({ variants: [], error: 'NO_DATA' });

    // Parse variants into colors + sizes
    const variants = (d.data.variants || d.data || []).map(v => {
      const cost = parseFloat(v.variantSellPrice || v.sellPrice || 0);
      return {
        vid: v.vid,
        sku: v.variantSku || '',
        color: v.variantName1 || v.color || '',
        size: v.variantName2 || v.size || '',
        price: parseFloat((cost * CBA_MARGIN).toFixed(2)),
        costPrice: cost,
        stock: v.variantStock || 999,
        image: v.variantImage || ''
      };
    }).filter(v => v.price > 0);

    // Extract unique colors and sizes
    const colors = [...new Set(variants.map(v => v.color).filter(Boolean))];
    const sizes = [...new Set(variants.map(v => v.size).filter(Boolean))];

    return res.status(200).json({ variants, colors, sizes, total: variants.length });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
};
