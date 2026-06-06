// api/products.js — CBA Global Store v4 FIXED
// Auth confirmed working — filter relaxed

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) {
    return res.status(200).json({ products: [], fallback: true, reason: 'NO_KEY' });
  }

  const { search = 'boxing', limit = 12 } = req.query;
  const CBA_MARGIN = 1.40;

  try {
    // AUTH
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY })
      }
    );
    const authJson = await authRes.json();
    if (!authJson.data?.accessToken) {
      return res.status(200).json({ products: [], fallback: true, reason: 'AUTH_FAILED' });
    }
    const TOKEN = authJson.data.accessToken;

    // SEARCH
    const searchRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=30&productNameEn=${encodeURIComponent(search)}`,
      { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
    );
    const searchJson = await searchRes.json();

    if (!searchJson.data?.list?.length) {
      return res.status(200).json({ products: [], fallback: true, reason: 'NO_RESULTS' });
    }

    // FILTER + MARGIN — relaxed filter, include all valid products
    const products = searchJson.data.list
      .map(p => {
        // Try multiple price fields
        const sku = p.productSku?.[0] || p.variants?.[0] || {};
        const cost = parseFloat(
          sku.sellPrice || sku.price || p.sellPrice || p.price || 0
        );
        const cbaPrice = parseFloat((cost * CBA_MARGIN).toFixed(2));

        // Clean English name — remove non-latin chars if needed
        const name = (p.productNameEn || p.productNameCn || 'Product').substring(0, 80);

        return {
          id: p.pid,
          name,
          image: p.productImage || '',
          category: p.categoryName || 'General',
          costPrice: cost,
          cbaPrice,
          shippingTime: p.deliveryTime || '7-15 days',
          status: p.productStatus || 'AVAILABLE',
          stars: 5
        };
      })
      // Only skip products with no price at all
      .filter(p => p.cbaPrice > 0)
      .slice(0, parseInt(limit));

    return res.status(200).json({
      products,
      total: products.length,
      margin: '40%',
      fallback: false
    });

  } catch (error) {
    return res.status(200).json({ products: [], fallback: true, reason: error.message });
  }
};
