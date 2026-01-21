# Lumen Architecture Review & AI Integration Roadmap

## Table of Contents
1. [Current Architecture Assessment](#current-architecture-assessment)
2. [Pro-Grade Improvements](#pro-grade-improvements)
3. [Database Strategy](#database-strategy)
4. [AI Integration Roadmap](#ai-integration-roadmap)
5. [Implementation Priority](#implementation-priority)

---

## Current Architecture Assessment

### Tech Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | Next.js 16 + React 19 | App shell, routing, SSR |
| State | Zustand 5.0 | Editor state, gallery, history |
| Rendering | WebGL2 (custom shaders) | Real-time image processing |
| UI | Radix UI + Tailwind CSS v4 | Accessible components, styling |
| Storage | IndexedDB + localStorage | Client-side persistence |
| Export | Sharp (server-side) | Print-quality image processing |

### Architecture Strengths

#### 1. Clean Separation of Concerns
```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  (React Components: Canvas, Panels, Gallery)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     State Layer                              │
│  (Zustand: EditorStore, GalleryStore)                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Rendering Layer                            │
│  (WebGL: Shaders, Textures, Framebuffers, Pipelines)        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Persistence Layer                          │
│  (IndexedDB: Images, localStorage: Presets)                  │
└─────────────────────────────────────────────────────────────┘
```

#### 2. Comprehensive Type System
The `EditState` type covers 40+ adjustment parameters across:
- Basic adjustments (exposure, contrast, highlights, shadows, etc.)
- Tone curves (RGB + individual channels)
- HSL per-color adjustments (8 color ranges)
- Effects (grain, vignette, bloom, halation, split tone)
- Detail (sharpening, noise reduction, chromatic aberration)
- Color grading (3-way wheels, camera calibration)
- Transform (crop, rotation, perspective)
- Local adjustments (masks with brush, radial, linear types)

#### 3. Efficient Rendering Pipeline
```
Single-Pass (90% of edits)          Multi-Pass (complex effects)
┌──────────────────────┐            ┌──────────────────────┐
│ All adjustments in   │            │ Pass 1: Base adjust  │
│ one shader pass      │            │ Pass 2: Bloom extract│
│         │            │            │ Pass 3: Blur passes  │
│         ▼            │            │ Pass 4: Composite    │
│      Canvas          │            │         │            │
└──────────────────────┘            │         ▼            │
                                    │      Canvas          │
Triggered when:                     └──────────────────────┘
- bloom.amount > 0
- halation.amount > 0
- blur.amount > 20
```

#### 4. Professional Export Pipeline
- Server-side Sharp processing for print quality
- sRGB ICC profile embedding for color accuracy
- 300 DPI metadata for professional printing
- Format-specific optimization (mozjpeg, LZW TIFF)

#### 5. History System
- 50-entry undo/redo stack
- 500ms debouncing prevents history bloat during slider drags
- Batch update helper for multi-parameter changes

### Current Limitations

| Area | Limitation | Impact |
|------|------------|--------|
| Storage | Base64 data URLs (+33% size overhead) | Reduced capacity |
| History | Deep clone via JSON.parse/stringify | Memory inefficiency |
| Masks | Unbounded brush stroke storage | Potential memory issues |
| Layers | Single layer only | No compositing workflow |
| Color | sRGB only working space | Limited for pro colorists |
| Files | No RAW support | Limits pro photographer adoption |
| Sync | Client-only, no cloud | No cross-device access |

---

## Pro-Grade Improvements

### Tier 1: Performance & Efficiency

#### 1.1 Blob Storage Migration
**Current:** Images stored as base64 data URLs in IndexedDB
**Proposed:** Direct Blob storage

```typescript
// Current (inefficient)
const stored = {
  id: 'abc123',
  dataUrl: 'data:image/jpeg;base64,/9j/4AAQ...' // +33% size
};

// Proposed (efficient)
const stored = {
  id: 'abc123',
  blob: new Blob([arrayBuffer], { type: 'image/jpeg' })
};
```

**Benefits:**
- ~25% storage savings
- Faster serialization/deserialization
- Native browser optimization

#### 1.2 Structural Sharing for History
**Current:** Full deep clone on every history entry
**Proposed:** Immer-based structural sharing

```typescript
// Current
pushHistory: () => {
  const snapshot = JSON.parse(JSON.stringify(state.editState));
  // Full clone every time
}

// Proposed
import { produce } from 'immer';

pushHistory: () => {
  const snapshot = produce(state.editState, draft => {});
  // Only changed paths are new objects
}
```

**Benefits:**
- ~80% memory reduction for history
- Faster snapshots
- Enables deeper history (100+ entries)

#### 1.3 Brush Stroke Optimization
**Current:** Every brush point stored individually
**Proposed:** Path simplification + compression

```typescript
// Simplify paths using Ramer-Douglas-Peucker algorithm
function simplifyPath(points: Point[], epsilon: number): Point[] {
  // Reduce 1000 points to ~50 while maintaining shape
}

// Compress for storage
function compressStrokes(strokes: Stroke[]): CompressedStrokes {
  // Delta encoding + quantization
}
```

### Tier 2: Professional Features

#### 2.1 Non-Destructive Layer System
```typescript
interface Layer {
  id: string;
  name: string;
  type: 'adjustment' | 'image' | 'text';
  opacity: number;
  blendMode: BlendMode;
  visible: boolean;
  mask?: Mask;

  // For adjustment layers
  adjustments?: Partial<EditState>;

  // For image layers
  imageData?: ImageData;
}

interface LayeredEditState {
  baseImage: ImageData;
  layers: Layer[];
  activeLayerId: string;
}
```

#### 2.2 RAW File Support
Integration options:
1. **LibRaw WASM** - Full RAW processing in browser
2. **Server-side rawpy** - Process on server, return processed result
3. **Adobe DNG Converter** - Convert to DNG, process with existing pipeline

```typescript
// Proposed RAW pipeline
async function processRAW(file: File): Promise<ProcessedImage> {
  if (isRAWFormat(file)) {
    // Option 1: WASM processing
    const libraw = await initLibRaw();
    const processed = await libraw.process(file);
    return {
      image: processed.srgbImage,
      metadata: processed.exif,
      rawSettings: processed.defaultSettings
    };
  }
  return processStandardImage(file);
}
```

#### 2.3 Wide Gamut Color Support
```typescript
type ColorSpace = 'srgb' | 'display-p3' | 'prophoto-rgb' | 'rec2020';

interface ColorManagement {
  workingSpace: ColorSpace;
  displayProfile: ColorSpace;
  softProofProfile?: ICCProfile;
  renderIntent: 'perceptual' | 'relative' | 'absolute' | 'saturation';
}
```

#### 2.4 Batch Editing
```typescript
interface BatchOperation {
  sourceImageId: string;
  targetImageIds: string[];

  // What to copy
  copySettings: {
    basic: boolean;
    curves: boolean;
    hsl: boolean;
    effects: boolean;
    detail: boolean;
    // Optionally exclude transform (crop differs per image)
    transform: boolean;
  };
}

async function applyBatch(operation: BatchOperation): Promise<void> {
  const sourceState = getEditState(operation.sourceImageId);
  const settingsToCopy = extractSettings(sourceState, operation.copySettings);

  for (const targetId of operation.targetImageIds) {
    await updateEditState(targetId, settingsToCopy);
  }
}
```

### Tier 3: UX Enhancements

#### 3.1 Keyboard Shortcuts Panel
```typescript
const shortcuts = {
  global: {
    'Cmd+Z': 'Undo',
    'Cmd+Shift+Z': 'Redo',
    'Cmd+E': 'Export',
    'Cmd+S': 'Save to gallery',
    'Space': 'Hold for before/after',
  },
  tools: {
    'B': 'Brush mask',
    'R': 'Radial mask',
    'L': 'Linear mask',
    'C': 'Crop',
  },
  adjustments: {
    '1-9': 'Set adjustment intensity (10%-90%)',
    '0': 'Reset current adjustment',
    '[': 'Decrease brush size',
    ']': 'Increase brush size',
  }
};
```

#### 3.2 Plugin Architecture
```typescript
interface LumenPlugin {
  id: string;
  name: string;
  version: string;

  // Lifecycle hooks
  onInit?: (api: PluginAPI) => void;
  onDestroy?: () => void;

  // Extension points
  adjustmentPanels?: AdjustmentPanel[];
  effects?: CustomEffect[];
  presets?: Preset[];
  exportFormats?: ExportFormat[];
}

interface PluginAPI {
  getEditState(): EditState;
  setEditState(state: Partial<EditState>): void;
  registerShader(shader: CustomShader): void;
  addMenuItem(item: MenuItem): void;
}
```

---

## Database Strategy

### Current State: Client-Only

```
┌─────────────────────────────────────────┐
│              Browser                     │
│  ┌─────────────────────────────────┐    │
│  │         IndexedDB               │    │
│  │  - Images (blob + edit state)   │    │
│  │  - ~50MB browser quota          │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │        localStorage             │    │
│  │  - User presets                 │    │
│  │  - UI preferences               │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Proposed: Hybrid Cloud Architecture

```
┌─────────────────────────────────────────┐
│              Browser                     │
│  ┌─────────────────────────────────┐    │
│  │    IndexedDB (offline cache)    │    │
│  │  - Recent images                │    │
│  │  - Pending syncs                │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
                    │
                    ▼ (sync)
┌─────────────────────────────────────────┐
│              Supabase                    │
│  ┌─────────────────────────────────┐    │
│  │      PostgreSQL Database        │    │
│  │  - users                        │    │
│  │  - projects                     │    │
│  │  - images (metadata only)       │    │
│  │  - presets                      │    │
│  │  - edit_history                 │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │      Supabase Storage           │    │
│  │  - Original images              │    │
│  │  - Thumbnails                   │    │
│  │  - Exported images              │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │      Supabase Auth              │    │
│  │  - Email/password               │    │
│  │  - OAuth (Google, GitHub)       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Database Schema

```sql
-- Users (handled by Supabase Auth)
-- Extended profile
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  storage_used BIGINT DEFAULT 0,
  storage_limit BIGINT DEFAULT 5368709120, -- 5GB
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects (collections of images)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images (metadata only, actual files in Storage)
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

  -- File info
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  width INT NOT NULL,
  height INT NOT NULL,

  -- Storage paths
  original_path TEXT NOT NULL,
  thumbnail_path TEXT,

  -- Edit state (JSONB for flexibility)
  edit_state JSONB DEFAULT '{}',

  -- Metadata
  exif_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User presets
CREATE TABLE presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  category TEXT,
  settings JSONB NOT NULL, -- Partial<EditState>

  -- Sharing
  is_public BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edit history (for collaboration/versioning)
CREATE TABLE edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID REFERENCES images(id) ON DELETE CASCADE,

  edit_state JSONB NOT NULL,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_images_user ON images(user_id);
CREATE INDEX idx_images_project ON images(project_id);
CREATE INDEX idx_presets_user ON presets(user_id);
CREATE INDEX idx_presets_public ON presets(is_public) WHERE is_public = TRUE;
```

### Sync Strategy

```typescript
interface SyncManager {
  // Queue operations when offline
  queueOperation(op: SyncOperation): void;

  // Process queue when online
  processQueue(): Promise<void>;

  // Conflict resolution
  resolveConflict(local: EditState, remote: EditState): EditState;
}

type SyncOperation =
  | { type: 'CREATE_IMAGE'; data: ImageCreate }
  | { type: 'UPDATE_EDIT_STATE'; imageId: string; state: EditState }
  | { type: 'DELETE_IMAGE'; imageId: string }
  | { type: 'CREATE_PRESET'; data: PresetCreate };

// Last-write-wins with optional merge
function resolveConflict(local: EditState, remote: EditState): EditState {
  if (local.updatedAt > remote.updatedAt) {
    return local;
  }
  return remote;
}
```

---

## AI Integration Roadmap

### Phase 1: Parametric AI (No Image Generation)

These features analyze images and return adjustment parameters, leveraging the existing WebGL pipeline.

#### 1.1 Auto-Enhance

**Concept:** AI analyzes image and suggests optimal EditState adjustments.

```typescript
// src/lib/ai/services/auto-enhance.ts

interface AutoEnhanceResult {
  adjustments: Partial<EditState>;
  confidence: number;
  explanation: string;
}

async function autoEnhance(
  imageData: string, // Base64 thumbnail
  style?: 'natural' | 'vibrant' | 'cinematic' | 'moody'
): Promise<AutoEnhanceResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'base64', media_type: 'image/jpeg', data: imageData }
        },
        {
          type: 'text',
          text: `Analyze this image and suggest photo editing adjustments.

Style preference: ${style || 'natural'}

Return a JSON object with these properties (only include non-zero values):
- exposure: -3 to +3 (stops)
- contrast: -100 to +100
- highlights: -100 to +100
- shadows: -100 to +100
- whites: -100 to +100
- blacks: -100 to +100
- temperature: -100 to +100 (negative=cool, positive=warm)
- tint: -100 to +100 (negative=green, positive=magenta)
- clarity: -100 to +100
- vibrance: -100 to +100
- saturation: -100 to +100

Also provide a brief explanation of your reasoning.`
        }
      ]
    }]
  });

  return parseAutoEnhanceResponse(response);
}
```

**UI Integration:**
```tsx
// In AdjustPanel.tsx or new AutoPanel.tsx

function AutoEnhanceButton() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { editState, batchedUpdate } = useEditorStore();
  const { getRenderer } = useWebGL();

  const handleAutoEnhance = async () => {
    setIsAnalyzing(true);

    // Get thumbnail from current canvas
    const canvas = getRenderer()?.getCanvas();
    const thumbnail = await createThumbnail(canvas, 512);

    const result = await autoEnhance(thumbnail);

    // Apply suggested adjustments
    batchedUpdate(() => {
      Object.entries(result.adjustments).forEach(([key, value]) => {
        // Update each adjustment
      });
    });

    setIsAnalyzing(false);
  };

  return (
    <Button onClick={handleAutoEnhance} disabled={isAnalyzing}>
      {isAnalyzing ? 'Analyzing...' : 'Auto Enhance'}
    </Button>
  );
}
```

#### 1.2 Natural Language Editing

**Concept:** Users describe edits in natural language, AI translates to parameters.

```typescript
// src/lib/ai/services/natural-language.ts

interface NLEditResult {
  adjustments: Partial<EditState>;
  interpretation: string;
}

async function interpretEditCommand(
  command: string,
  currentState: EditState,
  imageContext?: string // Optional image thumbnail
): Promise<NLEditResult> {
  const systemPrompt = `You are a photo editing assistant.
Convert natural language editing commands into specific adjustment parameters.

Current edit state:
${JSON.stringify(currentState, null, 2)}

Available adjustments and their ranges:
- exposure: -3 to +3 (stops)
- contrast: -100 to +100
- highlights, shadows, whites, blacks: -100 to +100
- temperature: -100 to +100 (negative=cool, positive=warm)
- clarity, texture, dehaze: -100 to +100
- vibrance, saturation: -100 to +100
- fade: 0 to 100
- grain.amount: 0 to 100
- vignette.amount: -100 to +100
- splitTone.highlightHue/shadowHue: 0 to 360
- splitTone.highlightSaturation/shadowSaturation: 0 to 100

Return JSON with only the adjustments to change (delta from current).`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: command
    }]
  });

  return parseNLResponse(response);
}

// Example commands:
// "Make it warmer and add some film grain"
// "Boost the shadows but keep highlights natural"
// "Give it a teal and orange cinematic look"
// "Make the colors pop more"
// "Add a subtle vintage fade"
```

**UI Integration:**
```tsx
function NaturalLanguageInput() {
  const [command, setCommand] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async () => {
    if (!command.trim()) return;
    setIsProcessing(true);

    const result = await interpretEditCommand(command, editState);
    applyAdjustments(result.adjustments);

    setCommand('');
    setIsProcessing(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        placeholder="Describe your edit..."
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      <Button onClick={handleSubmit} disabled={isProcessing}>
        Apply
      </Button>
    </div>
  );
}
```

#### 1.3 Smart Preset Suggestions

**Concept:** AI analyzes image content and suggests appropriate presets.

```typescript
// src/lib/ai/services/preset-suggest.ts

interface PresetSuggestion {
  presetId: string;
  presetName: string;
  confidence: number;
  reason: string;
}

async function suggestPresets(
  imageData: string,
  availablePresets: Preset[]
): Promise<PresetSuggestion[]> {
  const presetSummaries = availablePresets.map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: describePreset(p) // Generate description from settings
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData }},
        { type: 'text', text: `Analyze this image and suggest the 3 most appropriate presets.

Available presets:
${JSON.stringify(presetSummaries, null, 2)}

Consider:
- Image content (portrait, landscape, food, architecture, etc.)
- Lighting conditions
- Color palette
- Mood/atmosphere

Return JSON array of suggestions with presetId, confidence (0-1), and reason.`}
      ]
    }]
  });

  return parsePresetSuggestions(response);
}
```

#### 1.4 Style Transfer (Parametric)

**Concept:** User provides reference image, AI generates preset to match its style.

```typescript
// src/lib/ai/services/style-transfer.ts

interface StyleTransferResult {
  preset: Partial<EditState>;
  styleName: string;
  styleDescription: string;
}

async function extractStyle(
  referenceImage: string,
  targetImage?: string
): Promise<StyleTransferResult> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: referenceImage }},
        { type: 'text', text: `Analyze the color grading and editing style of this reference image.

Extract the following as a photo editing preset:
1. Overall exposure/contrast characteristics
2. Color temperature and tint
3. Highlight and shadow treatment
4. Color grading (split toning, color shifts)
5. Any special effects (grain, fade, vignette)
6. Tone curve characteristics

Return a JSON preset object that would recreate this style, plus a name and description.`}
      ]
    }]
  });

  return parseStyleTransferResponse(response);
}
```

### Phase 2: Generative AI Features

These features require external AI image generation services.

#### 2.1 Provider Abstraction

```typescript
// src/lib/ai/providers/index.ts

interface ImageGenerationProvider {
  name: string;

  // Text to image
  generate(prompt: string, options: GenerateOptions): Promise<GeneratedImage>;

  // Inpainting
  inpaint(image: string, mask: string, prompt: string): Promise<GeneratedImage>;

  // Outpainting
  extend(image: string, direction: Direction, prompt?: string): Promise<GeneratedImage>;

  // Upscale
  upscale(image: string, scale: number): Promise<GeneratedImage>;
}

interface GenerateOptions {
  width: number;
  height: number;
  style?: string;
  negativePrompt?: string;
  seed?: number;
}

// Provider implementations
class ReplicateProvider implements ImageGenerationProvider {
  async generate(prompt: string, options: GenerateOptions) {
    const output = await replicate.run('black-forest-labs/flux-schnell', {
      input: {
        prompt,
        width: options.width,
        height: options.height,
      }
    });
    return { url: output[0], ... };
  }

  async inpaint(image: string, mask: string, prompt: string) {
    const output = await replicate.run('stability-ai/stable-diffusion-inpainting', {
      input: { image, mask, prompt }
    });
    return { url: output[0], ... };
  }
}

class FalProvider implements ImageGenerationProvider {
  // Similar implementation using fal.ai
}
```

#### 2.2 Object Removal (Inpainting)

```typescript
// src/lib/ai/services/inpaint.ts

interface InpaintRequest {
  imageData: string;
  maskData: string; // Binary mask of area to remove
  prompt?: string; // Optional guidance for fill
}

async function removeObject(request: InpaintRequest): Promise<string> {
  const provider = getActiveProvider();

  // If no prompt, use generic fill prompt
  const fillPrompt = request.prompt ||
    'seamless natural background, photorealistic, matching lighting and style';

  const result = await provider.inpaint(
    request.imageData,
    request.maskData,
    fillPrompt
  );

  return result.url;
}
```

**UI Integration:**
```tsx
function ObjectRemovalTool() {
  const [maskMode, setMaskMode] = useState<'brush' | 'auto'>('brush');
  const [mask, setMask] = useState<MaskData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRemove = async () => {
    if (!mask) return;
    setIsProcessing(true);

    const currentImage = await getCurrentImageData();
    const maskImage = renderMaskToImage(mask);

    const result = await removeObject({
      imageData: currentImage,
      maskData: maskImage
    });

    // Replace current image with result
    await applyGeneratedImage(result);

    setIsProcessing(false);
    setMask(null);
  };

  return (
    <div>
      <p>Paint over the object you want to remove</p>
      <MaskCanvas onMaskChange={setMask} />
      <Button onClick={handleRemove} disabled={!mask || isProcessing}>
        {isProcessing ? 'Removing...' : 'Remove Object'}
      </Button>
    </div>
  );
}
```

#### 2.3 Background Replacement

```typescript
// src/lib/ai/services/background.ts

interface BackgroundReplaceRequest {
  imageData: string;
  newBackground: string | { prompt: string }; // Image or generation prompt
}

async function replaceBackground(request: BackgroundReplaceRequest): Promise<string> {
  // Step 1: Segment subject using SAM (Segment Anything Model)
  const segmentation = await replicate.run('meta/sam-2', {
    input: {
      image: request.imageData,
      // Auto-detect main subject
    }
  });

  const subjectMask = segmentation.masks[0];

  // Step 2: Get or generate new background
  let newBg: string;
  if (typeof request.newBackground === 'string') {
    newBg = request.newBackground;
  } else {
    const generated = await provider.generate(request.newBackground.prompt, {
      width: imageWidth,
      height: imageHeight
    });
    newBg = generated.url;
  }

  // Step 3: Composite subject onto new background
  return compositeImages(request.imageData, newBg, subjectMask);
}
```

#### 2.4 Image Generation

```typescript
// src/lib/ai/services/generate.ts

interface GenerateImageRequest {
  prompt: string;
  width?: number;
  height?: number;
  style?: 'photorealistic' | 'artistic' | 'cinematic';
  referenceImage?: string; // For style guidance
}

async function generateImage(request: GenerateImageRequest): Promise<string> {
  const provider = getActiveProvider();

  let enhancedPrompt = request.prompt;

  // Add style modifiers
  if (request.style === 'photorealistic') {
    enhancedPrompt += ', photorealistic, 8k, detailed, professional photography';
  } else if (request.style === 'cinematic') {
    enhancedPrompt += ', cinematic lighting, film grain, anamorphic';
  }

  const result = await provider.generate(enhancedPrompt, {
    width: request.width || 1024,
    height: request.height || 1024,
  });

  return result.url;
}
```

**UI Integration:**
```tsx
function GeneratePanel() {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [style, setStyle] = useState<'photorealistic' | 'artistic'>('photorealistic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    const { width, height } = getAspectDimensions(aspectRatio);

    const result = await generateImage({
      prompt,
      width,
      height,
      style
    });

    setGeneratedImages(prev => [...prev, result]);
    setIsGenerating(false);
  };

  const handleUseImage = async (imageUrl: string) => {
    // Load generated image into editor
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const file = new File([blob], 'generated.png', { type: 'image/png' });

    await loadImageIntoEditor(file);
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the image you want to create..."
      />

      <div className="flex gap-2">
        <Select value={aspectRatio} onValueChange={setAspectRatio}>
          <SelectItem value="1:1">Square (1:1)</SelectItem>
          <SelectItem value="16:9">Landscape (16:9)</SelectItem>
          <SelectItem value="9:16">Portrait (9:16)</SelectItem>
          <SelectItem value="4:3">Standard (4:3)</SelectItem>
        </Select>

        <Select value={style} onValueChange={setStyle}>
          <SelectItem value="photorealistic">Photorealistic</SelectItem>
          <SelectItem value="artistic">Artistic</SelectItem>
          <SelectItem value="cinematic">Cinematic</SelectItem>
        </Select>
      </div>

      <Button onClick={handleGenerate} disabled={!prompt || isGenerating}>
        {isGenerating ? 'Generating...' : 'Generate'}
      </Button>

      {/* Generated images grid */}
      <div className="grid grid-cols-2 gap-2">
        {generatedImages.map((url, i) => (
          <div key={i} className="relative group">
            <img src={url} alt={`Generated ${i}`} />
            <Button
              className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100"
              onClick={() => handleUseImage(url)}
            >
              Edit This
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Phase 3: Advanced AI Workflows

#### 3.1 AI Preset Learning

```typescript
// Learn from user's editing patterns

interface EditingSession {
  imageId: string;
  beforeState: EditState;
  afterState: EditState;
  duration: number;
  adjustmentsChanged: string[];
}

async function analyzeEditingPatterns(
  sessions: EditingSession[]
): Promise<PersonalizedPreset[]> {
  // Send to AI for pattern analysis
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: `Analyze these editing sessions and identify recurring patterns:

${JSON.stringify(sessions, null, 2)}

Identify:
1. Common adjustment combinations
2. Typical value ranges for different image types
3. Signature editing style elements

Generate 3-5 personalized presets based on these patterns.`
    }]
  });

  return parsePersonalizedPresets(response);
}
```

#### 3.2 Intelligent Crop Suggestions

```typescript
async function suggestCrops(imageData: string): Promise<CropSuggestion[]> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData }},
        { type: 'text', text: `Analyze this image and suggest optimal crops.

Consider:
- Rule of thirds
- Subject placement
- Leading lines
- Negative space
- Common aspect ratios (1:1, 4:5, 16:9)

Return JSON array with:
- aspectRatio: string
- crop: { left, top, width, height } (normalized 0-1)
- reason: string`}
      ]
    }]
  });

  return parseCropSuggestions(response);
}
```

### AI Architecture Summary

```
src/lib/ai/
├── index.ts                 # Main exports
├── config.ts                # API keys, provider selection
│
├── providers/
│   ├── index.ts             # Provider interface
│   ├── anthropic.ts         # Claude for analysis
│   ├── replicate.ts         # Image generation (Flux, SD)
│   ├── fal.ts               # Alternative generation
│   └── openai.ts            # DALL-E, GPT-4V
│
├── services/
│   ├── auto-enhance.ts      # Analyze + suggest adjustments
│   ├── natural-language.ts  # NL command interpretation
│   ├── preset-suggest.ts    # Content-aware preset recommendations
│   ├── style-transfer.ts    # Extract style as preset
│   ├── crop-suggest.ts      # Intelligent crop suggestions
│   ├── inpaint.ts           # Object removal
│   ├── background.ts        # Background replacement
│   ├── generate.ts          # Text-to-image
│   └── learning.ts          # Pattern analysis, personalization
│
└── types.ts                 # AI-related types
```

---

## Implementation Priority

### Quick Wins (1-2 weeks each)

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Auto-Enhance | Low | High | Anthropic API key |
| Natural Language Input | Low | High | Anthropic API key |
| Preset Suggestions | Low | Medium | Anthropic API key |
| Keyboard Shortcuts Panel | Low | Medium | None |

### Medium Term (1-2 months)

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Blob Storage Migration | Medium | Medium | None |
| Style Transfer (Parametric) | Medium | High | Anthropic API key |
| Object Removal | Medium | High | Replicate API |
| Database Backend | High | High | Supabase setup |
| User Authentication | Medium | High | Supabase Auth |

### Long Term (3-6 months)

| Feature | Effort | Impact | Dependencies |
|---------|--------|--------|--------------|
| Image Generation | Medium | High | Replicate/fal.ai |
| Background Replacement | High | High | SAM + generation |
| RAW File Support | High | High | LibRaw WASM |
| Layer System | Very High | Very High | Architecture changes |
| Plugin System | Very High | Medium | Architecture changes |

---

## Recommended Starting Point

**Phase 1 Implementation Order:**

1. **Auto-Enhance** - Immediate value, leverages existing parametric system
2. **Natural Language Input** - Novel UX, highly engaging
3. **Preset Suggestions** - Improves discoverability of existing presets
4. **Style Transfer** - Viral feature, users can match any reference

These four features:
- Require only Claude API (already have Anthropic key in env)
- Work entirely with existing EditState system
- No image generation infrastructure needed
- Can be shipped incrementally

**Estimated Timeline:** 2-3 weeks for all four Phase 1 features.
