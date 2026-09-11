export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { imageBase64, mediaType, promptText } = req.body;

    if (!process.env.GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY no configurada en Vercel" });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: "No se recibió ninguna imagen" });
    }

    const imageDataUrl = `data:${mediaType};base64,${imageBase64}`;
    console.log("Llamando a Groq con modelo qwen/qwen3.6-27b");

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen/qwen3.6-27b",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        }],
        temperature: 0.7,
        max_tokens: 4000  // ✅ AUMENTADO: Suficiente espacio para pensar y responder
      })
    });

    const responseText = await groqResponse.text();
    console.log("Groq status:", groqResponse.status);

    if (!groqResponse.ok) {
      return res.status(500).json({ error: `Error de Groq (${groqResponse.status}): ${responseText}` });
    }

    const data = JSON.parse(responseText);
    const text = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({ content: [{ text: text }] });

  } catch (error) {
    console.error('Error en la función:', error);
    return res.status(500).json({ error: `Error interno: ${error.message}` });
  }
}
