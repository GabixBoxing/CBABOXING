// api/products.js — CBA Global Store v3
// Con logging detallado para diagnosticar CJ

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
    // ── PASO 1: AUTENTICACIÓN ──
    // CJ acepta el key completo: CJ2455419@api@TOKEN
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY })
      }
    );

    const authJson = await authRes.json();
    console.log('CJ Auth response:', JSON.stringify(authJson).substring(0, 300));

    if (!authJson.data?.accessToken) {
      // Intento 2: solo el token después del último @
      const parts = CJ_API_KEY.split('@');
      const tokenOnly = parts[parts.length - 1];
      console.log('Trying token only:', tokenOnly.substring(0, 8) + '...');

      const auth2 = await fetch(
        'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: tokenOnly })
        }
      );
      const auth2Json = await auth2.json();
      console.log('CJ Auth2 response:', JSON.stringify(auth2Json).substring(0, 300));

      if (!auth2Json.data?.accessToken) {
        return res.status(200).json({
          products: [],
          fallback: true,
          reason: 'CJ_AUTH_FAILED',
          cjMessage: authJson.message || authJson.msg || 'unknown'
        });
      }
      // Use token from second attempt
      var TOKEN = auth2Json.data.accessToken;
    } else {
      var TOKEN = authJson.data.accessToken;
    }

    // ── PASO 2: BÚSQUEDA ──
    const url = `https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=${parseInt(limit)*2}&productNameEn=${encodeURIComponent(search)}`;
    const searchRes = await fetch(url, {
      headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' }
    });

    const searchJson = await searchRes.json();
    console.log('CJ Search total:', searchJson.data?.total, 'list count:', searchJson.data?.list?.length);

    if (!searchJson.data?.list?.length) {
      return res.status(200).json({
        products: [],
        fallback: true,
        reason: 'NO_PRODUCTS',
        cjTotal: searchJson.data?.total || 0
      });
    }

    // ── PASO 3: FILTRAR + MARGEN 40% ──
    const products = searchJson.data.list
      .filter(p => p.productStatus === 'CONNECTABLE')
      .map(p => {
        const cost = parseFloat(p.productSku?.[0]?.sellPrice || 0);
        return {
          id: p.pid,
          name: p.productNameEn || p.productNameCn || 'Product',
          image: p.productImage || '',
          category: p.categoryName || 'General',
          costPrice: cost,
          cbaPrice: parseFloat((cost * CBA_MARGIN).toFixed(2)),
          shippingTime: p.deliveryTime || '7-15 days',
          stars: 5
        };
      })
      .filter(p => p.costPrice > 0)
      .slice(0, parseInt(limit));

    return res.status(200).json({ products, total: products.length, fallback: false });

  } catch (error) {
    console.error('CJ Error:', error.message);
    return res.status(200).json({ products: [], fallback: true, reason: error.message });
  }
};
