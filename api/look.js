export default async function handler(req, res) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { imageBase64, mediaType, promptText } = req.body;
    
    // Convertimos la imagen a Data URL para Groq
    const imageDataUrl = `data:${mediaType};base64,${imageBase64}`;

    // La clave API de Groq se lee de las variables de entorno de Vercel
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}` // <-- Clave segura
      },
      body: JSON.stringify({
        model: "llama-3.2-11b-vision-preview", // Modelo con visión de Groq (gratuito)
        messages: [{
          role: "user",
          content: [
            { type: "text", text: promptText },
            { type: "image_url", image_url: { url: imageDataUrl } }
          ]
        }],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    // Verificamos si Groq respondió con error
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Error de Groq:", groqResponse.status, errorText);
      return res.status(500).json({ error: `Error de Groq (${groqResponse.status}): ${errorText}` });
    }

    const data = await groqResponse.json();
    const text = data.choices?.[0]?.message?.content || '';
    
    // Devolvemos el formato que espera tu index.html
    return res.status(200).json({ content: [{ text: text }] });

  } catch (error) {
    console.error('Error en la API:', error);
    return res.status(500).json({ error: `Error interno: ${error.message}` });
  }
}
