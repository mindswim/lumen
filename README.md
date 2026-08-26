# Lumen

A visual continuity studio for creating coherent storyboard sequences, selecting takes, and finishing every frame with a professional browser-based image editor.

![Lumen Screenshot](docs/screenshot.png)

## Features

### Coherent Storyboards
- **Visual Story Projects** - Keep a premise, visual language, aspect ratio, and ordered shot sequence together
- **Visual Bible** - Lock character, location, object, and style references for reuse across shots
- **Shot Direction** - Separate the story beat, camera-visible frame, and strict continuity requirements
- **Reference-Conditioned Generation** - Generate full frames with up to ten visual inputs through Seedream 4.5
- **Draft / Final Tiers** - Iterate with low-cost FLUX.2 Flash, then promote important shots to Seedream 4.5
- **Continuity Carry-Forward** - Use the prior selected frame as context without copying its composition
- **Dailies Workflow** - Keep immutable takes, circle a selected frame, and promote strong frames into the visual bible
- **Flexible Delivery** - Build 16:9, 4:3, or 9:16 sequences

### Photo Editing
- **Basic Adjustments** - Exposure, contrast, highlights, shadows, whites, blacks
- **White Balance** - Temperature and tint controls
- **Presence** - Clarity, texture, dehaze, vibrance, saturation
- **Tone Curves** - RGB + individual channel curves with point-based editor
- **HSL** - Per-color hue, saturation, and luminance (8 color ranges)
- **Effects** - Grain, vignette, bloom, halation, fade, blur, borders
- **Color Grading** - Split toning, 3-way color wheels, camera calibration
- **Detail** - Sharpening, noise reduction, chromatic aberration removal
- **Transform** - Crop, rotate, straighten, perspective correction, flip
- **Local Adjustments** - Brush, radial, and linear gradient masks

### AI-Powered
- **Natural Language Editing** - Describe edits like "make it warmer" or "film look"
- **Auto-Enhance** - One-click intelligent optimization
- **Image Generation** - Create standalone images with Flux or coherent storyboard frames with Seedream 4.5
- **Contextual Chat** - Multi-turn conversations with edit history

### Workflow
- **Gallery** - Masonry grid with real-time edit previews
- **Presets** - Built-in film looks (Portra, Kodak Gold, Fuji) + custom presets
- **History** - 50-level undo/redo
- **Export** - Print-quality output with sRGB ICC profiles (JPEG, PNG, TIFF)
- **Shared Local Workspace** - Projects and image assets are stored on the local Lumen server and are visible from every browser using it

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 |
| UI | React 19, Radix UI, Tailwind CSS v4 |
| Rendering | WebGL2 (custom GLSL shaders) |
| State | Zustand |
| AI | Anthropic Claude, Fal.ai Flux + Seedream 4.5 |
| Image Processing | Sharp (server-side export) |
| Storage | Local filesystem workspace with one-time IndexedDB migration |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/mindswim/lumen.git
cd lumen
npm install
```

### Environment Variables

Create a `.env.local` file (or export in your shell):

```bash
ANTHROPIC_API_KEY=your_anthropic_key
ANTHROPIC_MODEL=claude-sonnet-5 # optional override
FAL_KEY=your_fal_key
LUMEN_WORKSPACE_DIR=/optional/custom/path
```

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes (for AI features) | Get from [console.anthropic.com](https://console.anthropic.com) |
| `ANTHROPIC_MODEL` | No | Claude model ID; defaults to `claude-sonnet-5` |
| `FAL_KEY` | Yes (for image generation) | Get from [fal.ai](https://fal.ai) |
| `LUMEN_WORKSPACE_DIR` | No | Override the shared local workspace directory; defaults to `.lumen/` inside the project |

> Note: The app works without API keys, but AI editing and image generation will be unavailable.

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

On the first load after upgrading, Lumen copies the current browser's legacy IndexedDB library into `.lumen/`. Open the browser profile that contains your existing work once; after that, every browser connected to the same local server reads and writes the same workspace. Generated manifests under `public/generated/<bundle>/manifest.json` appear under **Project & scene → Bundles** for provenance-aware import.

### Storyboard workspace prototype

An isolated, non-persistent workspace prototype is available at [http://localhost:3000/storyboard-prototype](http://localhost:3000/storyboard-prototype). It demonstrates the proposed Board, Shot list, Timing, References, inspector, and generation-review information architecture without modifying production projects. Read [`docs/STORYBOARD_PRODUCT_DESIGN.md`](docs/STORYBOARD_PRODUCT_DESIGN.md) for the research and architecture, then [`docs/STORYBOARD_PROTOTYPE_HANDOFF.md`](docs/STORYBOARD_PROTOTYPE_HANDOFF.md) for current feedback and next steps.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── api/               # API routes (AI, export)
│   ├── editor/            # Editor page
│   └── page.tsx           # Gallery home
├── components/
│   ├── editor/            # Editor UI panels
│   ├── gallery/           # Gallery components
│   ├── storyboard/        # Scenes, boards, continuity, shot direction
│   └── ui/                # Shared UI components
├── lib/
│   ├── ai/                # Claude + Fal integrations
│   ├── editor/            # State, presets
│   ├── gallery/           # Gallery store
│   ├── storyboard/        # Projects, shots, takes, prompt composition
│   ├── webgl/             # Rendering engine
│   └── storage/           # Shared local workspace and browser-data migration
└── types/                 # TypeScript definitions
```

## Roadmap

### Working Now
- [x] Full parametric editing (40+ adjustments)
- [x] Real-time WebGL rendering
- [x] AI natural language editing
- [x] AI image generation (Flux)
- [x] Multi-reference storyboard generation (Seedream 4.5)
- [x] Persistent projects, scenes, shots, versions, and selects
- [x] Shared local filesystem storage for storyboard metadata and image assets
- [x] Print-quality export
- [x] Presets system
- [x] Undo/redo history
- [x] Dark/light mode

### Planned
- [ ] Optional cloud sync and collaboration
- [ ] Blob storage migration (25% space savings)
- [ ] RAW file support
- [ ] Background replacement (SAM + inpainting)
- [ ] Layer system for compositing

## Browser Support

Requires WebGL2. Works on:
- Chrome 56+
- Firefox 51+
- Safari 15+
- Edge 79+

## License

MIT License - see [LICENSE](LICENSE)

## Acknowledgments

- Inspired by Lightroom, VSCO, and Darkroom
- AI editing powered by [Anthropic Claude](https://anthropic.com)
- Image generation by [Fal.ai](https://fal.ai) Flux models
