import { NextResponse } from 'next/server';
import { estimatePrice, suggestImprovements, validatePrice, AREAS, type PriceInputs } from '../../../lib/price';
import { generate, parseJson } from '../../../lib/gemini';

interface PriceNotes {
  summary: string;
  drivers: string[];
  tips: string[];
}

const list = (v: unknown, max: number): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, max).map((x) => String(x).trim()) : [];

export async function POST(req: Request) {
  let body: { inputs?: unknown; lang?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const error = validatePrice(body.inputs);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const inputs = body.inputs as PriceInputs;
  const lang = body.lang === 'bn' ? 'Bangla (Bengali script)' : 'English';
  const result = estimatePrice(inputs); // all numbers are computed here, not by the AI
  const improvements = suggestImprovements(inputs);
  const areaName = AREAS.find((a) => a.id === inputs.area)?.en ?? inputs.area;

  let ai: PriceNotes | null = null;
  try {
    const system =
      'You are House Price AI, a careful assistant that explains a house price prediction in Bangladesh. ' +
      'The price range was already calculated by code from rough area rates and adjustment factors. ' +
      'Never change, recalculate or contradict it, and never invent numbers or market data that are not given. ' +
      'You cannot see live listings, so never claim the price is current or exact. Currency is BDT (taka).';

    const prompt = `Property data (JSON):
${JSON.stringify({ area: areaName, inputs, result, improvements }, null, 2)}

Each adjustment "factor" multiplies the price: below 1 lowers it, above 1 raises it. "layout" is floor area per bedroom, "bathrooms" is bathrooms per bedroom.
Write your answer in ${lang}.
Return ONLY a JSON object with these keys:
- "summary": 2-3 sentences giving the predicted range (low to high, in taka) and the main things it depends on.
- "drivers": up to 3 short strings naming the factors that matter most and whether they raise or lower the price.
- "tips": up to 3 short, concrete ways to check the real price (compare nearby listings, check the deed and registration value, get a bank or surveyor valuation).`;

    const text = await generate({ system, contents: [{ role: 'user', parts: [{ text: prompt }] }], json: true });
    const parsed = parseJson<Partial<PriceNotes>>(text);
    if (parsed && typeof parsed.summary === 'string') {
      ai = { summary: parsed.summary.trim(), drivers: list(parsed.drivers, 3), tips: list(parsed.tips, 3) };
    }
  } catch (e) {
    console.error('Gemini price explanation failed:', e);
  }

  // If the AI is unavailable the numeric prediction is still returned (ai = null).
  return NextResponse.json({ result, improvements, ai });
}