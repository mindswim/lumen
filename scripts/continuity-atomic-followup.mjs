import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

const MODEL_TEXT = 'fal-ai/flux-2/flash';
const MODEL_EDIT = 'fal-ai/flux-2/flash/edit';
const UNIT_PRICE_USD = 0.005;
const base = process.env.LUMEN_CALIBRATION_BASE;
const capUsd = Number(process.env.LUMEN_CALIBRATION_CAP_USD ?? 0.1);

if (!base) throw new Error('Set LUMEN_CALIBRATION_BASE to a completed calibration output directory.');
if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not available.');
fal.config({ credentials: process.env.FAL_KEY });

const outputRoot = path.join(base, 'atomic-followup');
const original = JSON.parse(await readFile(path.join(base, 'report.json'), 'utf8'));
const existing = new Map(original.records.map((record) => [record.id, record]));
const records = [];
let estimatedSpendUsd = 0;

const style = [
  'grounded 1970s political thriller photographed on fine-grain 35mm film',
  'restrained naturalistic performances',
  'wet cyan-blue dawn with sodium-vapor amber practical lights',
  'subtle halation, restrained saturation, realistic skin texture',
  'cinematic widescreen composition',
].join(', ');

async function run({ id, model, prompt, references = [] }) {
  const cost = UNIT_PRICE_USD * (references.length + 1);
  if (estimatedSpendUsd + cost > capUsd) throw new Error(`Follow-up would exceed its $${capUsd.toFixed(2)} cap.`);
  const startedAt = Date.now();
  const result = await fal.subscribe(model, {
    input: {
      prompt,
      image_size: 'landscape_16_9',
      num_images: 1,
      enable_prompt_expansion: false,
      enable_safety_checker: true,
      output_format: 'jpeg',
      ...(references.length ? { image_urls: references.map((reference) => reference.url) } : {}),
    },
  });
  const image = result.data.images?.[0];
  if (!image?.url) throw new Error(`${id} returned no image.`);
  const response = await fetch(image.url);
  if (!response.ok) throw new Error(`Could not download ${id}: ${response.status}`);
  const destination = path.join(outputRoot, `${id}.jpg`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  estimatedSpendUsd += cost;
  const record = {
    id,
    model,
    url: image.url,
    path: destination,
    seed: result.data.seed ?? null,
    references: references.map((reference) => reference.id),
    prompt,
    estimatedCostUsd: cost,
    elapsedMs: Date.now() - startedAt,
  };
  records.push(record);
  console.log(`${id} · $${cost.toFixed(3)} estimated · ${(record.elapsedMs / 1000).toFixed(1)}s`);
  return record;
}

await mkdir(outputRoot, { recursive: true });

const mara = await run({
  id: 'ref-mara-atomic',
  model: MODEL_TEXT,
  prompt: `Create one full-bleed cinematic character anchor image, not a character sheet or collage. Mara Venn is a 34-year-old woman with olive skin, a blunt black bob, one narrow copper streak above her left temple, and a thin crescent scar through her right eyebrow. She wears a mustard-yellow waxed raincoat over a navy ribbed sweater and dark trousers. Three-quarter full-body environmental portrait beneath a harbor awning, neutral alert expression, both hands visible. This image defines Mara only: no bag, satchel, luggage, handheld object, or other prop. ${style}. No text, no border, no duplicate person.`,
});

const ilya = existing.get('ref-ilya');
const terminal = existing.get('ref-terminal');
const satchel = existing.get('ref-satchel');
if (!ilya || !terminal || !satchel) throw new Error('The original report is missing a required anchor.');

await run({
  id: 'shot-02-atomic',
  model: MODEL_EDIT,
  references: [mara, ilya, terminal, satchel],
  prompt: [
    'Create one complete cinematic storyboard frame: The signal.',
    '',
    'REFERENCE IMAGES IN ORDER:',
    'Image 1: CHARACTER — Mara Venn. This reference defines only Mara and her wardrobe.',
    'Image 2: CHARACTER — Captain Ilya Ross. This reference defines only Ilya and his wardrobe.',
    'Image 3: LOCATION — North Quay terminal. This reference defines only the architecture.',
    'Image 4: OBJECT — evidence satchel. This reference defines the only satchel in the frame.',
    '',
    'Medium two-shot across rain-streaked ticket-booth glass. Mara stands outside the booth in her mustard raincoat with exactly one oxblood satchel at her left hip. Captain Ilya stands inside in his burgundy coat and teal scarf, raising two fingers in a discreet signal. Ilya carries no bag and touches no bag. No other bag, briefcase, purse, or luggage is present. Keep both faces exactly consistent with their character anchors. The sea-green terminal tiles and brass clock remain visible in the background. New composition, not a collage.',
    '',
    `GLOBAL VISUAL LANGUAGE: ${style}.`,
    '',
    'Render one full-bleed image only. No duplicate character, duplicate prop, collage, border, caption, or text overlay. Keep hands anatomically plausible.',
  ].join('\n'),
});

const report = {
  createdAt: new Date().toISOString(),
  purpose: 'Atomic-reference and explicit-ownership follow-up',
  sourceReport: path.join(base, 'report.json'),
  authorizedCapUsd: capUsd,
  estimatedSpendUsd,
  records,
};
await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Complete · estimated follow-up spend $${estimatedSpendUsd.toFixed(3)}`);
console.log(`REPORT_PATH=${path.join(outputRoot, 'report.json')}`);
