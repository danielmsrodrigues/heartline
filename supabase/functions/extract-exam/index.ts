import { callGemini, json, readJsonBody, serveAuthenticated } from "../_shared/runtime.ts";
import { BIOMARKER_CATALOG, canonicalBiomarkerKey } from "../_shared/health-model.ts";

const CANONICAL_KEYS = BIOMARKER_CATALOG.map((b) => `${b.key} (${b.name})`).join(", ");

const EXTRACTION_PROMPT = `Estás a analisar uma imagem/PDF de um exame clínico português.

Extrai TODOS os biomarcadores que encontrares. Para cada um, devolve:
- name: nome do biomarcador tal como aparece no documento
- name_normalized: chave normalizada. Se o biomarcador existir nesta lista, usa EXATAMENTE a chave indicada: ${CANONICAL_KEYS}. Caso contrário, usa o nome em minúsculas, sem acentos e com "_" em vez de espaços.
- value: valor numérico (usa ponto como separador decimal)
- unit: unidade (mg/dL, g/dL, etc.)
- ref_min: limite inferior do range de referência (ou null)
- ref_max: limite superior do range de referência (ou null)
- confidence: "high", "medium", ou "low"

Ignora resultados sem valor numérico (ex.: "negativo", "< 0,5").

Também extrai:
- lab_name: nome do laboratório (se visível, senão null)
- exam_date: data do exame (se visível, senão null), formato YYYY-MM-DD

Responde APENAS em JSON válido. Sem markdown, sem backticks, sem explicações.
Formato: { "lab_name": "...", "exam_date": "...", "markers": [...] }`;

const EXTRACTION_SCHEMA = {
  type: "OBJECT",
  properties: {
    lab_name: { type: "STRING", nullable: true },
    exam_date: { type: "STRING", nullable: true },
    markers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          name_normalized: { type: "STRING" },
          value: { type: "NUMBER" },
          unit: { type: "STRING" },
          ref_min: { type: "NUMBER", nullable: true },
          ref_max: { type: "NUMBER", nullable: true },
          confidence: { type: "STRING", enum: ["high", "medium", "low"] },
        },
        required: ["name", "name_normalized", "value", "unit", "confidence"],
      },
    },
  },
  required: ["markers"],
};

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
// ~15 MB de ficheiro em base64
const MAX_BASE64_LENGTH = 20_000_000;

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.trim().replace(",", "."));
  return value.trim() !== "" && Number.isFinite(parsed) ? parsed : null;
}

function sanitize(raw: any) {
  const markers = (Array.isArray(raw?.markers) ? raw.markers : [])
    .map((m: any) => {
      const name = typeof m?.name === "string" ? m.name.trim() : "";
      const value = toNumber(m?.value);
      if (!name || value == null) return null;
      return {
        name,
        name_normalized: canonicalBiomarkerKey(m.name_normalized, name),
        value,
        unit: typeof m.unit === "string" ? m.unit.trim() : "",
        ref_min: toNumber(m.ref_min),
        ref_max: toNumber(m.ref_max),
        confidence: ["high", "medium", "low"].includes(m.confidence) ? m.confidence : "low",
      };
    })
    .filter(Boolean);

  const examDate =
    typeof raw?.exam_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.exam_date)
      ? raw.exam_date
      : null;

  return {
    lab_name: typeof raw?.lab_name === "string" && raw.lab_name.trim() ? raw.lab_name.trim() : null,
    exam_date: examDate,
    markers,
  };
}

serveAuthenticated("extract-exam", async (req) => {
  const { image, mimeType } = await readJsonBody(req);

  if (typeof image !== "string" || !image) {
    return json({ error: "No image provided" }, 400);
  }
  if (image.length > MAX_BASE64_LENGTH) {
    return json({ error: "File too large" }, 413);
  }
  const mime = typeof mimeType === "string" && ALLOWED_MIME_TYPES.includes(mimeType)
    ? mimeType
    : "image/jpeg";

  const text = await callGemini(
    [{ inline_data: { mime_type: mime, data: image } }, { text: EXTRACTION_PROMPT }],
    { temperature: 0.1, schema: EXTRACTION_SCHEMA }
  );

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error("extract-exam: resposta sem JSON válido");
    return json({ error: "Failed to extract data from image" }, 502);
  }

  return json(sanitize(parsed));
});
