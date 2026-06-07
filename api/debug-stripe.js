module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const key = process.env.STRIPE_SECRET_KEY || 'NOT_SET';
  const pub = process.env.STRIPE_PUBLISHABLE_KEY || 'NOT_SET';
  return res.status(200).json({
    secret_key_set: key !== 'NOT_SET',
    secret_key_starts: key.substring(0, 8),
    secret_key_length: key.length,
    publishable_key_set: pub !== 'NOT_SET',
    publishable_key_starts: pub.substring(0, 8),
    is_correct: key.startsWith('sk_live_') || key.startsWith('sk_test_')
  });
};