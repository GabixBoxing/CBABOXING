// Deploy: 2026-06-07 00:35:43 UTC
// v2: 2026-06-07 00:27:46
// api/checkout.js — Stripe Checkout Session
// Cliente compra → Stripe cobra → CBA guarda 40%
// CommonJS para Vercel

const CBA_MARGIN = 0.40;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { productName, costPrice, quantity = 1, image } = req.body || {};
  if (!productName || !costPrice) {
    return res.status(400).json({ error: 'Missing product info' });
  }

  // REGLA 40% CBA
  // costPrice = lo que CJ cobra a CBA
  // cbaPrice  = lo que el cliente paga
  // profit    = lo que CBA se queda
  const cbaPrice = parseFloat((costPrice * (1 + CBA_MARGIN)).toFixed(2));
  const unitAmountCents = Math.round(cbaPrice * 100);

  try {
    // Crear Stripe Checkout Session (página de pago alojada por Stripe)
    const body = new URLSearchParams({
      'mode': 'payment',
      'success_url': 'https://cbagym.com?payment=success',
      'cancel_url': 'https://cbagym.com?payment=cancelled',
      'line_items[0][price_data][currency]': 'usd',
      'line_items[0][price_data][product_data][name]': productName,
      'line_items[0][price_data][unit_amount]': String(unitAmountCents),
      'line_items[0][quantity]': String(quantity),
      'metadata[product]': productName,
      'metadata[cost_price]': String(costPrice),
      'metadata[cba_price]': String(cbaPrice),
      'metadata[cba_profit]': String(parseFloat((cbaPrice - costPrice).toFixed(2))),
      'metadata[margin]': '40%',
    });

    if (image) {
      body.append('line_items[0][price_data][product_data][images][0]', image);
    }

    const stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: body.toString()
    });

    const session = await stripeRes.json();

    if (session.error) {
      throw new Error(session.error.message);
    }

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
      amount: cbaPrice,
      profit: parseFloat((cbaPrice - costPrice).toFixed(2))
    });

  } catch (error) {
    console.error('Stripe error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
