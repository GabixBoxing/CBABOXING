// api/cj-order.js — CJ Dropshipping Order Creator
// Se ejecuta cuando el cliente paga con Stripe
// Envía a Agencia Miami → datos Cuba van en el campo remark
// CommonJS para Vercel

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) {
    return res.status(500).json({ error: 'CJ_API_KEY not configured' });
  }

  const {
    // Producto
    productId,
    productName,
    variantId,
    quantity = 1,

    // Casillero del cliente en Miami
    casilleroNumber,
    clientName,

    // Datos destino Cuba (para el remark / etiqueta)
    cubaName,
    cubaAddress,
    cubaCity,
    cubaPhone,

    // Referencia del pago Stripe
    stripeSessionId
  } = req.body || {};

  if (!productId || !casilleroNumber || !cubaName) {
    return res.status(400).json({
      error: 'Missing required fields: productId, casilleroNumber, cubaName'
    });
  }

  // ═══════════════════════════════════════════════
  // DIRECCIÓN DE LA AGENCIA EN MIAMI
  // ⚠️ EDITAR AQUÍ con la dirección real de tu agencia
  // ═══════════════════════════════════════════════
  const MIAMI_AGENCY = {
    name: process.env.MIAMI_AGENCY_NAME || 'CBA Cargo Miami',
    addressLine1: process.env.MIAMI_ADDRESS_LINE1 || 'TU DIRECCIÓN MIAMI AQUÍ',
    addressLine2: `Casillero ${casilleroNumber} - ${clientName || 'Cliente'}`,
    city: 'Miami',
    state: 'FL',
    zip: process.env.MIAMI_ZIP || '33172',
    country: 'US',
    phone: process.env.MIAMI_PHONE || '3055550000'
  };

  // ═══════════════════════════════════════════════
  // DATOS CUBA → VAN EN EL CAMPO remark
  // Se imprimen en la etiqueta física del paquete
  // ═══════════════════════════════════════════════
  const cubaRemark = [
    'DESTINO FINAL: CUBA',
    `NOMBRE: ${cubaName}`,
    `DIRECCIÓN: ${cubaAddress}`,
    `CIUDAD: ${cubaCity || 'Cuba'}`,
    `TEL: ${cubaPhone}`,
    `CASILLERO: ${casilleroNumber}`,
    `REF PAGO: ${stripeSessionId || 'N/A'}`
  ].join(' | ');

  try {
    // STEP 1: Get CJ token
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY })
      }
    );
    const authData = await authRes.json();
    if (!authData.data?.accessToken) throw new Error('CJ auth failed');
    const TOKEN = authData.data.accessToken;

    // STEP 2: Create CJ order
    // Ship to Miami agency, remark contains Cuba data
    const orderPayload = {
      orderNumber: `CBA-${Date.now()}`,
      shippingZip: MIAMI_AGENCY.zip,
      shippingCountry: MIAMI_AGENCY.country,
      shippingCountryCode: 'US',
      shippingProvince: MIAMI_AGENCY.state,
      shippingCity: MIAMI_AGENCY.city,
      shippingAddress: MIAMI_AGENCY.addressLine1,
      shippingAddress2: MIAMI_AGENCY.addressLine2,
      shippingCustomerName: MIAMI_AGENCY.name,
      shippingPhone: MIAMI_AGENCY.phone,
      remark: cubaRemark,      // ← DATOS CUBA AQUÍ
      products: [
        {
          vid: variantId || productId,
          quantity: parseInt(quantity)
        }
      ]
    };

    const orderRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrder',
      {
        method: 'POST',
        headers: {
          'CJ-Access-Token': TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderPayload)
      }
    );

    const orderData = await orderRes.json();

    if (orderData.result === false) {
      throw new Error(orderData.message || 'CJ order creation failed');
    }

    return res.status(200).json({
      success: true,
      orderId: orderData.data?.orderId,
      orderNumber: orderData.data?.orderNum,
      shippingTo: `${MIAMI_AGENCY.name} — Casillero ${casilleroNumber}`,
      cubaDestination: `${cubaName}, ${cubaCity}`,
      message: `Pedido creado. Envío a ${MIAMI_AGENCY.name}. Datos Cuba incluidos en etiqueta.`
    });

  } catch (error) {
    console.error('CJ Order Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
