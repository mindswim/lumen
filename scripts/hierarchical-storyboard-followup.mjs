import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

const MODEL_TEXT = 'fal-ai/flux-2/flash';
const MODEL_EDIT = 'fal-ai/flux-2/flash/edit';
const UNIT_PRICE_USD = 0.005;
const CAP_USD = Number(process.env.LUMEN_HIERARCHY_CAP_USD ?? 0.3);
const base = process.env.LUMEN_HIERARCHY_BASE;
if (!base) throw new Error('Set LUMEN_HIERARCHY_BASE to the first hierarchy-test output directory.');
if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not available.');
fal.config({ credentials: process.env.FAL_KEY });

const outputRoot = path.join(base, 'corrected-state-pass');
const original = JSON.parse(await readFile(path.join(base, 'report.json'), 'utf8'));
const priorAssets = new Map(original.records.map((record) => [record.id, record]));
const records = [];
const assets = new Map();
let estimatedSpendUsd = 0;

const visualLanguage = [
  'original grounded supernatural independent film photographed on tactile 16mm',
  'subtle anamorphic distortion and realistic faces',
  'cold mint fluorescent spill with one amber maintenance practical',
  'lavender tile, canary yellow, moss green, red accents, and dense black water',
  'quiet uncanny tension, restrained performances, no glossy fantasy effects',
].join(', ');

function prior(id) {
  const asset = priorAssets.get(id);
  if (!asset) throw new Error(`Missing prior asset ${id}.`);
  return asset;
}

async function generate({ id, label, prompt, references = [] }) {
  const cost = UNIT_PRICE_USD * (references.length + 1);
  if (estimatedSpendUsd + cost > CAP_USD) throw new Error(`Budget stop at $${CAP_USD.toFixed(2)}.`);
  const startedAt = Date.now();
  const model = references.length ? MODEL_EDIT : MODEL_TEXT;
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
  const asset = { id, label, url: image.url, path: destination, seed: result.data.seed ?? null };
  assets.set(id, asset);
  records.push({
    ...asset,
    model,
    prompt,
    references: references.map((reference) => reference.id),
    estimatedCostUsd: cost,
    elapsedMs: Date.now() - startedAt,
  });
  console.log(`${id} · $${cost.toFixed(3)} estimated · ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  return asset;
}

function framePrompt({ title, labels, direction, extra = [] }) {
  return [
    `Create one complete full-bleed cinematic image: ${title}.`,
    '',
    'REFERENCE IMAGES IN ORDER:',
    ...labels.map((label, index) => `Image ${index + 1}: ${label}`),
    '',
    `DIRECTION: ${direction}`,
    '',
    `VISUAL LANGUAGE: ${visualLanguage}.`,
    '',
    'Rules:',
    '- Each reference owns only its labeled subject. Do not transfer wardrobe, faces, accessories, props, or architecture between sources.',
    '- Respect explicit quantities, possession, visibility, and story state exactly.',
    ...extra.map((rule) => `- ${rule}`),
    '- One coherent image only. No collage, split screen, character sheet, border, caption, watermark, or text overlay.',
  ].join('\n');
}

await mkdir(outputRoot, { recursive: true });
console.log(`Output: ${outputRoot}`);
console.log(`Corrected-pass cap: $${CAP_USD.toFixed(2)} · planned Fal estimate: $0.210`);

const [noriLook, judeCleanIdentity, hearingAid] = await Promise.all([
  generate({
    id: 'look-nori-corrected',
    label: 'APPROVED LOOK — Nori, subject-isolated assembly',
    references: [prior('identity-nori'), prior('wardrobe-nori')],
    prompt: framePrompt({
      title: 'subject-isolated approved look for Nori Vale',
      labels: ['IDENTITY ONLY — exact face, mole, body, and pixie haircut', 'WARDROBE ONLY — exact yellow shirt, black thermal, dark denim, red boots, and one right-palm bandage'],
      direction: 'Nori stands alone in a simple empty locker-room threshold, three-quarter full-body view. Dress her in the exact wardrobe. Wrap only her right palm and wrist in one white bandage; left hand remains bare. No pool scene, other person, key, cord, bag, or portable prop.',
      extra: ['No visual-style image containing another person is attached; derive film texture only from the written visual language.'],
    }),
  }),
  generate({
    id: 'identity-jude-no-device',
    label: 'IDENTITY STATE — Jude without hearing aid',
    references: [prior('identity-jude')],
    prompt: framePrompt({
      title: 'clean identity state for Jude Bell without his hearing aid',
      labels: ['IDENTITY — preserve Jude’s exact face, freckles, copper curls, age, and body; remove only the hearing aid'],
      direction: 'The same Jude in the same neutral gray crewneck and trousers against the same locker-room wall. His right ear is bare: no hearing aid, earpiece, earbud, jewelry, or device anywhere in the frame. One person only.',
    }),
  }),
  generate({
    id: 'prop-hearing-aid',
    label: 'ACCESSORY PROP — Jude’s hearing aid',
    prompt: `Create one cinematic hero-prop anchor with no person present: exactly one small silver behind-the-ear hearing aid with a clear molded earpiece, resting on a plain damp lavender ceramic pool tile. Construction and scale unmistakable. No ear, hand, person, second device, key, cord, jewelry, text, collage, or border. ${visualLanguage}.`,
  }),
]);

const judeRemovedLook = await generate({
  id: 'look-jude-device-removed',
  label: 'APPROVED STATE — Jude in uniform, hearing aid removed',
  references: [judeCleanIdentity, prior('wardrobe-jude')],
  prompt: framePrompt({
    title: 'subject-isolated approved look for Jude with hearing aid removed',
    labels: ['IDENTITY ONLY — exact Jude with bare right ear', 'WARDROBE ONLY — exact moss-green blazer, cream shirt, charcoal trousers, and black shoes'],
    direction: 'Jude stands alone in a simple empty locker-room threshold, three-quarter full-body view, wearing the complete green school uniform. His right ear remains completely bare. No yellow shirt, red boots, hearing aid, key, cord, other person, or portable prop.',
    extra: ['The blazer remains moss green; never recolor it yellow.'],
  }),
});

const judeWornLook = await generate({
  id: 'look-jude-device-worn',
  label: 'APPROVED STATE — Jude in uniform, hearing aid worn',
  references: [judeRemovedLook, hearingAid],
  prompt: framePrompt({
    title: 'approved Jude state with his single hearing aid worn',
    labels: ['APPROVED JUDE LOOK — exact face and green uniform, bare ear in source', 'ACCESSORY PROP — the only silver hearing aid'],
    direction: 'Preserve Jude and the green school uniform exactly. Place the single silver hearing aid correctly behind his right ear with its clear earpiece in the ear. He stands alone. Exactly one hearing aid; no device in either hand, no second device, yellow shirt, red boots, key, or cord.',
  }),
});

const sceneMaster = await generate({
  id: 'scene-master-corrected',
  label: 'SCENE MASTER — corrected character states',
  references: [noriLook, judeWornLook, prior('location-still-pool'), prior('prop-house-key')],
  prompt: framePrompt({
    title: 'corrected scene master for The Still Pool',
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE LOOK — moss-green uniform and one right-ear hearing aid', 'EMPTY LOCATION STATE', 'HERO PROP — one ceramic key and one red cord'],
    direction: 'Symmetrical very wide master shot. Nori stands camera-left, Jude camera-right, and the single ceramic house key on its single red cord lies midway between them. Nori wears yellow and red boots; Jude wears moss green, charcoal trousers, black shoes, and no yellow or red boots. Exactly two people and one key.',
  }),
});

const shotSpecs = [
  {
    id: 'shot-01-corrected',
    label: 'SHOT 01 — Nori descends',
    refs: [noriLook, prior('location-still-pool'), prior('prop-house-key'), sceneMaster],
    labels: ['APPROVED NORI LOOK', 'EMPTY LOCATION STATE', 'HERO PROP — tiny and distant', 'CORRECTED SCENE MASTER — geography only'],
    direction: 'High wide rear shot as Nori descends a rusted ladder into the dry pool basin. Nori is the only person. The dense black water remains confined to the narrow deepest channel; most pool tile is dry. The single key is a tiny distant object. Jude is fully out of frame.',
  },
  {
    id: 'shot-02-corrected',
    label: 'SHOT 02 — Jude waits',
    refs: [judeWornLook, prior('location-still-pool'), prior('prop-house-key'), sceneMaster],
    labels: ['APPROVED JUDE WORN STATE', 'EMPTY LOCATION STATE', 'HERO PROP', 'CORRECTED SCENE MASTER — geography only'],
    direction: 'Medium-long isolated shot of Jude alone, camera-right at the lip of the black-water channel beneath the dead scoreboard. His moss-green blazer, black shoes, and single right-ear hearing aid are visible. The one ceramic key and red cord lie near his left shoe. Nori is completely out of frame: no foreground head, body, silhouette, reflection, or shadow.',
  },
  {
    id: 'shot-03-corrected',
    label: 'SHOT 03 — The signal',
    refs: [noriLook, judeRemovedLook, hearingAid, null],
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE REMOVED STATE — green uniform and bare right ear', 'ACCESSORY PROP — exactly one hearing aid', 'PREVIOUS SHOT — location, light, and screen direction only'],
    direction: 'Tense medium two-shot. Nori remains camera-left; Jude remains camera-right. Jude’s right ear is visibly bare while he holds exactly one small silver hearing aid between thumb and forefinger. No second device in either ear, hand, pocket, or background. No ceramic key visible.',
  },
  {
    id: 'shot-04-corrected',
    label: 'SHOT 04 — The key',
    refs: [noriLook, judeRemovedLook, prior('prop-house-key'), null],
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE REMOVED STATE — green uniform, bare ear', 'HERO PROP — exactly one key and cord', 'PREVIOUS SHOT — identities, light, and screen direction'],
    direction: 'Intimate waist-level close two-shot. Jude, camera-right in moss green and black shoes, extends exactly one ceramic house key on one red cord toward Nori. Nori, camera-left, reaches with her single bandaged right palm. Both faces visible in profile. No hearing aid is worn or visible; no duplicate key or cord.',
  },
  {
    id: 'shot-05-corrected',
    label: 'SHOT 05 — Water above',
    refs: [noriLook, judeRemovedLook, sceneMaster, null],
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE REMOVED STATE — moss-green uniform', 'CORRECTED SCENE MASTER — architecture and initial water state', 'PREVIOUS SHOT — current character state and staging'],
    direction: 'Very wide low-angle frame. Nori and Jude stand side-by-side, small in frame, looking upward. A flat plane of dense black water hangs impossibly across the ceiling above the diving tower, reflecting exactly their two silhouettes. The tiled floor beneath them is dry except for the original narrow deepest channel. Nori remains yellow with red boots; Jude remains moss green with black shoes and a bare right ear.',
  },
];

let previous = null;
for (const shot of shotSpecs) {
  const references = shot.refs.map((reference) => reference ?? previous);
  if (references.some((reference) => !reference)) throw new Error(`Missing previous shot for ${shot.id}.`);
  previous = await generate({
    id: shot.id,
    label: shot.label,
    references,
    prompt: framePrompt({
      title: shot.label,
      labels: shot.labels,
      direction: shot.direction,
      extra: ['Previous shots provide world state only; the explicit character-state references override any outdated wardrobe or accessory state.'],
    }),
  });
}

const report = {
  createdAt: new Date().toISOString(),
  purpose: 'Correct style leakage and model a removable accessory as explicit worn/removed states',
  sourceReport: path.join(base, 'report.json'),
  authorizedCapUsd: CAP_USD,
  estimatedSpendUsd: Math.round(estimatedSpendUsd * 1000) / 1000,
  outputRoot,
  records,
};
await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Complete · estimated corrected-pass spend $${estimatedSpendUsd.toFixed(3)} · ${records.length} images`);
console.log(`REPORT_PATH=${path.join(outputRoot, 'report.json')}`);
