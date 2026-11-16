'use client';

import { useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AREAS, validatePrice } from '../lib/price';
import type { AdjKey, Facing, Improvement, PriceInputs, PriceResult, PropertyType, RoadWidth } from '../lib/price';

/* ------------------------------ text (EN / BN) ------------------------------ */
const EN = {
  appName: 'House Price AI',
  tagline: 'Enter the details of a flat or house and get a predicted price range in Bangladesh.',
  formTitle: 'Property details',
  formSub: 'Fill in everything, then press "Predict price".',
  secPlace: 'Location and type',
  secSize: 'Size and rooms',
  secBuilding: 'Building and extras',
  area: 'Area',
  type: 'Property type',
  apartment: 'Apartment / flat',
  house: 'Independent house (built area)',
  size: 'Size (sq ft)',
  bedrooms: 'Bedrooms',
  bathrooms: 'Bathrooms',
  balconies: 'Balconies',
  floor: 'Floor (0 = ground)',
  age: 'Building age (years)',
  facing: 'Facing',
  south: 'South',
  east: 'East',
  north: 'North',
  west: 'West',
  road: 'Road in front',
  roadNarrow: 'Narrow lane (under 12 ft)',
  roadMedium: 'Normal road (12 to 20 ft)',
  roadWide: 'Wide or main road (20 ft+)',
  lift: 'Lift in the building',
  parking: 'Car parking',
  gas: 'Gas connection',
  submit: 'Predict price',
  predicting: 'Predicting...',
  emptyTitle: 'Your prediction will appear here',
  emptyText: 'Fill in the property details and press "Predict price".',
  stale: 'You changed the details. Press "Predict price" to update this prediction.',
  estTitle: 'Predicted market price',
  range: 'Likely range',
  perSqft: 'Middle price per sq ft',
  areaRate: 'Area rate used',
  perSqftUnit: 'per sq ft',
  whyTitle: 'How each detail moves the price',
  noChange: 'No change',
  adj_type: 'Property type',
  adj_size: 'Size',
  adj_layout: 'Space per bedroom',
  adj_bathrooms: 'Bathrooms per bedroom',
  adj_balconies: 'Balconies',
  adj_floor: 'Floor and lift',
  adj_age: 'Building age',
  adj_facing: 'Facing',
  adj_road: 'Road in front',
  adj_parking: 'Parking',
  adj_gas: 'Gas connection',
  addTitle: 'What would add value',
  imp_parking: 'Car parking',
  imp_gas: 'Gas connection',
  imp_lift: 'A lift',
  aiTitle: 'AI explanation',
  drivers: 'What drives it',
  tips: 'How to check the real price',
  aiUnavailable: 'The AI explanation is not available right now. The prediction above is still correct.',
  lakh: 'lakh',
  crore: 'crore',
  network: 'Network error. Please try again.',
  disclaimer:
    'This is a rough prediction from typical area rates and rules of thumb, not a valuation. Real prices depend on the exact street, deed, road width and negotiation. Compare nearby listings and get a bank or surveyor valuation before you decide.'
};

const BN: typeof EN = {
  appName: 'হাউস প্রাইস এআই',
  tagline: 'ফ্ল্যাট বা বাড়ির তথ্য দিন, বাংলাদেশে আনুমানিক দামের সীমা জেনে নিন।',
  formTitle: 'সম্পত্তির তথ্য',
  formSub: 'সব তথ্য দিয়ে "দাম অনুমান করুন" চাপুন।',
  secPlace: 'এলাকা ও ধরন',
  secSize: 'আকার ও কক্ষ',
  secBuilding: 'ভবন ও সুবিধা',
  area: 'এলাকা',
  type: 'সম্পত্তির ধরন',
  apartment: 'অ্যাপার্টমেন্ট / ফ্ল্যাট',
  house: 'নিজস্ব বাড়ি (নির্মিত অংশ)',
  size: 'আকার (বর্গফুট)',
  bedrooms: 'শোবার ঘর',
  bathrooms: 'বাথরুম',
  balconies: 'বারান্দা',
  floor: 'তলা (০ = নিচতলা)',
  age: 'ভবনের বয়স (বছর)',
  facing: 'মুখ',
  south: 'দক্ষিণ',
  east: 'পূর্ব',
  north: 'উত্তর',
  west: 'পশ্চিম',
  road: 'সামনের রাস্তা',
  roadNarrow: 'সরু গলি (১২ ফুটের কম)',
  roadMedium: 'সাধারণ রাস্তা (১২ থেকে ২০ ফুট)',
  roadWide: 'চওড়া বা প্রধান সড়ক (২০ ফুট+)',
  lift: 'ভবনে লিফট আছে',
  parking: 'গাড়ির পার্কিং',
  gas: 'গ্যাস সংযোগ',
  submit: 'দাম অনুমান করুন',
  predicting: 'হিসাব হচ্ছে...',
  emptyTitle: 'অনুমান এখানে দেখা যাবে',
  emptyText: 'সম্পত্তির তথ্য দিয়ে "দাম অনুমান করুন" চাপুন।',
  stale: 'আপনি তথ্য বদলেছেন। অনুমান নতুন করতে "দাম অনুমান করুন" চাপুন।',
  estTitle: 'আনুমানিক বাজারদর',
  range: 'সম্ভাব্য দামের সীমা',
  perSqft: 'মাঝামাঝি দাম (প্রতি বর্গফুট)',
  areaRate: 'ব্যবহৃত এলাকার রেট',
  perSqftUnit: 'প্রতি বর্গফুট',
  whyTitle: 'প্রতিটি তথ্য দামে কী প্রভাব ফেলছে',
  noChange: 'কোনো পরিবর্তন নেই',
  adj_type: 'সম্পত্তির ধরন',
  adj_size: 'আকার',
  adj_layout: 'প্রতি শোবার ঘরে জায়গা',
  adj_bathrooms: 'প্রতি শোবার ঘরে বাথরুম',
  adj_balconies: 'বারান্দা',
  adj_floor: 'তলা ও লিফট',
  adj_age: 'ভবনের বয়স',
  adj_facing: 'মুখ',
  adj_road: 'সামনের রাস্তা',
  adj_parking: 'পার্কিং',
  adj_gas: 'গ্যাস সংযোগ',
  addTitle: 'কী থাকলে দাম বাড়ত',
  imp_parking: 'গাড়ির পার্কিং',
  imp_gas: 'গ্যাস সংযোগ',
  imp_lift: 'লিফট',
  aiTitle: 'এআই ব্যাখ্যা',
  drivers: 'যা দামকে প্রভাবিত করছে',
  tips: 'আসল দাম কীভাবে যাচাই করবেন',
  aiUnavailable: 'এআই ব্যাখ্যা এখন পাওয়া যাচ্ছে না। উপরের অনুমান ঠিকই আছে।',
  lakh: 'লাখ',
  crore: 'কোটি',
  network: 'নেটওয়ার্কে সমস্যা। আবার চেষ্টা করুন।',
  disclaimer:
    'এটি এলাকার সাধারণ রেট ও আন্দাজের নিয়মে করা একটি মোটামুটি অনুমান, সরকারি মূল্যায়ন নয়। প্রকৃত দাম নির্ভর করে নির্দিষ্ট রাস্তা, দলিল, রাস্তার প্রস্থ ও দরদামের ওপর। সিদ্ধান্তের আগে আশেপাশের বিজ্ঞাপন মিলিয়ে দেখুন এবং ব্যাংক বা সার্ভেয়ারের মূল্যায়ন নিন।'
};

type Lang = 'en' | 'bn';
const TEXT: Record<Lang, typeof EN> = { en: EN, bn: BN };

/* --------------------------------- helpers --------------------------------- */
interface Form {
  area: string; type: PropertyType; sizeSqft: string; bedrooms: string; bathrooms: string; balconies: string;
  floor: string; buildingAge: string; facing: Facing; road: RoadWidth; hasLift: boolean; hasParking: boolean; hasGas: boolean;
}
const DEFAULTS: Form = {
  area: 'mymensingh', type: 'apartment', sizeSqft: '1200', bedrooms: '3', bathrooms: '2', balconies: '2',
  floor: '3', buildingAge: '5', facing: 'south', road: 'medium', hasLift: true, hasParking: false, hasGas: true
};
const toInputs = (f: Form): PriceInputs => ({
  area: f.area, type: f.type, sizeSqft: Number(f.sizeSqft), bedrooms: Number(f.bedrooms), bathrooms: Number(f.bathrooms),
  balconies: Number(f.balconies), floor: Number(f.floor), buildingAge: Number(f.buildingAge), facing: f.facing, road: f.road,
  hasLift: f.hasLift, hasParking: f.hasParking, hasGas: f.hasGas
});

interface PriceNotes { summary: string; drivers: string[]; tips: string[] }

const money = (n: number) => `৳${Math.round(n).toLocaleString('en-IN')}`;

const fieldCls =
  'mt-1.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base text-ink outline-none transition focus:border-bottle-700 focus:ring-4 focus:ring-bottle-700/15';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm text-muted">{label}</span>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, step }: { value: string; onChange: (v: string) => void; step?: string }) {
  return (
    <input
      type="number" inputMode="decimal" min="0" step={step || 'any'} value={value}
      onChange={(e) => onChange(e.target.value)} className={`${fieldCls} tabular-nums`}
    />
  );
}

function Seg<V extends string>({ value, onChange, options }: { value: V; onChange: (v: V) => void; options: [V, string][] }) {
  return (
    <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-line bg-white p-1">
      {options.map(([k, label]) => (
        <button
          key={k} type="button" role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={`min-h-[42px] rounded-lg px-2 text-sm transition-colors ${
            value === k ? 'bg-bottle-800 font-semibold text-white shadow-sm' : 'text-ink hover:bg-paper'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function Chip({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button" role="switch" aria-checked={on} onClick={onClick}
      className={`flex min-h-[44px] items-center gap-2.5 rounded-full border px-4 text-sm transition-colors ${
        on ? 'border-bottle-800 bg-bottle-800 text-white' : 'border-line bg-white text-ink hover:border-bottle-700'
      }`}
    >
      <span
        aria-hidden="true"
        className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${on ? 'bg-marigold text-bottle-950' : 'border border-line'}`}
      >
        {on ? '✓' : ''}
      </span>
      {label}
    </button>
  );
}

/** A ledger line: label ........ value */
function Row({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <li className="flex items-baseline gap-3 py-2 text-[15px]">
      <span>{label}</span>
      <span aria-hidden="true" className="flex-1 border-b border-dotted border-line" />
      <span className={`font-semibold tabular-nums ${tone}`}>{value}</span>
    </li>
  );
}

function Bullets({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{title}</h4>
      <ul className="mt-2 space-y-1.5">
        {items.map((t, i) => (
          <li key={i} className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
            <span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ----------------------------------- page ----------------------------------- */
export default function HousePricePage() {
  const [lang, setLang] = useState<Lang>('en');
  const T = TEXT[lang];

  const [form, setForm] = useState<Form>(DEFAULTS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<PriceResult | null>(null);
  const [improvements, setImprovements] = useState<Improvement[]>([]);
  const [ai, setAi] = useState<PriceNotes | null>(null);
  const [predicted, setPredicted] = useState<PriceInputs | null>(null);
  const panelRef = useRef<HTMLElement>(null);

  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const inputs = useMemo(() => toInputs(form), [form]);
  const stale = !!predicted && JSON.stringify(predicted) !== JSON.stringify(inputs);
  const isApt = form.type === 'apartment';

  const parts = (n: number) =>
    n >= 1e7 ? { num: (n / 1e7).toFixed(2), unit: T.crore } : { num: (n / 1e5).toFixed(1), unit: T.lakh };
  const short = (n: number) => {
    const p = parts(n);
    return `৳${p.num} ${p.unit}`;
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validatePrice(inputs);
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs, lang })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || T.network); return; }
      setResult(data.result);
      setImprovements(data.improvements || []);
      setAi(data.ai);
      setPredicted(inputs);
      // on phones the price sits above the form, so bring it into view
      if (window.innerWidth < 1024) panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch {
      setError(T.network);
    } finally {
      setLoading(false);
    }
  };

  const hero = result ? parts(result.mid) : null;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(400px,5fr)_7fr]">
      {/* ============================ price panel ============================ */}
      <aside ref={panelRef} className="bg-gradient-to-b from-bottle-900 to-bottle-950 text-white lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <div className="flex min-h-full flex-col px-6 py-6 sm:px-10 lg:px-12 lg:py-10">
          <header className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-md border border-white/25">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-marigold" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" />
                </svg>
              </span>
              <h1 className="font-display text-xl">{T.appName}</h1>
            </div>
            <div className="flex rounded-full border border-white/25 p-0.5 text-xs font-semibold" role="group" aria-label="Language">
              {(['en', 'bn'] as Lang[]).map((l) => (
                <button
                  key={l} type="button" onClick={() => setLang(l)} aria-pressed={lang === l}
                  className={`min-h-[30px] rounded-full px-3 transition-colors ${lang === l ? 'bg-marigold text-bottle-950' : 'text-bottle-200 hover:text-white'}`}
                >
                  {l === 'en' ? 'EN' : 'বাংলা'}
                </button>
              ))}
            </div>
          </header>

          <div className="flex-1 py-10 lg:py-16" aria-live="polite">
            {!result || !hero ? (
              <>
                <p className="font-display text-4xl leading-[1.12] sm:text-5xl">{T.tagline}</p>
                <p className="mt-6 max-w-sm text-[15px] text-bottle-200">{T.emptyText}</p>
              </>
            ) : (
              <>
                {stale && <p className="mb-6 border-l-2 border-marigold pl-3 text-sm text-marigold">{T.stale}</p>}
                <p className="text-sm text-bottle-200">{T.estTitle}</p>
                <p key={result.mid} className="rise mt-3 flex flex-wrap items-baseline gap-x-2 font-display leading-none lining-nums">
                  <span className="text-3xl text-marigold">৳</span>
                  <span className="text-7xl tabular-nums sm:text-8xl">{hero.num}</span>
                  <span className="text-2xl text-marigold">{hero.unit}</span>
                </p>

                <div key={`r${result.low}-${result.high}`} className="mt-12">
                  <div className="relative">
                    <div className="sweep h-3 rounded-full bg-marigold" style={{ marginLeft: '27%', width: '45%' }} />
                    <div className="tape mt-1.5" />
                    <div className="absolute -top-2 h-7 w-0.5 bg-white" style={{ left: '49.5%' }} aria-hidden="true" />
                  </div>
                  <div className="relative mt-2 h-5 text-sm tabular-nums">
                    <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: '27%' }}>{short(result.low)}</span>
                    <span className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: '72%' }}>{short(result.high)}</span>
                  </div>
                  <p className="mt-4 text-xs tabular-nums text-bottle-200">
                    {T.range}: {money(result.low)} – {money(result.high)}
                  </p>
                </div>

                <dl className="mt-10 grid grid-cols-2 gap-6 border-t border-white/15 pt-6">
                  <div>
                    <dt className="text-xs text-bottle-200">{T.perSqft}</dt>
                    <dd className="mt-1 font-display text-2xl tabular-nums lining-nums">{money(result.perSqftMid)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-bottle-200">{T.areaRate}</dt>
                    <dd className="mt-1 font-display text-2xl tabular-nums lining-nums">
                      {money(result.rateMin)}–{Math.round(result.rateMax).toLocaleString('en-IN')}
                    </dd>
                    <dd className="text-xs text-bottle-200">{T.perSqftUnit}</dd>
                  </div>
                </dl>
              </>
            )}
          </div>

          <p className="text-xs text-bottle-200"></p>
        </div>
      </aside>

      {/* ============================== details ============================== */}
      <main className="px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
        <div className="mx-auto max-w-2xl">
          <form onSubmit={submit}>
            <h2 className="font-display text-3xl">{T.formTitle}</h2>
            <p className="mt-2 text-muted">{T.formSub}</p>

            <section className="mt-10">
              <h3 className="font-display text-xl">{T.secPlace}</h3>
              <div className="mt-4 space-y-6">
                <Field label={T.area}>
                  <select value={form.area} onChange={(e) => set('area')(e.target.value)} className={fieldCls}>
                    {AREAS.map((a) => <option key={a.id} value={a.id}>{lang === 'bn' ? a.bn : a.en}</option>)}
                  </select>
                </Field>
                <div>
                  <span className="mb-2 block text-sm text-muted">{T.type}</span>
                  <Seg<PropertyType>
                    value={form.type} onChange={set('type')}
                    options={[['apartment', T.apartment], ['house', T.house]]}
                  />
                </div>
              </div>
            </section>

            <section className="mt-10 border-t border-line pt-8">
              <h3 className="font-display text-xl">{T.secSize}</h3>
              <div className="mt-4 space-y-6">
                <Field label={T.size}><NumInput value={form.sizeSqft} onChange={set('sizeSqft')} step="10" /></Field>
                <div className="grid grid-cols-3 gap-5">
                  <Field label={T.bedrooms}><NumInput value={form.bedrooms} onChange={set('bedrooms')} step="1" /></Field>
                  <Field label={T.bathrooms}><NumInput value={form.bathrooms} onChange={set('bathrooms')} step="1" /></Field>
                  <Field label={T.balconies}><NumInput value={form.balconies} onChange={set('balconies')} step="1" /></Field>
                </div>
              </div>
            </section>

            <section className="mt-10 border-t border-line pt-8">
              <h3 className="font-display text-xl">{T.secBuilding}</h3>
              <div className="mt-4 space-y-6">
                <div className="grid grid-cols-2 gap-5">
                  {isApt && <Field label={T.floor}><NumInput value={form.floor} onChange={set('floor')} step="1" /></Field>}
                  <Field label={T.age}><NumInput value={form.buildingAge} onChange={set('buildingAge')} step="1" /></Field>
                </div>
                <div>
                  <span className="mb-2 block text-sm text-muted">{T.facing}</span>
                  <Seg<Facing>
                    value={form.facing} onChange={set('facing')}
                    options={[['south', T.south], ['east', T.east], ['north', T.north], ['west', T.west]]}
                  />
                </div>
                <Field label={T.road}>
                  <select value={form.road} onChange={(e) => set('road')(e.target.value as RoadWidth)} className={fieldCls}>
                    <option value="narrow">{T.roadNarrow}</option>
                    <option value="medium">{T.roadMedium}</option>
                    <option value="wide">{T.roadWide}</option>
                  </select>
                </Field>
                <div className="flex flex-wrap gap-2.5">
                  {isApt && <Chip label={T.lift} on={form.hasLift} onClick={() => set('hasLift')(!form.hasLift)} />}
                  <Chip label={T.parking} on={form.hasParking} onClick={() => set('hasParking')(!form.hasParking)} />
                  <Chip label={T.gas} on={form.hasGas} onClick={() => set('hasGas')(!form.hasGas)} />
                </div>
              </div>
            </section>

            {error && (
              <p role="alert" className="mt-8 border-l-2 border-brick bg-white px-3.5 py-2.5 text-sm text-brick">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="mt-8 min-h-[52px] w-full rounded-xl bg-marigold px-6 font-semibold text-bottle-950 shadow-lg shadow-marigold/30 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? T.predicting : T.submit}
            </button>
          </form>

          {result && (
            <div className="mt-14 space-y-12">
              <section>
                <h3 className="font-display text-2xl">{T.whyTitle}</h3>
                <ul className="mt-3">
                  {result.adjustments.map((a) => {
                    const p = Math.round((a.factor - 1) * 1000) / 10;
                    const tone = p > 0 ? 'text-bottle-700' : p < 0 ? 'text-brick' : 'text-muted';
                    return (
                      <Row
                        key={a.key} tone={tone}
                        label={T[`adj_${a.key}` as `adj_${AdjKey}`]}
                        value={p === 0 ? T.noChange : `${p > 0 ? '+' : '−'}${Math.abs(p)}%`}
                      />
                    );
                  })}
                </ul>
              </section>

              {improvements.length > 0 && (
                <section>
                  <h3 className="font-display text-2xl">{T.addTitle}</h3>
                  <ul className="mt-3">
                    {improvements.map((m) => (
                      <Row key={m.key} tone="text-bottle-700" label={T[`imp_${m.key}` as 'imp_lift']} value={`+${short(m.gain)}`} />
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="flex items-center gap-2.5">
                  <span className="rounded bg-marigold-soft px-1.5 py-0.5 text-xs font-bold text-bottle-900">AI</span>
                  <h3 className="font-display text-2xl">{T.aiTitle}</h3>
                </div>
                {ai ? (
                  <div className="mt-4 space-y-6">
                    <p className="leading-relaxed">{ai.summary}</p>
                    {ai.drivers.length > 0 && <Bullets title={T.drivers} items={ai.drivers} dot="bg-bottle-700" />}
                    {ai.tips.length > 0 && <Bullets title={T.tips} items={ai.tips} dot="bg-marigold" />}
                  </div>
                ) : (
                  <p className="mt-3 text-muted">{T.aiUnavailable}</p>
                )}
              </section>

              <p className="border-t border-line pt-5 text-xs leading-relaxed text-muted">{T.disclaimer}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );


  
}