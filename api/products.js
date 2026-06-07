// api/products.js — CBA Global Store v5
// 20 productos + traducción ES→EN automática

// Diccionario básico ES → EN para búsquedas
const ES_EN = {
  // Hogar
  'espejo':'mirror','espejos':'mirror','espejo de baño':'bathroom mirror',
  'sofa':'sofa couch','sofá':'sofa couch','silla':'chair','sillas':'chairs',
  'mesa':'table','cama':'bed','almohada':'pillow','sábana':'bed sheet',
  'lámpara':'lamp','lampara':'lamp','cortina':'curtain','alfombra':'rug carpet',
  'nevera':'refrigerator','refrigerador':'refrigerator','microondas':'microwave',
  'licuadora':'blender','cafetera':'coffee maker','plancha':'iron clothes',
  'ventilador':'fan','aire acondicionado':'air conditioner',
  // Ropa y moda
  'zapatos':'shoes','tenis':'sneakers','botas':'boots','sandalias':'sandals',
  'camisa':'shirt','camiseta':'t-shirt','pantalon':'pants','pantalón':'pants',
  'vestido':'dress','falda':'skirt','chaqueta':'jacket','abrigo':'coat',
  'bolso':'handbag','cartera':'wallet purse','gorra':'cap hat',
  // Tecnología
  'celular':'smartphone phone','teléfono':'smartphone','auriculares':'headphones',
  'audífonos':'earbuds headphones','televisor':'television tv','reloj':'watch',
  'cámara':'camera','computadora':'laptop computer','tablet':'tablet',
  // Deportes
  'guantes':'boxing gloves','guantes de boxeo':'boxing gloves',
  'cuerda saltar':'jump rope','soguilla':'jump rope','pesas':'weights dumbbells',
  'mancuernas':'dumbbells','bicicleta':'bicycle bike','colchoneta':'yoga mat',
  // Belleza
  'perfume':'perfume cologne','crema':'face cream','maquillaje':'makeup',
  'shampoo':'shampoo','labial':'lipstick','base':'foundation makeup',
  // Niños
  'juguete':'toy','juguetes':'toys','muñeca':'doll','carrito':'toy car',
  // Cocina
  'olla':'pot cooking','sartén':'frying pan','cuchillo':'knife',
  'tenedor':'fork','vaso':'glass cup','plato':'plate dish',
  // General
  'barato':'cheap affordable','económico':'affordable',
  'bueno':'good quality','mejor':'best quality',
  // Más hogar
  'toalla':'towel','toallas':'towels','sabana':'bed sheet',
  'cojin':'cushion pillow','cojín':'cushion pillow',
  'reloj de pared':'wall clock','cuadro':'wall art picture',
  'organizador':'organizer storage','estante':'shelf rack',
  'canasta':'basket storage','cesta':'basket',
  // Más tecnología
  'cargador':'charger','cargador celular':'phone charger',
  'cable usb':'usb cable','bateria portatil':'power bank',
  'batería portátil':'power bank','memoria usb':'usb flash drive',
  'funda celular':'phone case','protector pantalla':'screen protector',
  // Más ropa
  'medias':'socks','calcetines':'socks','cinturon':'belt',
  'cinturón':'belt','guantes invierno':'winter gloves',
  'bufanda':'scarf','gorra beisbol':'baseball cap',
  // Más deportes
  'traje de baño':'swimsuit','bañador':'swimsuit',
  'ropa deportiva':'sportswear','leggins':'leggings',
  'short deportivo':'sports shorts','camiseta deportiva':'sports shirt',
  'mochila':'backpack','maleta':'suitcase luggage',
  // Jardín y exterior
  'maceta':'flower pot planter','planta artificial':'artificial plant',
  'silla de jardin':'garden chair','paraguas':'umbrella',
  // Mascotas
  'comida perro':'dog food','collar perro':'dog collar',
  'juguete perro':'dog toy','cama perro':'dog bed',
  'accesorios gato':'cat accessories',
  // Bebé
  'ropa bebe':'baby clothes','pañal':'diaper',
  'biberón':'baby bottle','cochecito':'baby stroller',
  // Oficina
  'lapicero':'pen pencil','cuaderno':'notebook',
  'escritorio':'desk','silla oficina':'office chair',
};

function translateQuery(q) {
  const lower = q.toLowerCase().trim();
  // Exact match
  if (ES_EN[lower]) return ES_EN[lower];
  // Partial match
  for (const [es, en] of Object.entries(ES_EN)) {
    if (lower.includes(es)) return en;
  }
  // Return original (might already be English)
  return q;
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

  const { search = 'boxing', limit = 20 } = req.query;
  const CBA_MARGIN = 1.40;

  // Translate ES→EN if needed
  const searchEN = translateQuery(search);
  const targetLimit = Math.max(parseInt(limit), 20);

  try {
    // AUTH
    const authRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY })
      }
    );
    const authJson = await authRes.json();
    if (!authJson.data?.accessToken) {
      return res.status(200).json({ products: [], fallback: true, reason: 'AUTH_FAILED' });
    }
    const TOKEN = authJson.data.accessToken;

    // SEARCH — request 50 to ensure we get 20 after filtering
    const params = new URLSearchParams({
      pageNum: '1',
      pageSize: '50',
      productNameEn: searchEN
    });

    const searchRes = await fetch(
      `https://developers.cjdropshipping.com/api2.0/v1/product/list?${params}`,
      { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
    );
    const searchJson = await searchRes.json();

    // If primary search returns nothing, try broader search
    let list = searchJson.data?.list || [];

    if (list.length === 0 && searchEN !== search) {
      // Try original term too
      const params2 = new URLSearchParams({ pageNum:'1', pageSize:'50', productNameEn: search });
      const r2 = await fetch(
        `https://developers.cjdropshipping.com/api2.0/v1/product/list?${params2}`,
        { headers: { 'CJ-Access-Token': TOKEN, 'Content-Type': 'application/json' } }
      );
      const j2 = await r2.json();
      list = j2.data?.list || [];
    }

    if (list.length === 0) {
      return res.status(200).json({
        products: [],
        fallback: true,
        reason: 'NO_RESULTS',
        searchedFor: searchEN
      });
    }

    // PROCESS + APPLY 40% MARGIN
    const products = list
      .map(p => {
        const sku = p.productSku?.[0] || p.variants?.[0] || {};
        const cost = parseFloat(sku.sellPrice || sku.price || p.sellPrice || p.price || 0);
        const cbaPrice = parseFloat((cost * CBA_MARGIN).toFixed(2));
        return {
          id: p.pid,
          name: (p.productNameEn || p.productNameCn || 'Product').substring(0, 80),
          image: p.productImage || '',
          category: p.categoryName || 'General',
          costPrice: cost,
          cbaPrice,
          shippingTime: p.deliveryTime || '7-15 days',
          stars: 5
        };
      })
      .filter(p => p.cbaPrice > 0)
      .slice(0, targetLimit);

    return res.status(200).json({
      products,
      total: products.length,
      searchedFor: searchEN,
      originalSearch: search,
      translated: searchEN !== search,
      margin: '40%',
      fallback: false
    });

  } catch (error) {
    return res.status(200).json({ products: [], fallback: true, reason: error.message });
  }
};
