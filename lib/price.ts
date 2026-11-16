// House price prediction for Bangladesh: a transparent, rule-based model.
// price = size x average area rate x (product of adjustment factors), shown as a range.
// All numbers come from code, never from the AI model.
//
// IMPORTANT: the area rates and the adjustment percentages below are rough,
// hand-written assumptions, not values fitted on real sales data. Update AREAS from
// real local listings/deeds, and tune the factors, before trusting the output.

export type PropertyType = 'apartment' | 'house';
export type Facing = 'south' | 'east' | 'north' | 'west';
export type RoadWidth = 'narrow' | 'medium' | 'wide';

export interface AreaRate {
  id: string;
  en: string;
  bn: string;
  min: number; // BDT per sq ft, low end
  max: number; // BDT per sq ft, high end
}

export const AREAS: AreaRate[] = [
  { id: 'dhaka_gulshan', en: 'Dhaka: Gulshan / Banani / Baridhara', bn: 'ঢাকা: গুলশান / বনানী / বারিধারা', min: 14000, max: 25000 },
  { id: 'dhaka_dhanmondi', en: 'Dhaka: Dhanmondi / Lalmatia', bn: 'ঢাকা: ধানমন্ডি / লালমাটিয়া', min: 11000, max: 18000 },
  { id: 'dhaka_bashundhara', en: 'Dhaka: Bashundhara R/A', bn: 'ঢাকা: বসুন্ধরা আ/এ', min: 7000, max: 12000 },
  { id: 'dhaka_uttara', en: 'Dhaka: Uttara', bn: 'ঢাকা: উত্তরা', min: 6500, max: 10000 },
  { id: 'dhaka_mohammadpur', en: 'Dhaka: Mohammadpur', bn: 'ঢাকা: মোহাম্মদপুর', min: 6000, max: 9500 },
  { id: 'dhaka_mirpur', en: 'Dhaka: Mirpur', bn: 'ঢাকা: মিরপুর', min: 5500, max: 8500 },
  { id: 'dhaka_other', en: 'Dhaka: other areas', bn: 'ঢাকা: অন্যান্য এলাকা', min: 5000, max: 8000 },
  { id: 'chattogram', en: 'Chattogram city', bn: 'চট্টগ্রাম শহর', min: 5500, max: 9500 },
  { id: 'sylhet', en: 'Sylhet city', bn: 'সিলেট শহর', min: 4500, max: 8000 },
  { id: 'narayanganj_gazipur', en: 'Narayanganj / Gazipur', bn: 'নারায়ণগঞ্জ / গাজীপুর', min: 3500, max: 6000 },
  { id: 'rajshahi_khulna', en: 'Rajshahi / Khulna city', bn: 'রাজশাহী / খুলনা শহর', min: 3500, max: 6000 },
  { id: 'mymensingh', en: 'Mymensingh city', bn: 'ময়মনসিংহ শহর', min: 3200, max: 5500 },
  { id: 'jamalpur', en: 'Jamalpur town', bn: 'জামালপুর শহর', min: 2500, max: 4200 },
  { id: 'other_district', en: 'Other district town', bn: 'অন্যান্য জেলা শহর', min: 2200, max: 3800 }
];

export interface PriceInputs {
  area: string;
  type: PropertyType;
  sizeSqft: number;
  bedrooms: number;
  bathrooms: number;
  balconies: number;
  floor: number;        // 0 = ground floor (ignored for houses)
  buildingAge: number;  // years
  facing: Facing;
  road: RoadWidth;
  hasLift: boolean;
  hasParking: boolean;
  hasGas: boolean;      // piped gas connection
}

export type AdjKey =
  | 'type' | 'size' | 'layout' | 'bathrooms' | 'balconies' | 'floor' | 'age' | 'facing' | 'road' | 'parking' | 'gas';

export interface Adjustment {
  key: AdjKey;
  factor: number; // 1 = no change, 0.9 = -10%
}

export interface PriceResult {
  areaId: string;
  rateMin: number;
  rateMax: number;
  adjustments: Adjustment[];
  factor: number;      // combined factor actually applied (clamped)
  low: number;
  mid: number;
  high: number;
  perSqftMid: number;
}

export interface Improvement {
  key: 'parking' | 'gas' | 'lift';
  gain: number; // extra taka on the middle estimate
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isInt = (v: unknown): v is number => isNum(v) && Number.isInteger(v);

/** Returns an error message, or null when the inputs are usable. */
export function validatePrice(i: unknown): string | null {
  if (!i || typeof i !== 'object') return 'Inputs are missing.';
  const x = i as Record<string, unknown>;
  if (!AREAS.some((a) => a.id === x.area)) return 'Select an area.';
  if (x.type !== 'apartment' && x.type !== 'house') return 'Select a property type.';
  if (!['south', 'east', 'north', 'west'].includes(String(x.facing))) return 'Select which way it faces.';
  if (!['narrow', 'medium', 'wide'].includes(String(x.road))) return 'Select the road width.';
  for (const f of ['sizeSqft', 'bedrooms', 'bathrooms', 'balconies', 'floor', 'buildingAge'])
    if (!isNum(x[f])) return `Please enter a valid number for "${f}".`;
  for (const f of ['hasLift', 'hasParking', 'hasGas']) if (typeof x[f] !== 'boolean') return `Invalid value for "${f}".`;
  const n = x as unknown as PriceInputs;
  if (n.sizeSqft < 200 || n.sizeSqft > 20000) return 'Size must be between 200 and 20,000 sq ft.';
  if (!isInt(n.bedrooms) || n.bedrooms < 1 || n.bedrooms > 10) return 'Bedrooms must be a whole number from 1 to 10.';
  if (!isInt(n.bathrooms) || n.bathrooms < 1 || n.bathrooms > 10) return 'Bathrooms must be a whole number from 1 to 10.';
  if (!isInt(n.balconies) || n.balconies < 0 || n.balconies > 8) return 'Balconies must be a whole number from 0 to 8.';
  if (n.sizeSqft / n.bedrooms < 120) return 'That is too many bedrooms for this size. Check the size and bedrooms.';
  if (!isInt(n.floor) || n.floor < 0 || n.floor > 40) return 'Floor must be a whole number between 0 and 40.';
  if (n.buildingAge < 0 || n.buildingAge > 60) return 'Building age must be between 0 and 60 years.';
  return null;
}

const round = (n: number) => Math.round(n / 10000) * 10000; // nearest 10,000 taka

export function estimatePrice(i: PriceInputs): PriceResult {
  const area = AREAS.find((a) => a.id === i.area) ?? AREAS[AREAS.length - 1];
  const isApt = i.type === 'apartment';

  const typeF = isApt ? 1 : 1.08;
  const sizeF = i.sizeSqft < 700 ? 1.04 : i.sizeSqft <= 1500 ? 1 : i.sizeSqft <= 2500 ? 0.98 : 0.96;

  // layout: how much floor area each bedroom gets (too cramped hurts, roomy helps a little)
  const perBed = i.sizeSqft / i.bedrooms;
  const layoutF = perBed < 250 ? 0.95 : perBed < 350 ? 0.98 : perBed <= 550 ? 1 : 1.02;

  // attached bathrooms: roughly one per bedroom is what buyers want
  const bathRatio = i.bathrooms / i.bedrooms;
  const bathF = bathRatio >= 1 ? 1.04 : bathRatio >= 0.67 ? 1 : 0.96;

  const balconyF = i.balconies === 0 ? 0.98 : i.balconies === 1 ? 1 : i.balconies === 2 ? 1.01 : 1.02;

  let floorF = 1;
  if (isApt) {
    floorF = i.floor === 0 ? 0.93 : i.floor <= 2 ? 0.97 : i.floor <= 6 ? 1 : 1.04;
    if (!i.hasLift) floorF *= i.floor >= 5 ? 0.85 : i.floor === 4 ? 0.92 : 1; // climbing stairs hurts value
  }

  const ageF = Math.max(0.7, 1 - 0.015 * i.buildingAge);
  const faceF = { south: 1.03, east: 1.01, north: 0.99, west: 0.97 }[i.facing];
  const roadF = { narrow: 0.95, medium: 1, wide: 1.05 }[i.road];
  const parkF = i.hasParking ? 1.03 : 1;
  const gasF = i.hasGas ? 1 : 0.97;

  const adjustments: Adjustment[] = [
    { key: 'type', factor: typeF },
    { key: 'size', factor: sizeF },
    { key: 'layout', factor: layoutF },
    { key: 'bathrooms', factor: bathF },
    { key: 'balconies', factor: balconyF },
    { key: 'floor', factor: floorF },
    { key: 'age', factor: ageF },
    { key: 'facing', factor: faceF },
    { key: 'road', factor: roadF },
    { key: 'parking', factor: parkF },
    { key: 'gas', factor: gasF }
  ];
  // keep the combined effect sane even if many small factors line up
  const factor = Math.min(1.35, Math.max(0.55, adjustments.reduce((p, a) => p * a.factor, 1)));

  const mid = round(i.sizeSqft * ((area.min + area.max) / 2) * factor);
  // the range is narrower for areas where prices are more uniform
  const spread = (0.6 * (area.max - area.min)) / (area.max + area.min);
  const low = round(mid * (1 - spread));
  const high = round(mid * (1 + spread));

  return {
    areaId: area.id, rateMin: area.min, rateMax: area.max, adjustments, factor,
    low, mid, high, perSqftMid: Math.round(mid / i.sizeSqft)
  };
}

/** Features the property lacks that would add value, with the extra taka each would add. */
export function suggestImprovements(i: PriceInputs): Improvement[] {
  const base = estimatePrice(i).mid;
  const out: Improvement[] = [];
  const test = (key: Improvement['key'], changed: PriceInputs) => {
    const gain = estimatePrice(changed).mid - base;
    if (gain > 0) out.push({ key, gain });
  };
  if (!i.hasParking) test('parking', { ...i, hasParking: true });
  if (!i.hasGas) test('gas', { ...i, hasGas: true });
  if (!i.hasLift && i.type === 'apartment') test('lift', { ...i, hasLift: true });
  return out.sort((a, b) => b.gain - a.gain).slice(0, 3);
}