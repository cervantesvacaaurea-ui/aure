export default async function handler(req, res) {
  // Solo permitir peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { imageBase64, mediaType, promptText } = req.body;
    
    // Convertimos la imagen a Data URL para Groq
    const imageDataUrl = `data:${mediaType};base64,${imageBase64}`;

    // Verificamos que la clave existe
    if (!process.env.GROQ_API_KEY) {
      console.error("ERROR: GROQ_API_KEY no está definida en las variables de entorno");
      return res.status(500).json({ error: "GROQ_API_KEY no configurada en Vercel" });
    }

    console.log("Llamando a Groq con modelo: meta-llama/llama-4-scout-17b-16e-instruct");

    // Llamada a Groq con el modelo de visión actualizado
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct", // Modelo actualizado con visión
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

    const responseText = await groqResponse.text();
    console.log("Respuesta de Groq (status " + groqResponse.status + "):", responseText);

    if (!groqResponse.ok) {
      return res.status(500).json({ error: `Error de Groq (${groqResponse.status}): ${responseText}` });
    }

    const data = JSON.parse(responseText);
    const text = data.choices?.[0]?.message?.content || '';
    
    // Devolvemos el formato que espera tu index.html
    return res.status(200).json({ content: [{ text: text }] });

  } catch (error) {
    console.error('Error en la API:', error);
    return res.status(500).json({ error: `Error interno: ${error.message}` });
  }
}
