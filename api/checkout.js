// api/checkout.js — Stripe Checkout v2
const CBA_MARGIN = 1.40;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) return res.status(500).json({ error: 'Stripe not configured' });

  const { productName, costPrice, quantity = 1, image } = req.body || {};
  if (!productName || !costPrice) {
    return res.status(400).json({ error: 'Missing productName or costPrice' });
  }

  const cbaPrice = parseFloat((parseFloat(costPrice) * CBA_MARGIN).toFixed(2));
  const unitCents = Math.round(cbaPrice * 100);

  if (unitCents < 50) {
    return res.status(400).json({ error: 'Price too low (minimum $0.50)' });
  }

  try {
    const params = new URLSearchParams({
      'mode': 'payment',
      'success_url': 'https://cbagym.com?payment=success',
      'cancel_url': 'https://cbagym.com?payment=cancelled',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': productName.substring(0, 100),
      'line_items[0][price_data][unit_amount]': String(unitCents),
      'line_items[0][quantity]': String(parseInt(quantity)),
      'metadata[product]': productName.substring(0, 100),
      'metadata[cost]': String(costPrice),
      'metadata[cba_price]': String(cbaPrice),
      'metadata[margin]': '40%',
    });

    if (image) params.append('line_items[0][price_data][product_data][images][0]', image);

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const session = await stripeRes.json();
    if (session.error) throw new Error(session.error.message);

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      amount: cbaPrice,
      profit: parseFloat((cbaPrice - parseFloat(costPrice)).toFixed(2))
    });

  } catch(e) {
    console.error('Stripe error:', e.message);
    return res.status(500).json({ error: e.message });
  }
};