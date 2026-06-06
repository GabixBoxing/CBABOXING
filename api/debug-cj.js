// api/debug-cj.js — TEMPORARY DIAGNOSTIC
// DELETE after fixing CJ issue

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const CJ_API_KEY = process.env.CJ_API_KEY;
  
  if (!CJ_API_KEY) {
    return res.status(200).json({ error: 'NO CJ_API_KEY in Vercel' });
  }

  try {
    // Test 1: Full key
    const r1 = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY })
      }
    );
    const j1 = await r1.json();

    // Test 2: Token only (after last @)
    const parts = CJ_API_KEY.split('@');
    const tokenOnly = parts[parts.length - 1];
    const r2 = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: tokenOnly })
      }
    );
    const j2 = await r2.json();

    return res.status(200).json({
      keyLength: CJ_API_KEY.length,
      keyPreview: CJ_API_KEY.substring(0, 12) + '...',
      test1_fullKey: {
        result: j1.result,
        message: j1.message || j1.msg,
        hasToken: !!j1.data?.accessToken
      },
      test2_tokenOnly: {
        tokenPreview: tokenOnly.substring(0, 8) + '...',
        result: j2.result,
        message: j2.message || j2.msg,
        hasToken: !!j2.data?.accessToken
      }
    });
  } catch(e) {
    return res.status(200).json({ error: e.message });
  }
};
