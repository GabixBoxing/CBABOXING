
// api/products.js — CBA Global Store
// CJ Dropshipping + 40% margin
// CommonJS para Vercel Node 24

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;

  // Si no hay key configurada → fallback Amazon
  if (!CJ_API_KEY) {
    return res.status(200).json({
      products: [],
      fallback: true,
      reason: 'CJ_API_KEY not set'
    });
  }

  const { search = '', limit = 12 } = req.query;
  const CBA_MARGIN = 1.40;

  try {
    // ── AUTENTICACIÓN CJ ──
    // El key puede tener formato: CJ2455419@api@TOKEN o solo TOKEN
    // CJ API v2.0 acepta el key completo como apiKey
    const authBody = JSON.stringify({ apiKey: CJ_API_KEY });

    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: authBody
      }
    );

    if (!authRes.ok) {
      console.error('CJ Auth HTTP error:', authRes.status);
      return res.status(200).json({ products: [], fallback: true, reason: 'CJ auth HTTP ' + authRes.status });
    }

    const authJson = await authRes.json();

    if (!authJson.data?.accessToken) {
      console.error('CJ Auth failed:', JSON.stringify(authJson).substring(0, 200));
      return res.status(200).json({
        products: [],
        fallback: true,
        reason: 'CJ auth failed: ' + (authJson.message || authJson.msg || 'unknown')
      });
    }

    const TOKEN = authJson.data.accessToken;

    // ── BÚSQUEDA DE PRODUCTOS ──
    const searchParams = new URLSearchParams({
      pageNum: '1',
      pageSize: String(Math.min(parseInt(limit) * 2, 50))
    });
    if (search) searchParams.set('productNameEn', search);

    const searchRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/list?' + searchParams.toString(),
      {
        headers: {
          'CJ-Access-Token': TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const searchJson = await searchRes.json();

    if (!searchJson.data?.list || searchJson.data.list.length === 0) {
      return res.status(200).json({ products: [], fallback: true, reason: 'No products from CJ' });
    }

    // ── FILTRAR + APLICAR MARGEN 40% ──
    const products = searchJson.data.list
      .filter(p => p.productStatus === 'CONNECTABLE')
      .map(p => {
        const costPrice = parseFloat(p.productSku?.[0]?.sellPrice || 0);
        const cbaPrice = parseFloat((costPrice * CBA_MARGIN).toFixed(2));
        return {
          id: p.pid,
          name: p.productNameEn || p.productNameCn || 'Product',
          image: p.productImage || '',
          category: p.categoryName || 'General',
          costPrice,
          cbaPrice,
          shippingTime: p.deliveryTime || '7-15 days',
          stars: 5
        };
      })
      .filter(p => p.costPrice > 0)
      .slice(0, parseInt(limit));

    return res.status(200).json({
      products,
      total: products.length,
      margin: '40%',
      fallback: false
    });

  } catch (error) {
    console.error('CJ products error:', error.message);
    return res.status(200).json({
      products: [],
      fallback: true,
      reason: error.message
    });
  }
};
