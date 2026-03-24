import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const EXTRACTION_PROMPT = `Estás a analisar uma imagem/PDF de um exame clínico português.

Extrai TODOS os biomarcadores que encontrares. Para cada um, devolve:
- name: nome do biomarcador tal como aparece no documento
- name_normalized: versão normalizada em lowercase sem acentos (ex: "ldl", "hdl", "triglycerides", "glucose", "hba1c")
- value: valor numérico
- unit: unidade (mg/dL, g/dL, etc.)
- ref_min: limite inferior do range de referência (ou null)
- ref_max: limite superior do range de referência
- confidence: "high", "medium", ou "low"

Também extrai:
- lab_name: nome do laboratório (se visível)
- exam_date: data do exame (se visível), formato YYYY-MM-DD

Responde APENAS em JSON válido. Sem markdown, sem backticks, sem explicações.
Formato: { "lab_name": "...", "exam_date": "...", "markers": [...] }`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { image, mimeType } = await req.json();

    if (!image) {
      return new Response(JSON.stringify({ error: "No image provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: mimeType || "image/jpeg",
                    data: image,
                  },
                },
                { text: EXTRACTION_PROMPT },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.error("Gemini response:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to extract data from image" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const extracted = JSON.parse(data.candidates[0].content.parts[0].text);

    return new Response(JSON.stringify(extracted), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("Extract error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
