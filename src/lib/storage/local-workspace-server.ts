import { access, mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.env.LUMEN_WORKSPACE_DIR
  ? path.resolve(process.env.LUMEN_WORKSPACE_DIR)
  : path.join(process.cwd(), '.lumen');
const assetsRoot = path.join(workspaceRoot, 'assets');
const storyboardsPath = path.join(workspaceRoot, 'storyboards.json');
const imagesPath = path.join(workspaceRoot, 'images.json');

export interface GeneratedBundleReference {
  id: string;
  kind: 'character' | 'location' | 'object' | 'style' | 'research';
  name: string;
  url: string;
}

export interface GeneratedBundleShot {
  number: number;
  title: string;
  url: string;
  referenceIds: string[];
}

export interface GeneratedStoryboardBundle {
  slug: string;
  project: string;
  createdAt?: string;
  generator: string;
  status?: string;
  historicalAccuracy?: string;
  references: GeneratedBundleReference[];
  shots: GeneratedBundleShot[];
}

async function ensureWorkspace(): Promise<void> {
  await mkdir(assetsRoot, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return fallback;
    throw error;
  }
}

async function writeJson(filePath: string, value: unknown): Promise<number> {
  await ensureWorkspace();
  const updatedAt = Date.now();
  const temporaryPath = `${filePath}.${process.pid}.${updatedAt}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, filePath);
  return updatedAt;
}

export async function readLocalStoryboards<T>(): Promise<T | null> {
  return readJson<T | null>(storyboardsPath, null);
}

export async function writeLocalStoryboards(value: unknown): Promise<number> {
  return writeJson(storyboardsPath, value);
}

export async function readLocalImages<T>(): Promise<T[]> {
  return readJson<T[]>(imagesPath, []);
}

export async function localImagesInitialized(): Promise<boolean> {
  try {
    await access(imagesPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
}

export async function writeLocalImages(images: unknown[]): Promise<number> {
  return writeJson(imagesPath, images);
}

function safeAssetId(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').slice(0, 120);
  if (!safe) throw new Error('A valid image id is required.');
  return safe;
}

function extensionFor(contentType: string, fileName: string): string {
  const byType: Record<string, string> = {
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };
  if (byType[contentType]) return byType[contentType];
  const candidate = path.extname(fileName).toLowerCase();
  return /^\.(avif|gif|jpe?g|png|webp)$/.test(candidate) ? candidate : '.bin';
}

export async function writeLocalAsset(input: {
  id: string;
  fileName: string;
  contentType: string;
  bytes: Uint8Array;
}): Promise<{ fileName: string; url: string }> {
  await ensureWorkspace();
  const assetFileName = `${safeAssetId(input.id)}${extensionFor(input.contentType, input.fileName)}`;
  await writeFile(path.join(assetsRoot, assetFileName), input.bytes);
  return {
    fileName: assetFileName,
    url: `/api/workspace/assets/${encodeURIComponent(assetFileName)}`,
  };
}

export async function readLocalAsset(fileName: string): Promise<Buffer | null> {
  const decoded = decodeURIComponent(fileName);
  if (path.basename(decoded) !== decoded || !/^[a-zA-Z0-9_-]+\.(avif|gif|jpe?g|png|webp|bin)$/.test(decoded)) {
    return null;
  }

  try {
    return await readFile(path.join(assetsRoot, decoded));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function isBundle(value: unknown): value is Omit<GeneratedStoryboardBundle, 'slug'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GeneratedStoryboardBundle>;
  return typeof candidate.project === 'string'
    && typeof candidate.generator === 'string'
    && Array.isArray(candidate.references)
    && Array.isArray(candidate.shots);
}

export async function listGeneratedBundles(): Promise<GeneratedStoryboardBundle[]> {
  const generatedRoot = path.join(process.cwd(), 'public', 'generated');
  let entries;
  try {
    entries = await readdir(generatedRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  const bundles = await Promise.all(entries
    .filter((entry) => entry.isDirectory())
    .map(async (entry) => {
      const value = await readJson<unknown>(path.join(generatedRoot, entry.name, 'manifest.json'), null);
      return isBundle(value) ? { ...value, slug: entry.name } : null;
    }));

  return bundles
    .filter((bundle): bundle is GeneratedStoryboardBundle => bundle !== null)
    .sort((a, b) => a.project.localeCompare(b.project));
}
