import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fal } from '@fal-ai/client';

const MODEL_TEXT = 'fal-ai/flux-2/flash';
const MODEL_EDIT = 'fal-ai/flux-2/flash/edit';
const UNIT_PRICE_USD = 0.005;
const AUTHORIZED_CAP_USD = Number(process.env.LUMEN_CALIBRATION_CAP_USD ?? 1);
const outputRoot = process.env.LUMEN_CALIBRATION_OUTPUT
  ?? path.join('/private/tmp', `lumen-continuity-${new Date().toISOString().replace(/[:.]/g, '-')}`);

if (!process.env.FAL_KEY) throw new Error('FAL_KEY is not available.');
fal.config({ credentials: process.env.FAL_KEY });

const style = [
  'grounded 1970s political thriller photographed on fine-grain 35mm film',
  'restrained naturalistic performances',
  'wet cyan-blue dawn with sodium-vapor amber practical lights',
  'subtle halation, restrained saturation, realistic skin texture',
  'cinematic widescreen composition',
].join(', ');

const anchorSpecs = [
  {
    id: 'ref-mara',
    label: 'CHARACTER — Mara Venn',
    prompt: `Create one full-bleed cinematic character anchor image, not a character sheet or collage. Mara Venn is a 34-year-old woman with olive skin, a blunt black bob, one narrow copper streak above her left temple, and a thin crescent scar through her right eyebrow. She wears a mustard-yellow waxed raincoat over a navy ribbed sweater and dark trousers. Three-quarter full-body environmental portrait beneath a harbor awning, neutral alert expression, both hands visible. This image defines Mara only: no bag, satchel, luggage, handheld object, or other prop. ${style}. No text, no border, no duplicate person.`,
  },
  {
    id: 'ref-ilya',
    label: 'CHARACTER — Captain Ilya Ross',
    prompt: `Create one full-bleed cinematic character anchor image, not a character sheet or collage. Captain Ilya Ross is a 61-year-old Black harbor master with close-cropped silver hair, a neat silver mustache, rectangular tortoiseshell glasses, and a calm guarded expression. He wears a deep burgundy double-breasted harbor-master coat, teal wool scarf, and a brass key ring at his belt. Three-quarter full-body environmental portrait inside a ticket booth, both hands visible. ${style}. No text, no border, no duplicate person.`,
  },
  {
    id: 'ref-terminal',
    label: 'LOCATION — North Quay terminal',
    prompt: `Create one full-bleed cinematic location anchor image of the North Quay ferry terminal: a compact 1930s Art Deco ticket hall with sea-green ceramic wall tiles, a circular brass clock above the ticket booth with the numeral IV missing, rain-streaked steel-framed windows, shallow water across black-and-cream terrazzo, and a faded red FERRY EXIT sign above double doors. Empty establishing view, architecture clear and spatially legible. ${style}. No people, no text overlay, no collage, no border.`,
  },
  {
    id: 'ref-satchel',
    label: 'OBJECT — evidence satchel',
    prompt: `Create one full-bleed cinematic prop anchor image of a worn oxblood-red leather courier satchel with a distinctive triangular brass clasp, one black canvas shoulder strap, a small repaired tear on the lower right corner, and a cream envelope barely visible inside. The satchel rests on a wet dark ticket counter, three-quarter product view with scale and construction obvious. ${style}. No hands, no person, no text overlay, no collage, no border.`,
  },
];

const shotSpecs = [
  {
    id: 'shot-01',
    title: 'Arrival at North Quay',
    refs: ['ref-mara', 'ref-terminal', 'ref-satchel'],
    direction: 'Wide establishing shot from behind and slightly above Mara as she descends six wet stone steps into the flooded North Quay ticket hall. Her mustard raincoat and oxblood satchel are unmistakable. The sea-green tiles, broken-numeral brass clock, booth, windows, terrazzo water, and red ferry doors establish geography. Mara is the only person. Preserve her exact identity and outfit while showing a new rear three-quarter angle.',
  },
  {
    id: 'shot-02',
    title: 'The signal',
    refs: ['ref-mara', 'ref-ilya', 'ref-terminal', 'ref-satchel'],
    direction: 'Medium two-shot across rain-streaked ticket-booth glass. Mara stands outside the booth in her mustard raincoat, red satchel at her left hip; Captain Ilya stands inside in his burgundy coat and teal scarf, raising two fingers in a discreet signal. Keep both faces exactly consistent with their character anchors. The sea-green terminal tiles and broken-numeral clock remain visible in the background. New composition, not a collage.',
  },
  {
    id: 'shot-03',
    title: 'Soldiers enter',
    refs: ['ref-mara', 'ref-ilya', 'ref-terminal', 'shot-02'],
    direction: 'Low, wide shot at water level as Mara crouches beside the ticket booth and Captain Ilya silently unlatches its side door. Two distant soldiers enter through the red ferry doors in soft background focus. Mara retains her mustard raincoat, blunt bob with copper streak, eyebrow scar, and satchel at left hip. Ilya retains silver hair, mustache, tortoiseshell glasses, burgundy coat, and teal scarf. Preserve the terminal geography and same cyan dawn with amber practical light.',
  },
  {
    id: 'shot-04',
    title: 'The handoff',
    refs: ['ref-mara', 'ref-ilya', 'ref-satchel', 'shot-03'],
    direction: 'Tight over-the-counter handoff with both characters still recognizable in shallow-focus profile. Mara opens the same oxblood satchel with triangular brass clasp and passes the cream envelope to Captain Ilya. Mara remains on camera-left in mustard raincoat; Ilya remains camera-right in burgundy coat, teal scarf, glasses, and silver mustache. The repaired tear on the satchel remains lower right. Same wet terminal light, intimate 50mm framing, one complete image.',
  },
  {
    id: 'shot-05',
    title: 'Toward the ferry',
    refs: ['ref-mara', 'ref-terminal', 'ref-satchel', 'shot-04'],
    direction: 'Long lateral widescreen shot as Mara moves alone from camera-left toward the faded red ferry exit doors at camera-right, ankle-deep water rippling around her boots. She is unmistakably the same woman: blunt black bob with copper streak, eyebrow scar, mustard raincoat, navy sweater, and the same oxblood satchel with triangular clasp at her left hip. Preserve the sea-green tiles, broken-numeral clock, ticket booth geography, cyan dawn, and amber lamps. Tense forward motion, no other foreground character.',
  },
];

let estimatedSpendUsd = 0;
const records = [];
const assets = new Map();

function estimatedCost(referenceCount) {
  return UNIT_PRICE_USD * (referenceCount + 1);
}

async function download(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not download ${url}: ${response.status}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

async function generate({ id, title, prompt, references = [] }) {
  const nextCost = estimatedCost(references.length);
  if (estimatedSpendUsd + nextCost > AUTHORIZED_CAP_USD) {
    throw new Error(`Calibration budget stop: $${(estimatedSpendUsd + nextCost).toFixed(3)} would exceed $${AUTHORIZED_CAP_USD.toFixed(2)}.`);
  }

  const model = references.length ? MODEL_EDIT : MODEL_TEXT;
  const input = {
    prompt,
    image_size: 'landscape_16_9',
    num_images: 1,
    enable_prompt_expansion: false,
    enable_safety_checker: true,
    output_format: 'jpeg',
    ...(references.length ? { image_urls: references.map((reference) => reference.url) } : {}),
  };
  const startedAt = Date.now();
  const result = await fal.subscribe(model, { input });
  const data = result.data;
  const image = data.images?.[0];
  if (!image?.url) throw new Error(`${id} returned no image.`);

  estimatedSpendUsd += nextCost;
  const destination = path.join(outputRoot, `${id}.jpg`);
  await download(image.url, destination);
  const asset = { id, title, url: image.url, path: destination, seed: data.seed ?? null };
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

function composeShotPrompt(shot, references, index) {
  const labels = references.map((reference, referenceIndex) => `Image ${referenceIndex + 1}: ${reference.label}`).join('\n');
  return [
    `Create one complete cinematic storyboard frame, shot ${index + 1} of ${shotSpecs.length}: ${shot.title}.`,
    '',
    'REFERENCE IMAGES IN ORDER:',
    labels,
    '',
    `FRAME DIRECTION: ${shot.direction}`,
    '',
    `GLOBAL VISUAL LANGUAGE: ${style}.`,
    '',
    'Continuity rules:',
    '- References define recurring identity, wardrobe, props, and architecture. Preserve those anchors exactly.',
    '- Each labeled reference owns only its named subject. Do not copy a prop, garment, face, or feature onto another character.',
    '- Respect explicit quantities and ownership. Render exactly one satchel when the frame requests one, belonging only to Mara.',
    '- A prior-shot reference supplies world state and screen continuity only; create the new camera composition requested above.',
    '- Render one full-bleed image only. No collage, contact sheet, split screen, character sheet, border, caption, or text overlay.',
    '- Do not duplicate a character. Do not invent extra foreground people. Keep hands anatomically plausible.',
  ].join('\n');
}

await mkdir(outputRoot, { recursive: true });
console.log(`Output: ${outputRoot}`);
console.log(`Authorized cap: $${AUTHORIZED_CAP_USD.toFixed(2)} · planned estimate: $0.140`);

const anchors = await Promise.all(anchorSpecs.map((anchor) => generate({
  id: anchor.id,
  title: anchor.label,
  prompt: anchor.prompt,
})));
for (const anchor of anchors) anchor.label = anchorSpecs.find((candidate) => candidate.id === anchor.id)?.label ?? anchor.title;

for (const [index, shot] of shotSpecs.entries()) {
  const references = shot.refs.map((id) => {
    const asset = assets.get(id);
    if (!asset) throw new Error(`Missing reference ${id} for ${shot.id}.`);
    const anchor = anchorSpecs.find((candidate) => candidate.id === id);
    const priorShot = shotSpecs.find((candidate) => candidate.id === id);
    return {
      ...asset,
      label: anchor?.label ?? `PREVIOUS APPROVED SHOT — ${priorShot?.title ?? id}`,
    };
  });
  await generate({
    id: shot.id,
    title: shot.title,
    prompt: composeShotPrompt(shot, references, index),
    references,
  });
}

const report = {
  createdAt: new Date().toISOString(),
  model: 'FLUX.2 Flash',
  authorizedCapUsd: AUTHORIZED_CAP_USD,
  estimatedSpendUsd: Math.round(estimatedSpendUsd * 1000) / 1000,
  outputRoot,
  records,
};
await writeFile(path.join(outputRoot, 'report.json'), JSON.stringify(report, null, 2));
console.log(`Complete · estimated spend $${estimatedSpendUsd.toFixed(3)} · ${records.length} images`);
console.log(`REPORT_PATH=${path.join(outputRoot, 'report.json')}`);
