// api/products.js — CBA Store v7
// Filtro inteligente + Pakistán/Japón + POD ready

const CBA_MARGIN = 1.40;
const CBA_POD_PRODUCTS = []; // Agregar PIDs de productos CBA personalizados aquí

// Palabras que SI deben aparecer (deportes/fitness relevantes)
const VALID_TERMS = [
  'boxing','punching','mma','kickbox','martial','fitness','gym','workout',
  'dumbbell','barbell','weight','resistance','yoga','exercise','training',
  'sport','athletic','running','jump rope','protein','supplement',
  'bag sport','water bottle','shoes sport','shorts sport',
  'mirror','tv','television','phone','watch','shoe','shirt','pants',
  'dress','jacket','bag','kitchen','home','tool','toy','beauty','skincare'
];

// Palabras que NO deben aparecer nunca
const BANNED_TERMS = [
  'cock ring','sex','adult','erotic','dildo','vibrator','fetish',
  'lace sexy','seductive','intimate','bdsm','lingerie erotic',
  'pest','rat trap','mosquito','insect kill','roach'
];

// Preferencia por Pakistán (boxeo) y Japón (calidad premium)
const PREFERRED_COUNTRIES = ['PK', 'JP']; // Pakistan, Japan

const ES_EN = {
  'guantes de boxeo':'boxing gloves','guantes boxeo':'boxing gloves',
  'guantes':'boxing gloves','casco boxeo':'boxing headgear',
  'vendas boxeo':'boxing hand wraps','vendas':'hand wraps',
  'saco de boxeo':'punching bag','costal':'punching bag',
  'protector bucal':'mouthguard','botas boxeo':'boxing shoes',
  'short boxeo':'boxing shorts','pesas':'dumbbells weights',
  'mancuernas':'dumbbells','cuerda saltar':'jump rope',
  'colchoneta':'yoga mat','banda elastica':'resistance band',
  'ropa deportiva':'sportswear','ropa gym':'gym clothing',
  'zapatos':'shoes','tenis':'sneakers','camisa':'shirt',
  'pantalon':'pants','vestido':'dress','chaqueta':'jacket',
  'espejo':'mirror','sofa':'sofa','silla':'chair','mesa':'table',
  'televisor':'television','celular':'phone','reloj':'watch',
  'cargador':'charger','audífonos':'earbuds headphones',
  'cocina':'kitchen','olla':'cooking pot','nevera':'refrigerator',
  'mochila':'backpack','bolso':'handbag','perfume':'perfume',
  'crema':'face cream','shampoo':'shampoo','toalla':'towel',
  'juguete':'toy','mascota':'pet','perro':'dog supplies',
  'barato':'affordable','bueno':'quality',
};

function translate(q) {
  const l = q.toLowerCase().trim();
  if (ES_EN[l]) return ES_EN[l];
  for (const [es,en] of Object.entries(ES_EN)) {
    if (l.includes(es)) return en;
  }
  return q;
}

function isValidProduct(name, category) {
  const text = (name + ' ' + category).toLowerCase();
  // Block banned terms
  if (BANNED_TERMS.some(t => text.includes(t))) return false;
  return true;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) return res.status(200).json({ products:[], fallback:true });

  const { search = 'boxing', limit = 20 } = req.query;
  const searchEN = translate(search) || 'boxing fitness';
  const targetLimit = Math.max(parseInt(limit), 20);

  try {
    // AUTH
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({apiKey:CJ_API_KEY}) }
    );
    const authJson = await authRes.json();
    if (!authJson.data?.accessToken) return res.status(200).json({ products:[], fallback:true });
    const TOKEN = authJson.data.accessToken;

    // SEARCH — request 80 to filter down to 20 good ones
    const params = new URLSearchParams({ pageNum:'1', pageSize:'80', productNameEn:searchEN });
    const searchRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?${params}`,
      { headers:{ 'CJ-Access-Token':TOKEN, 'Content-Type':'application/json' } }
    );
    const searchJson = await searchRes.json();
    let list = searchJson.data?.list || [];

    if (list.length === 0) {
      return res.status(200).json({ products:[], fallback:true, reason:'NO_RESULTS' });
    }

    // FILTER + SORT + MARGIN
    let products = list
      .filter(p => isValidProduct(p.productNameEn || '', p.categoryName || ''))
      .map(p => {
        const sku = p.productSku?.[0] || {};
        const cost = parseFloat(sku.sellPrice || sku.price || 0);
        const cbaPrice = parseFloat((cost * CBA_MARGIN).toFixed(2));
        const country = p.supplierCountry || p.countryCode || '';
        const isPreferred = PREFERRED_COUNTRIES.includes(country);

        return {
          id: p.pid,
          name: (p.productNameEn || p.productNameCn || '').substring(0, 80),
          image: p.productImage || '',
          category: p.categoryName || 'General',
          costPrice: cost,
          cbaPrice,
          shippingTime: p.deliveryTime || '7-15 days',
          stars: 5,
          country,
          isPreferred,
          isPOD: false
        };
      })
      .filter(p => p.cbaPrice > 0)
      // Sort: Preferred countries (PK/JP) first
      .sort((a,b) => {
        if (a.isPOD && !b.isPOD) return -1;
        if (!a.isPOD && b.isPOD) return 1;
        if (a.isPreferred && !b.isPreferred) return -1;
        if (!a.isPreferred && b.isPreferred) return 1;
        return 0;
      })
      .slice(0, targetLimit);

    return res.status(200).json({
      products: [...CBA_POD_PRODUCTS, ...products].slice(0, targetLimit),
      total: products.length,
      searchedFor: searchEN,
      margin: '40%',
      fallback: false
    });

  } catch(e) {
    return res.status(200).json({ products:[], fallback:true, reason:e.message });
  }
};