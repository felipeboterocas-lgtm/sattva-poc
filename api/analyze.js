module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { linkedinUrl } = req.body;

    if (!linkedinUrl || linkedinUrl.length < 5) {
      return res.status(400).json({ error: 'LinkedIn URL requerida' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'API key no configurada' });
    }

    const prompt = `Eres un experto en psicología organizacional especializado en modelo DISC y Enneagrama para liderazgo en América Latina.

Analiza esta URL de LinkedIn: "${linkedinUrl}"

Infiere un perfil DISC predictivo realista basado en el username visible en la URL.

Responde SOLO con JSON válido, sin texto adicional, sin markdown:
{"nombre":"nombre inferido","archetype":"arquetipo de liderazgo específico","disc":{"d":30,"i":25,"s":25,"c":20},"dominante":"D","como_lidera":"2-3 oraciones sobre estilo de liderazgo","como_comunica":"2-3 oraciones sobre comunicación","tags_comunicacion":["tag1","tag2","tag3"],"zona_tension":"punto ciego en 2 oraciones","enneagrama":"Tipo X - Nombre: relación con DISC","mensaje_aiko":"mensaje cálido de Aiko en 1-2 oraciones"}

Los valores d+i+s+c deben sumar exactamente 100.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(500).json({ error: `API error: ${response.status}` });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return res.status(500).json({ error: 'No se pudo parsear respuesta' });
    }

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
};
