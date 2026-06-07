// api/products.js — CBA Global Store v6
// Filtro: boxeo/fitness por defecto + búsqueda global
// POD (Print on Demand) ready para productos CBA personalizados

// ═══ POD PRODUCTS — Agrega los PIDs de tus productos CBA aquí ═══
// Cuando tengas productos con tu marca en CJ, agrega sus IDs:
// const CBA_POD_PRODUCTS = ['pid_001', 'pid_002', 'pid_003'];
const CBA_POD_PRODUCTS = []; // Lista vacía por ahora — llenar cuando tengas POD

// ═══ CATEGORÍAS DEPORTIVAS PRIORITARIAS ═══
const SPORTS_KEYWORDS = [
  'boxing', 'gloves', 'punching bag', 'jump rope', 'wraps', 'mouthguard',
  'headgear', 'fitness', 'gym', 'workout', 'dumbbells', 'weights', 'barbell',
  'resistance band', 'yoga mat', 'sports', 'athletic', 'training', 'exercise',
  'boxing shoes', 'sports bag', 'protein', 'supplement', 'running shoes',
  'shorts', 'compression', 'knee pad', 'ankle support', 'speed bag'
];

// ═══ TRADUCCIÓN ES → EN ═══
const ES_EN = {
  // Boxeo y artes marciales
  'guantes':'boxing gloves','guantes de boxeo':'boxing gloves',
  'casco de boxeo':'boxing headgear','casco boxeo':'boxing headgear',
  'vendas':'hand wraps boxing','vendas de boxeo':'boxing hand wraps',
  'saco de boxeo':'punching bag','costal':'punching bag',
  'protector bucal':'mouthguard','botas de boxeo':'boxing shoes',
  'short de boxeo':'boxing shorts','uniforme boxeo':'boxing uniform',
  'guantes mma':'mma gloves','kick boxing':'kickboxing gear',
  // Fitness y gym
  'pesas':'dumbbells weights','mancuernas':'dumbbells',
  'barra':'barbell','disco de pesas':'weight plate',
  'cuerda saltar':'jump rope','soguilla':'jump rope',
  'colchoneta':'yoga mat exercise mat','bandas elasticas':'resistance bands',
  'banda elastica':'resistance band','liga elastica':'resistance band',
  'ropa gym':'gym clothing','ropa deportiva':'sportswear',
  'zapatos deportivos':'sports shoes','tenis':'sneakers athletic',
  'short deportivo':'sports shorts','camiseta deportiva':'sports shirt',
  'leggins':'leggings sports','malla':'leggings',
  'guantes gym':'gym gloves','faja gym':'weightlifting belt',
  'rodillera':'knee pad support','tobillera':'ankle support',
  'bolsa gym':'gym bag sports bag','mochila deportiva':'sports backpack',
  'proteina':'protein supplement','suplemento':'supplement',
  'botella agua':'water bottle sports','termo':'thermos water bottle',
  'cronometro':'stopwatch timer sports','timer boxeo':'boxing timer',
  // Hogar
  'espejo':'mirror','espejos':'mirror','espejo de baño':'bathroom mirror',
  'sofa':'sofa couch','sofá':'sofa couch','silla':'chair',
  'mesa':'table','cama':'bed','almohada':'pillow','lampara':'lamp',
  'cortina':'curtain','alfombra':'rug carpet','nevera':'refrigerator',
  'microondas':'microwave','licuadora':'blender','cafetera':'coffee maker',
  'ventilador':'fan','toalla':'towel','organizador':'organizer storage',
  // Tecnología
  'celular':'smartphone','auriculares':'headphones','audífonos':'earbuds',
  'televisor':'television tv','reloj':'watch','cámara':'camera',
  'cargador':'charger','bateria portatil':'power bank','tablet':'tablet',
  // Ropa y moda
  'zapatos':'shoes','tenis casual':'sneakers casual','botas':'boots',
  'camisa':'shirt','camiseta':'t-shirt','pantalon':'pants',
  'vestido':'dress','chaqueta':'jacket','bolso':'handbag',
  'gorra':'cap hat','perfume':'perfume','ropa':'clothing',
  // Cocina
  'olla':'cooking pot','sartan':'frying pan','cuchillo':'knife',
  'vaso':'glass cup','plato':'plate dish','cocina':'kitchen',
  // General
  'barato':'affordable price','económico':'affordable',
  'bueno':'quality good','mejor':'best quality',
  'mujer':'women','hombre':'men','niño':'kids children','bebe':'baby',
  'mascota':'pet','perro':'dog','gato':'cat',
  'jardin':'garden outdoor','oficina':'office',
};

function translateES(q) {
  const lower = q.toLowerCase().trim();
  if (ES_EN[lower]) return ES_EN[lower];
  for (const [es, en] of Object.entries(ES_EN)) {
    if (lower.includes(es)) return en;
  }
  return q;
}

function isSportsRelated(name) {
  const n = (name || '').toLowerCase();
  return SPORTS_KEYWORDS.some(k => n.includes(k));
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const CJ_API_KEY = process.env.CJ_API_KEY;
  if (!CJ_API_KEY) {
    return res.status(200).json({ products: [], fallback: true, reason: 'NO_KEY' });
  }

  const { search = '', limit = 20, mode = 'auto' } = req.query;

  // mode=sports → filter to sports only
  // mode=all → show everything
  // mode=auto → sports first, then global if needed
  const targetLimit = Math.max(parseInt(limit), 20);
  const CBA_MARGIN = 1.40;

  const searchEN = translateES(search) || 'boxing fitness';
  const isSportsSearch = search === '' ||
    SPORTS_KEYWORDS.some(k => searchEN.toLowerCase().includes(k)) ||
    mode === 'sports';

  try {
    // ── AUTH ──
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({apiKey:CJ_API_KEY}) }
    );
    const authJson = await authRes.json();
    if (!authJson.data?.accessToken) {
      return res.status(200).json({ products:[], fallback:true, reason:'AUTH_FAILED' });
    }
    const TOKEN = authJson.data.accessToken;

    // ── FETCH POD PRODUCTS FIRST (if any) ──
    let podProducts = [];
    if (CBA_POD_PRODUCTS.length > 0) {
      // TODO: Fetch your custom CBA branded products from CJ
      // This will be implemented when POD products are ready
      // podProducts = await fetchPODProducts(TOKEN, CBA_POD_PRODUCTS);
    }

    // ── SEARCH CJ ──
    const params = new URLSearchParams({
      pageNum: '1',
      pageSize: '60',
      productNameEn: searchEN
    });

    const searchRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?${params}`,
      { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
    );
    const searchJson = await searchRes.json();
    let list = searchJson.data?.list || [];

    // If no results, try original Spanish term
    if (list.length === 0 && searchEN !== search) {
      const r2 = await fetch(
        `https://developers.cjdropshipping.com/api2.0/v1/product/list?pageNum=1&pageSize=60&productNameEn=${encodeURIComponent(search)}`,
        { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
      );
      const j2 = await r2.json();
      list = j2.data?.list || [];
    }

    if (list.length === 0) {
      return res.status(200).json({ products:[], fallback:true, reason:'NO_RESULTS', searchedFor:searchEN });
    }

    // ── FILTER + SORT + MARGIN ──
    let products = list.map(p => {
      const sku = p.productSku?.[0] || {};
      const cost = parseFloat(sku.sellPrice || sku.price || p.sellPrice || 0);
      const cbaPrice = parseFloat((cost * CBA_MARGIN).toFixed(2));
      const name = (p.productNameEn || p.productNameCn || '').substring(0, 80);
      const isSports = isSportsRelated(name) || isSportsRelated(p.categoryName);

      return {
        id: p.pid,
        name,
        image: p.productImage || '',
        category: p.categoryName || 'General',
        costPrice: cost,
        cbaPrice,
        shippingTime: p.deliveryTime || '7-15 days',
        stars: 5,
        isSports,
        isPOD: false  // Will be true for custom CBA products
      };
    }).filter(p => p.cbaPrice > 0);

    // Sort: POD first → Sports first → then rest
    products.sort((a, b) => {
      if (a.isPOD && !b.isPOD) return -1;
      if (!a.isPOD && b.isPOD) return 1;
      if (isSportsSearch) {
        if (a.isSports && !b.isSports) return -1;
        if (!a.isSports && b.isSports) return 1;
      }
      return 0;
    });

    // POD products go first
    const finalProducts = [...podProducts, ...products].slice(0, targetLimit);

    return res.status(200).json({
      products: finalProducts,
      total: finalProducts.length,
      searchedFor: searchEN,
      originalSearch: search,
      translated: searchEN !== search,
      margin: '40%',
      fallback: false,
      podReady: true  // Flag indicating POD support is configured
    });

  } catch (error) {
    return res.status(200).json({ products:[], fallback:true, reason:error.message });
  }
};