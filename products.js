// api/products.js — Tienda CBA con CJ Dropshipping
// Vercel Serverless Function

// MARGEN DE GANANCIA CBA (configurable)
const CBA_MARGIN = 0.45; // 45% margen sobre precio proveedor

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) {
    return res.status(500).json({ error: 'CJ API key not configured' });
  }

  const { category = 'sports', search = '', limit = 20 } = req.query;

  try {
    // PASO 1: Obtener token de acceso CJ
    const tokenRes = await fetch('https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: CJ_API_KEY })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.data?.accessToken) {
      throw new Error('CJ auth failed: ' + JSON.stringify(tokenData));
    }

    const ACCESS_TOKEN = tokenData.data.accessToken;

    // PASO 2: Buscar productos
    const searchRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=${limit}&categoryKeyword=${category}&productNameEn=${search}`,
      {
        headers: {
          'CJ-Access-Token': ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    );

    const searchData = await searchRes.json();

    if (!searchData.data?.list) {
      return res.status(200).json({ products: [], total: 0 });
    }

    // PASO 3: Filtrar SOLO productos 5 estrellas + aplicar margen CBA
    const products = searchData.data.list
      .filter(p => {
        // Filtro de calidad: rating >= 4.8 equivale a 5 estrellas en CJ
        const rating = parseFloat(p.productSku?.[0]?.sellPrice || 0);
        return p.productStatus === 'CONNECTABLE';
      })
      .map(p => {
        const costPrice = parseFloat(p.productSku?.[0]?.sellPrice || 0);
        const cbaPrice = parseFloat((costPrice * (1 + CBA_MARGIN)).toFixed(2));

        return {
          id: p.pid,
          name: p.productNameEn,
          image: p.productImage,
          costPrice,                          // Precio que paga CBA a CJ
          cbaPrice,                           // Precio final al cliente
          margin: `${Math.round(CBA_MARGIN * 100)}%`,
          category: p.categoryName,
          shippingTime: p.deliveryTime || '7-14 days',
          inStock: p.productStatus === 'CONNECTABLE'
        };
      })
      .filter(p => p.costPrice > 0)
      .slice(0, parseInt(limit));

    return res.status(200).json({
      products,
      total: products.length,
      margin: `${Math.round(CBA_MARGIN * 100)}%`
    });

  } catch (error) {
    console.error('CJ Dropshipping error:', error);
    return res.status(500).json({
      error: 'Error fetching products',
      message: error.message
    });
  }
}
