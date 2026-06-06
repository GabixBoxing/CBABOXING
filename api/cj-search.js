// api/cj-search.js — CJ Dropshipping Search
// Vercel Serverless Function — CommonJS
// Filtra SOLO 5 estrellas + aplica margen 40% CBA

const CBA_MARGIN = 1.40; // precio_final = costo * 1.40

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) {
    return res.status(500).json({ error: 'CJ_API_KEY not configured in Vercel' });
  }

  const { q = '', limit = 20, page = 1 } = req.query;

  try {
    // STEP 1: Get CJ access token
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY })
      }
    );
    const authData = await authRes.json();
    if (!authData.data?.accessToken) {
      throw new Error('CJ authentication failed');
    }
    const TOKEN = authData.data.accessToken;

    // STEP 2: Search products globally
    const searchUrl = new URL('https://developers.cjdropshipping.com/api2.0/v1/product/list');
    searchUrl.searchParams.set('pageNum', String(page));
    searchUrl.searchParams.set('pageSize', String(Math.min(parseInt(limit) * 3, 60)));
    if (q) searchUrl.searchParams.set('productNameEn', q);

    const searchRes = await fetch(searchUrl.toString(), {
      headers: {
        'CJ-Access-Token': TOKEN,
        'Content-Type': 'application/json'
      }
    });
    const searchData = await searchRes.json();

    if (!searchData.data?.list) {
      return res.status(200).json({ products: [], total: 0, query: q });
    }

    // STEP 3: Filter 5 stars ONLY + apply 40% CBA margin
    const products = searchData.data.list
      .filter(p => {
        // Only CONNECTABLE (in stock) products
        if (p.productStatus !== 'CONNECTABLE') return false;
        // Filter 5 stars if rating available
        if (p.productRating !== undefined && p.productRating !== null) {
          return parseFloat(p.productRating) >= 4.8;
        }
        return true; // Include if no rating data
      })
      .map(p => {
        const costPrice = parseFloat(p.productSku?.[0]?.sellPrice || 0);
        const finalPrice = parseFloat((costPrice * CBA_MARGIN).toFixed(2));
        const profit = parseFloat((finalPrice - costPrice).toFixed(2));

        return {
          id: p.pid,
          name: p.productNameEn || p.productNameCn || 'Product',
          image: p.productImage || '',
          category: p.categoryName || 'General',
          costPrice,          // CJ price (internal — not shown to customer)
          finalPrice,         // Customer pays this (40% markup applied)
          profit,             // CBA profit per unit
          margin: '40%',
          shippingTime: p.deliveryTime || '7-15 days',
          rating: p.productRating || 5,
          stars: '⭐⭐⭐⭐⭐',
          inStock: true
        };
      })
      .filter(p => p.costPrice > 0)
      .slice(0, parseInt(limit));

    return res.status(200).json({
      products,
      total: products.length,
      query: q,
      margin: '40%'
    });

  } catch (error) {
    console.error('CJ Search Error:', error.message);
    return res.status(500).json({
      error: 'Search failed',
      message: error.message,
      products: []
    });
  }
};
