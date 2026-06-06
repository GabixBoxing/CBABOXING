// api/chat.js — Asistente Virtual CBA — Groq API
// CommonJS para Vercel

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { message } = req.body || {};
  if (!message) return res.status(400).json({ error: 'No message' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(200).json({
      reply: 'Para información contacta al Coach: (702) 723-4009 o WhatsApp.'
    });
  }

  const SYSTEM = `Eres el Asistente Virtual de CBA (Cuban Boxing Academy), marca del Coach Osvimer Rodriguez en Henderson, Nevada.
Tono: profesional, motivador, alto rendimiento.
Horarios: Juvenil 9-12 (4:30PM L-V, 10AM Sab), Juvenil 13-14 (5:30PM), Amateur -16 (6:30PM), Amateur +16 (7:30PM).
Telefono: (702) 723-4009. WhatsApp: wa.me/17027234009. Email: cbaboxeo@gmail.com.
Para precios: responder por WhatsApp personalmente. Para equipo: boxingcba.com.
Responde en el mismo idioma del usuario. Maximo 3-4 oraciones. Termina con CTA.`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 200,
        temperature: 0.7,
        messages: [
          { role: 'system', content: SYSTEM },
          { role: 'user', content: message }
        ]
      })
    });

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    if (reply) return res.status(200).json({ reply });
    throw new Error('No reply from Groq');

  } catch (error) {
    return res.status(200).json({
      reply: 'Para informacion contacta al Coach: (702) 723-4009 o por WhatsApp. Estamos en Henderson, Nevada!'
    });
  }
}
