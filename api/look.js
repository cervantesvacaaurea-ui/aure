// api/look.js
// Función serverless (Vercel) que llama a Groq (modelo Qwen3.6 27B, con visión)
// para generar la recomendación de look. La API key vive en la variable de
// entorno GROQ_API_KEY (Vercel → Settings → Environment Variables), nunca en
// el navegador.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { imageBase64, mediaType, promptText } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: 'GROQ_API_KEY no configurada en Vercel' });
    }
    if (!imageBase64) {
      return res.status(400).json({ error: 'No se recibió ninguna imagen' });
    }
    if (!promptText) {
      return res.status(400).json({ error: 'No se recibió el texto de instrucciones (promptText)' });
    }

    const imageDataUrl = `data:${mediaType};base64,${imageBase64}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
        temperature: 0.6,
        max_completion_tokens: 4096,
        // --- LA CORRECCIÓN CLAVE ---
        // Qwen3.6 es un modelo "razonador": sin esto, mezcla su razonamiento
        // (texto tipo "Let's try... Total: 164...") junto con la respuesta
        // final, y el front-end termina intentando parsear esa mezcla como
        // JSON. "hidden" hace que Groq devuelva SOLO la respuesta final.
        reasoning_format: 'hidden',
        // JSON mode: garantiza que esa respuesta final sea JSON válido.
        // Groq exige reasoning_format en "hidden" o "parsed" (no "raw")
        // cuando se combina con json_object, por eso van juntos.
        response_format: { type: 'json_object' },
      }),
    });

    const responseText = await groqResponse.text();

    if (!groqResponse.ok) {
      console.error('Groq status:', groqResponse.status, responseText);
      return res.status(502).json({ error: `Error de Groq (${groqResponse.status}): ${responseText}` });
    }

    const data = JSON.parse(responseText);
    const text = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ content: [{ text }] });
  } catch (error) {
    console.error('Error en la función:', error);
    return res.status(500).json({ error: `Error interno: ${error.message}` });
  }
}
