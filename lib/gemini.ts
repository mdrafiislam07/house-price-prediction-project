// Minimal Gemini (generateContent) helper. The API key stays on the server (GEMINI_API_KEY in .env.local).

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface GeminiTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export async function generate(opts: {
  system?: string;
  contents: GeminiTurn[];
  json?: boolean;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is missing');

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      ...(opts.system ? { systemInstruction: { parts: [{ text: opts.system }] } } : {}),
      contents: opts.contents,
      generationConfig: {
        temperature: opts.temperature ?? 0.4,
        ...(opts.json ? { responseMimeType: 'application/json' } : {})
      }
    })
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) throw new Error(data?.error?.message || `Gemini request failed (${res.status})`);

  const parts: { text?: string }[] = data?.candidates?.[0]?.content?.parts || [];
  return parts.map((p) => p.text || '').join('').trim();
}

/** Parses a JSON object out of a model reply (tolerates code fences / extra text). */
export function parseJson<T>(text: string): T | null {
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const a = cleaned.indexOf('{');
    const b = cleaned.lastIndexOf('}');
    return JSON.parse(a !== -1 && b !== -1 ? cleaned.slice(a, b + 1) : cleaned) as T;
  } catch {
    return null;
  }
}