module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) return res.status(200).json({ error: 'NO_KEY' });

  try {
    // Auth
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({apiKey:CJ_API_KEY}) }
    );
    const authJson = await authRes.json();
    if (!authJson.data?.accessToken) {
      return res.status(200).json({ authFailed: true, message: authJson.message });
    }
    const TOKEN = authJson.data.accessToken;

    // Search products
    const searchRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=10&productNameEn=boxing',
      { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
    );
    const searchJson = await searchRes.json();

    return res.status(200).json({
      auth: 'SUCCESS',
      searchResult: searchJson.result,
      searchMessage: searchJson.message,
      total: searchJson.data?.total || 0,
      listCount: searchJson.data?.list?.length || 0,
      firstProduct: searchJson.data?.list?.[0] ? {
        name: searchJson.data.list[0].productNameEn,
        status: searchJson.data.list[0].productStatus,
        price: searchJson.data.list[0].productSku?.[0]?.sellPrice
      } : null
    });
  } catch(e) {
    return res.status(200).json({ error: e.message });
  }
};