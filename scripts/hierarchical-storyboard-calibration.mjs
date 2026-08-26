import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

const MODEL_TEXT = 'fal-ai/flux-2/flash';
const MODEL_EDIT = 'fal-ai/flux-2/flash/edit';
const UNIT_PRICE_USD = 0.005;
const CAP_USD = Number(process.env.LUMEN_HIERARCHY_CAP_USD ?? 0.4);
const CONCEPT_PATH = process.env.LUMEN_HIERARCHY_CONCEPT
  ?? '/Users/juan/.codex/generated_images/01a039c7-d209-7a90-97cd-21f12829cede/exec-61aba332-d08c-41ec-9b33-401829ac001a.png';
const outputRoot = process.env.LUMEN_HIERARCHY_OUTPUT
  ?? path.join('/private/tmp', `lumen-still-pool-${new Date().toISOString().replace(/[:.]/g, '-')}`);

if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not available.');
fal.config({ credentials: process.env.FAL_KEY });

const conceptBytes = await readFile(CONCEPT_PATH);
const concept = {
  id: 'concept-style',
  label: 'PHOTOGRAPHIC LANGUAGE — original The Still Pool concept frame',
  url: `data:image/png;base64,${conceptBytes.toString('base64')}`,
};

const visualLanguage = [
  'original grounded supernatural independent film photographed on tactile 16mm',
  'subtle anamorphic distortion and realistic faces',
  'cold mint fluorescent spill with one amber maintenance practical',
  'lavender tile, canary yellow, moss green, red accents, and dense black water',
  'quiet uncanny tension, restrained performances, no glossy fantasy effects',
].join(', ');

const records = [];
const assets = new Map();
let estimatedSpendUsd = 0;

function estimatedCost(referenceCount) {
  return UNIT_PRICE_USD * (referenceCount + 1);
}

async function generate({ id, label, prompt, references = [] }) {
  const nextCost = estimatedCost(references.length);
  if (estimatedSpendUsd + nextCost > CAP_USD) {
    throw new Error(`Budget stop: $${(estimatedSpendUsd + nextCost).toFixed(3)} would exceed $${CAP_USD.toFixed(2)}.`);
  }
  const model = references.length ? MODEL_EDIT : MODEL_TEXT;
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
  estimatedSpendUsd += nextCost;
  const asset = {
    id,
    label,
    url: image.url,
    path: destination,
    seed: result.data.seed ?? null,
  };
  assets.set(id, asset);
  records.push({
    ...asset,
    model,
    prompt,
    references: references.map((reference) => reference.id),
    estimatedCostUsd: nextCost,
    elapsedMs: Date.now() - startedAt,
  });
  console.log(`${id} · ${model} · $${nextCost.toFixed(3)} estimated · ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  return asset;
}

function assemblePrompt({ title, referenceLabels, direction, rules = [] }) {
  return [
    `Create one complete full-bleed cinematic image: ${title}.`,
    '',
    'REFERENCE IMAGES IN ORDER:',
    ...referenceLabels.map((label, index) => `Image ${index + 1}: ${label}`),
    '',
    `DIRECTION: ${direction}`,
    '',
    `VISUAL LANGUAGE: ${visualLanguage}.`,
    '',
    'Reference rules:',
    '- Each image owns only its labeled subject or role. Do not transfer faces, clothing, props, or architecture between subjects.',
    '- Preserve explicit quantities and ownership exactly.',
    ...rules.map((rule) => `- ${rule}`),
    '- Render one coherent image only. No collage, split screen, character sheet, border, caption, watermark, or text overlay.',
  ].join('\n');
}

await mkdir(outputRoot, { recursive: true });
console.log(`Output: ${outputRoot}`);
console.log(`Authorized hierarchy cap: $${CAP_USD.toFixed(2)} · planned Fal estimate: $0.250`);

const [noriIdentity, noriWardrobe, judeIdentity, judeWardrobe] = await Promise.all([
  generate({
    id: 'identity-nori',
    label: 'IDENTITY — Nori Vale',
    prompt: `Create one clean cinematic identity anchor for Nori Vale, a 32-year-old Japanese-American woman with a lean build, angular oval face, sharp black pixie haircut, dark brown eyes, and one small mole directly below her left eye. Neutral charcoal crewneck and dark neutral trousers only; no yellow shirt, rain gear, boots, jewelry, key, cord, or other story prop. Three-quarter full-body portrait against a simple gray municipal locker-room wall, natural expression, both hands visible. Realistic human proportions and skin texture. This frame defines identity only, not wardrobe or scene. No other person, text, collage, or border.`,
  }),
  generate({
    id: 'wardrobe-nori',
    label: 'WARDROBE — Nori pool look',
    prompt: `Create one cinematic wardrobe anchor with no person present: a faded canary-yellow short-sleeve bowling shirt, black fitted thermal undershirt, dark straight-leg denim, and knee-high red rubber boots arranged clearly on a plain industrial changing-room bench. Include one clean white cotton hand bandage as part of the look. Show construction, color, and texture accurately. No mannequin, body, face, key, red cord, text, collage, or border.`,
  }),
  generate({
    id: 'identity-jude',
    label: 'IDENTITY — Jude Bell',
    prompt: `Create one clean cinematic identity anchor for Jude Bell, a slight 16-year-old white boy with a narrow freckled face, close copper curls, gray-green eyes, and a small silver hearing aid tucked behind his right ear. Neutral gray crewneck and dark neutral trousers only; no green blazer, uniform crest, key, cord, or scene prop. Three-quarter full-body portrait against a simple gray municipal locker-room wall, guarded expression, both hands visible. Age-appropriate, realistic proportions and skin texture. This frame defines identity only, not wardrobe or scene. No other person, text, collage, or border.`,
  }),
  generate({
    id: 'wardrobe-jude',
    label: 'WARDROBE — Jude school look',
    prompt: `Create one cinematic wardrobe anchor with no person present: an oversized worn moss-green school blazer with a small circular bronze-and-blue embroidered crest, a cream button-front school shirt, charcoal wide-leg trousers, and scuffed black lace-up shoes arranged clearly on a plain industrial changing-room bench. Show construction, color, wear, and scale accurately. No mannequin, body, face, hearing aid, key, red cord, text, collage, or border.`,
  }),
]);

const [noriLook, judeLook, poolLocation, houseKey] = await Promise.all([
  generate({
    id: 'look-nori-pool',
    label: 'APPROVED LOOK — Nori at the pool',
    references: [noriIdentity, noriWardrobe, concept],
    prompt: assemblePrompt({
      title: 'approved full-body look anchor for Nori Vale',
      referenceLabels: [
        'IDENTITY ONLY — preserve Nori’s exact face, mole, build, and pixie haircut',
        'WARDROBE ONLY — dress Nori in these exact garments and red boots; bandage her right palm',
        'PHOTOGRAPHIC LANGUAGE ONLY — borrow lighting, texture, and restrained film mood; do not copy its people or composition',
      ],
      direction: 'Nori stands alone on a lavender-tiled pool deck, three-quarter full-body view, wearing the complete approved pool look. Her bandaged right palm is visible. No key, cord, bag, or other prop. One person only.',
    }),
  }),
  generate({
    id: 'look-jude-pool',
    label: 'APPROVED LOOK — Jude at the pool',
    references: [judeIdentity, judeWardrobe, concept],
    prompt: assemblePrompt({
      title: 'approved full-body look anchor for Jude Bell',
      referenceLabels: [
        'IDENTITY ONLY — preserve Jude’s exact face, freckles, curls, build, age, and right-ear hearing aid',
        'WARDROBE ONLY — dress Jude in these exact garments and shoes',
        'PHOTOGRAPHIC LANGUAGE ONLY — borrow lighting, texture, and restrained film mood; do not copy its people or composition',
      ],
      direction: 'Jude stands alone on a lavender-tiled pool deck, three-quarter full-body view, wearing the complete approved school look. His silver hearing aid remains visible behind his right ear. No key, cord, bag, or other prop. One person only.',
    }),
  }),
  generate({
    id: 'location-still-pool',
    label: 'LOCATION STATE — drained municipal pool at midnight',
    references: [concept],
    prompt: assemblePrompt({
      title: 'empty location master for the Still Pool',
      referenceLabels: ['ARCHITECTURE AND PHOTOGRAPHIC LANGUAGE — retain the pool’s spatial identity and lighting only; remove all people and portable objects'],
      direction: 'A spatially legible empty establishing frame of a vast drained 1970s brutalist indoor municipal swimming pool at midnight: pale lavender square tiles, enormous black lane numbers, central twelve-meter concrete diving tower, dead scoreboard, one magenta EXIT sign, and a narrow channel of dense black water at the deepest point. No people, clothing, key, cord, bags, or movable props.',
    }),
  }),
  generate({
    id: 'prop-house-key',
    label: 'HERO PROP — ceramic house key',
    prompt: `Create one cinematic hero-prop anchor with no person present: a small matte white ceramic key shaped like a simple house silhouette, threaded onto exactly one narrow red cotton cord. It rests on a damp pale-lavender ceramic pool tile. Make its form, scale, ceramic texture, and cord attachment unmistakable. One key and one cord only. No hand, person, jewelry, additional keys, text, collage, or border. ${visualLanguage}.`,
  }),
]);

const sceneMaster = await generate({
  id: 'scene-master',
  label: 'SCENE MASTER — Nori meets Jude across the Still Pool',
  references: [noriLook, judeLook, poolLocation, houseKey],
  prompt: assemblePrompt({
    title: 'scene master for Nori and Jude’s meeting',
    referenceLabels: [
      'APPROVED NORI LOOK — exact identity and pool wardrobe; no prop belongs to this source',
      'APPROVED JUDE LOOK — exact identity and school wardrobe; keep the hearing aid',
      'LOCATION STATE — exact pool architecture, geography, black-water channel, and lighting',
      'HERO PROP — the only ceramic house key and red cord in the scene',
    ],
    direction: 'Symmetrical very wide master shot from pool-deck height. Nori stands camera-left and Jude camera-right across the deep end. The single ceramic house key on its single red cord lies midway between them on the lavender tile. Exactly two people. Establish screen direction and spatial geography clearly.',
  }),
});

const shotSpecs = [
  {
    id: 'shot-01-nori-descends',
    label: 'SHOT 01 — Nori descends',
    refs: [noriLook, poolLocation, houseKey, sceneMaster],
    labels: ['APPROVED NORI LOOK', 'LOCATION STATE', 'HERO PROP — present only as a tiny distant object', 'SCENE MASTER — geography and screen direction only'],
    direction: 'High wide shot from behind Nori as she climbs down a rusted ladder into the empty pool basin. Nori is the only visible person. Jude remains out of frame. The ceramic key and red cord are a tiny object far across the tiles. Preserve the diving tower and black-water channel without copying the master composition.',
  },
  {
    id: 'shot-02-jude-waits',
    label: 'SHOT 02 — Jude waits',
    refs: [judeLook, poolLocation, houseKey, sceneMaster],
    labels: ['APPROVED JUDE LOOK', 'LOCATION STATE', 'HERO PROP — exactly one key and cord', 'SCENE MASTER — geography and screen direction only'],
    direction: 'Medium-long shot from Nori’s point of view. Jude stands alone at the lip of the black-water channel beneath the dead scoreboard, camera-right, looking toward Nori offscreen. His hearing aid is visible. The one ceramic key on its red cord lies near his left shoe. Nori is not visible.',
  },
  {
    id: 'shot-03-the-signal',
    label: 'SHOT 03 — The signal',
    refs: [noriLook, judeLook, sceneMaster, null],
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE LOOK', 'SCENE MASTER — geography and lighting', 'PREVIOUS SELECTED SHOT — world state and Jude’s screen position'],
    direction: 'Tense medium two-shot across the black-water channel. Nori remains camera-left in the foreground; Jude remains camera-right. Jude removes the small silver hearing aid from behind his right ear and holds it between thumb and forefinger. Nori watches his hand. Exactly two people, one hearing aid, no ceramic key visible in this composition.',
  },
  {
    id: 'shot-04-the-key',
    label: 'SHOT 04 — The key',
    refs: [noriLook, judeLook, houseKey, null],
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE LOOK', 'HERO PROP — exactly one key and cord', 'PREVIOUS SELECTED SHOT — identities, lighting, and screen direction'],
    direction: 'Intimate waist-level close two-shot. Jude, camera-right, extends exactly one ceramic house key on its red cord toward Nori. Nori, camera-left, reaches with her bandaged right palm but has not touched it yet. Both faces remain visible in profile. Exactly two people, one key, one red cord, one bandaged hand.',
  },
  {
    id: 'shot-05-water-above',
    label: 'SHOT 05 — Water above',
    refs: [noriLook, judeLook, sceneMaster, null],
    labels: ['APPROVED NORI LOOK', 'APPROVED JUDE LOOK', 'SCENE MASTER — architecture and original world state', 'PREVIOUS SELECTED SHOT — identities and current staging'],
    direction: 'Very wide low-angle frame from the pool floor. Nori and Jude stand side-by-side, small in frame, looking upward. A perfectly flat plane of dense black water now hangs impossibly across the ceiling above the diving tower, reflecting their two silhouettes. The pool floor beneath them remains dry except for the original narrow channel. Exactly two people; quiet physical realism, no explosive magic effects.',
  },
];

let previousShot = null;
for (const shot of shotSpecs) {
  const references = shot.refs.map((reference) => reference ?? previousShot);
  if (references.some((reference) => !reference)) throw new Error(`Missing previous shot for ${shot.id}.`);
  previousShot = await generate({
    id: shot.id,
    label: shot.label,
    references,
    prompt: assemblePrompt({
      title: shot.label,
      referenceLabels: shot.labels,
      direction: shot.direction,
      rules: [
        'Approved look references define identity and wardrobe; do not redesign them.',
        'A previous shot defines continuity state only; create the new requested camera setup.',
      ],
    }),
  });
}

await generate({
  id: 'flat-baseline-shot-04',
  label: 'FLAT BASELINE — The key',
  references: [noriIdentity, judeIdentity, poolLocation, houseKey],
  prompt: assemblePrompt({
    title: 'flat-reference baseline of the key handoff',
    referenceLabels: ['RAW NORI IDENTITY', 'RAW JUDE IDENTITY', 'LOCATION STATE', 'HERO PROP'],
    direction: 'Without an approved wardrobe-look anchor or scene master, create an intimate waist-level close two-shot in the drained pool. Nori wears a faded canary bowling shirt, black thermal, dark denim, red rubber boots, and a white bandage on her right palm. Jude wears a moss-green school blazer, cream shirt, charcoal trousers, black shoes, and his silver right-ear hearing aid. Jude extends exactly one ceramic house key on one red cord toward Nori. Preserve both identities and the pool location.',
    rules: ['This is the flat-reference comparison frame; follow the written wardrobe descriptions exactly.'],
  }),
});

const report = {
  createdAt: new Date().toISOString(),
  project: 'The Still Pool',
  method: 'hierarchical identity → wardrobe → look → location/prop → scene master → shots',
  conceptPath: CONCEPT_PATH,
  authorizedCapUsd: CAP_USD,
  estimatedSpendUsd: Math.round(estimatedSpendUsd * 1000) / 1000,
  outputRoot,
  records,
};
await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Complete · estimated Fal spend $${estimatedSpendUsd.toFixed(3)} · ${records.length} generated images`);
console.log(`REPORT_PATH=${path.join(outputRoot, 'report.json')}`);
