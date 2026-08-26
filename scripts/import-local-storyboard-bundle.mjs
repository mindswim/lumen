import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const projectRoot = process.cwd();
const slug = process.argv[2];
if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
  throw new Error('Usage: node scripts/import-local-storyboard-bundle.mjs <bundle-slug>');
}

const workspaceRoot = process.env.LUMEN_WORKSPACE_DIR
  ? path.resolve(process.env.LUMEN_WORKSPACE_DIR)
  : path.join(projectRoot, '.lumen');
const assetsRoot = path.join(workspaceRoot, 'assets');
const imagesPath = path.join(workspaceRoot, 'images.json');
const storyboardsPath = path.join(workspaceRoot, 'storyboards.json');
const bundleRoot = path.join(projectRoot, 'public', 'generated', slug);
const manifest = JSON.parse(await readFile(path.join(bundleRoot, 'manifest.json'), 'utf8'));
const images = JSON.parse(await readFile(imagesPath, 'utf8'));
const storyboardState = JSON.parse(await readFile(storyboardsPath, 'utf8'));
const project = storyboardState.projects.find((candidate) => candidate.title === manifest.project);

if (!project) throw new Error(`No shared-workspace project matches "${manifest.project}".`);
if (!images[0]?.editState) throw new Error('The shared workspace needs one migrated image before importing a bundle.');

const editStateTemplate = images[0].editState;
const now = Date.now();

function safeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function atomicJson(filePath, value) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
}

async function ensureImage(asset, role) {
  const existing = images.find((image) => image.sourceUrl === asset.url);
  if (existing) return existing;

  const sourcePath = path.join(projectRoot, 'public', asset.url.replace(/^\//, ''));
  const extension = path.extname(sourcePath).toLowerCase() || '.png';
  const id = `bundle-${safeId(slug)}-${role}-${safeId(asset.id ?? String(asset.number))}`;
  const assetFileName = `${id}${extension}`;
  const destination = path.join(assetsRoot, assetFileName);
  const metadata = await sharp(sourcePath).metadata();
  const thumbnail = await sharp(sourcePath).resize({ width: 800, withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
  await copyFile(sourcePath, destination);

  const image = {
    id,
    fileName: path.basename(sourcePath),
    dataUrl: `/api/workspace/assets/${assetFileName}`,
    thumbnailUrl: `data:image/jpeg;base64,${thumbnail.toString('base64')}`,
    width: metadata.width ?? 0,
    height: metadata.height ?? 0,
    editState: structuredClone(editStateTemplate),
    createdAt: now,
    updatedAt: now,
    sourceUrl: asset.url,
    sourceProvider: manifest.generator,
  };
  images.unshift(image);
  return image;
}

await mkdir(assetsRoot, { recursive: true });
const referenceIds = new Map();

for (const reference of manifest.references) {
  const image = await ensureImage(reference, 'reference');
  let projectReference = project.references.find((candidate) => candidate.sourceUrl === reference.url);
  if (!projectReference) {
    projectReference = {
      id: `ref-bundle-${safeId(slug)}-${safeId(reference.id)}`,
      imageId: image.id,
      name: reference.name,
      kind: reference.kind,
      description: '',
      sourceUrl: reference.url,
      sourceTitle: manifest.generator,
      rightsNote: 'AI-generated production reference; verify historical details before publication.',
      createdAt: now,
    };
    project.references.push(projectReference);
  }
  referenceIds.set(reference.id, projectReference.id);
}

for (const panel of manifest.shots) {
  const image = await ensureImage({ ...panel, id: String(panel.number) }, 'panel');
  const shot = project.shots[panel.number - 1]
    ?? project.shots.find((candidate) => candidate.title.toLowerCase() === panel.title.toLowerCase());
  if (!shot) continue;

  const mappedReferenceIds = panel.referenceIds.flatMap((id) => referenceIds.get(id) ?? []);
  shot.referenceIds = [...new Set([...shot.referenceIds, ...mappedReferenceIds])];
  const previousPanelId = `shot-${String(panel.number - 1).padStart(2, '0')}`;
  if (panel.referenceIds.includes(previousPanelId)) shot.usePreviousPanel = true;

  if (!shot.takes.some((take) => take.imageId === image.id)) {
    const takeId = `take-bundle-${safeId(slug)}-${String(panel.number).padStart(2, '0')}`;
    shot.takes.push({
      id: takeId,
      imageId: image.id,
      prompt: `Imported generated panel: ${panel.title}. Source lineage: ${panel.referenceIds.join(', ') || 'text-only'}.`,
      referenceIds: mappedReferenceIds,
      model: manifest.generator,
      seed: null,
      createdAt: now,
    });
    shot.selectedTakeId ??= takeId;
  }
  shot.updatedAt = now;
}

project.updatedAt = now;
await atomicJson(imagesPath, images);
await atomicJson(storyboardsPath, storyboardState);
console.log(JSON.stringify({
  project: project.title,
  references: manifest.references.length,
  panels: manifest.shots.length,
  totalImages: images.length,
}, null, 2));
