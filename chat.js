// api/chat.js — Asistente Virtual CBA
// Vercel Serverless Function — Groq API

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  const GROQ_API_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_API_KEY) {
    return res.status(200).json({
      reply: 'Para más información contáctanos por WhatsApp al (702) 723-4009. ¡El Coach te responde personalmente!'
    });
  }

  const SYSTEM = `Eres el Asistente Virtual de CBA (Cuban Boxing Academy), la marca del Coach Osvimer Rodríguez en Henderson, Nevada.

IDENTIDAD: Profesional, motivador, enfocado en alto rendimiento y disciplina.

INFORMACIÓN CLAVE:
- Horarios: Juvenil 9-12 (4:30PM L-V, 10AM Sáb), Juvenil 13-14 (5:30PM), Amateur -16 (6:30PM), Amateur +16 (7:30PM)
- Teléfono: (702) 723-4009
- WhatsApp: https://wa.me/17027234009
- Email: cbaboxeo@gmail.com
- Tienda de equipo: boxingcba.com
- Ubicación: Henderson, Nevada
- Metodología: Sagarra (34 oros olímpicos cubanos)
- Certificaciones Coach: USA Boxing Green Level, SafeSport, USADA

MISIÓN:
1. Responder dudas sobre sesiones de entrenamiento
2. Recomendar productos de 5 estrellas de boxingcba.com
3. Guiar al usuario a dejar su contacto o hacer su compra
4. Para precios de membresía: siempre redirigir a WhatsApp con el Coach

REGLAS:
- Responde en el mismo idioma que el usuario
- Máximo 3-4 oraciones por respuesta
- Siempre termina con una pregunta o call-to-action
- Para precios específicos: "El Coach te da los precios personalmente por WhatsApp"
- Para equipo: recomienda boxingcba.com`;

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

    if (data.choices && data.choices[0]) {
      return res.status(200).json({
        reply: data.choices[0].message.content
      });
    }

    throw new Error('No response from Groq');

  } catch (error) {
    console.error('Groq error:', error);
    return res.status(200).json({
      reply: '¡Hola! Para información sobre horarios, precios y clases contáctanos por WhatsApp al (702) 723-4009. ¡El Coach te responde de inmediato!'
    });
  }
}
