export const config = { runtime: 'edge' };

async function handler(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers });
  }

  try {
    const body = await req.json();
    const linkedinUrl = body.linkedinUrl || '';

    if (!linkedinUrl || linkedinUrl.length < 5) {
      return new Response(JSON.stringify({ error: 'LinkedIn URL requerida' }), { status: 400, headers });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key no configurada' }), { status: 500, headers });
    }

    const prompt = `Eres un experto en psicología organizacional especializado en modelo DISC y Enneagrama para liderazgo en América Latina.

Analiza esta URL de LinkedIn: "${linkedinUrl}"

Infiere un perfil DISC predictivo realista y coherente basado en el username visible en la URL.

Responde SOLO con este JSON, sin texto adicional, sin markdown:
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
      return new Response(JSON.stringify({ error: `API error: ${response.status}` }), { status: 500, headers });
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: 'No se pudo parsear respuesta' }), { status: 500, headers });
    }

    const result = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(result), { status: 200, headers });

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}

module.exports = handler;
