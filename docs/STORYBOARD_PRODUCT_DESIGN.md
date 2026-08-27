# Lumen Storyboard Product Design

Status: Recommended product architecture and refactor direction
Last updated: 2026-08-26

Implementation note: the proposed workspace is available as a static interactive route at `/storyboard-prototype`. See [STORYBOARD_PROTOTYPE_HANDOFF.md](./STORYBOARD_PROTOTYPE_HANDOFF.md) for current fidelity, user feedback, unresolved patterns, and the recommended continuation sequence.

## Purpose

This document defines the product architecture, information architecture, interaction model, and incremental refactor direction for Lumen's storyboard workspace.

Lumen should become a visual continuity and previsualization workspace for building coherent characters, locations, looks, storyboard sequences, and eventually video. It should support creators who begin with a script, an outline, a brief, a shot list, or nothing more than an idea. A script is an optional input, not the required organizing spine of the product.

The goal is not to reproduce a full production-management suite. Lumen should focus on the director-facing creative loop:

1. Establish the world and reusable visual references.
2. Structure a story into groups and shots.
3. Direct and generate storyboard panels.
4. Compare versions and select the intended frame.
5. Review visual and narrative continuity across the sequence.
6. Set timing and sound intent.
7. Hand selected panels to image finishing, animatic, or video generation.

## Product Thesis

If Lumen only sends prompts to an image model, it is replaceable. Its durable value is persistent creative context:

- reusable characters, locations, wardrobe, props, and look references;
- explicit routing of the right references to the right shots;
- structured shot direction without requiring prompt engineering;
- immutable generated versions and a deliberate selected version;
- continuity review across non-adjacent as well as adjacent shots;
- a path from storyboard panel to timing, sound, and video;
- provider-neutral provenance so creators can use different image models.

The existing photo editor remains valuable as an optional finishing surface. It is not the primary product hierarchy.

## Current Product Problems

### Mixed navigation scopes

The current top navigation treats Storyboard, Timing, and References as peers even though References are project-level and Timing is a view of a particular storyboard.

### Overloaded left sidebar

The current Project & Scene panel combines project settings, scene setup, reference assignment, reference management, and research import.

### Overloaded shot inspector

The current shot inspector combines story direction, camera specifications, timing, dialogue, continuity, reference routing, model settings, pricing, generation, imports, and version review in one long form.

### Incorrect state semantics

Selecting a generated image for display is currently presented as approval. Selection and formal approval are different operations. Lumen should use **Selected version** until it has a real review and approval workflow.

### Compressed object model

The current model effectively treats one project as one storyboard and stores generated alternatives as takes on a shot. This will become restrictive for multiple sequences, start/end keyframes, and video generation.

## Recommended Domain Model

```text
Workspace
  Project
    Storyboard
      Group
        Shot
          Panel
            Version
    Reference Library
```

| Object | Meaning |
| --- | --- |
| Project | A production, film, episode, campaign, or creative job. |
| Storyboard | A board or sequence within a project. |
| Group | An organizational container shown as a scene, sequence, section, setup, or generic group. |
| Shot | One continuous camera event with action, camera direction, timing, and sound intent. |
| Panel | A visual keyframe within a shot. Most shots begin with one; complex shots may gain start, middle, or end panels. |
| Version | A generated, imported, or edited alternative for a panel. One version can be selected. |
| Reference | A reusable visual entity or source attached to a project, group, shot, or panel. |

The UI should remain simpler than the data model. A new project can contain one default storyboard; a new shot can contain one default panel. The additional hierarchy exists so Lumen does not need a destructive rewrite when it expands.

## Recommended Information Architecture

### Project-level navigation

```text
Lumen / Project switcher        Storyboards   References        Share   More
```

### Storyboard-level views

```text
Project / Storyboard            Board   Shot list   Timing      Filter   View   Generate
```

- **Board** optimizes for visual order, composition, and story rhythm.
- **Shot list** optimizes for structured metadata and bulk editing.
- **Timing** optimizes for duration, playback, dialogue, voice-over, and later audio.
- **Generate** is an action or temporary workflow, not a permanent project section.
- **Continuity review** should be introduced when it can present actionable findings, rather than as an empty sibling of the board.

## Recommended Workspace Layout

```text
┌ Outline ─────────┬ Board / Shot list / Timing ───────┬ Inspector ───────┐
│ Groups and shots │ Primary creative workspace         │ Selected object  │
└──────────────────┴────────────────────────────────────┴──────────────────┘
```

Both sidebars are collapsible. The center workspace must remain understandable and useful with both closed.

### Left sidebar: outline

The left sidebar is navigation and ordering, not a settings form.

- storyboard selector when a project contains multiple boards;
- groups/scenes with shot counts and total duration;
- shots nested beneath their group;
- collapse, reorder, duplicate, rename, archive, and delete actions;
- add group and add shot.

Project premise, visual direction, reference-library management, imports, and provider settings do not belong here.

### Right sidebar: contextual inspector

The inspector changes with selection.

#### Nothing selected

- storyboard name and aspect ratio;
- scene, shot, panel, and duration summary;
- missing panels or unselected versions;
- primary action to generate missing panels.

#### Group selected

- name;
- location;
- time of day;
- summary or dramatic purpose;
- inherited references;
- shot count and duration.

#### Shot selected

1. **Direction**: title, action or beat, shot size, camera angle, movement, and optional visual direction.
2. **References**: inherited and shot-specific references with visible scope.
3. **Versions**: selected version, alternatives, compare, generate, and import.
4. **Timing and sound**: duration, dialogue, voice-over, and sound notes.
5. **Advanced**: continuity instructions, provider/model provenance, compiled prompt, seed, and reference influence.

Provider tier, price, and model selection belong to the generation action rather than permanent shot metadata. Delete belongs in an overflow menu.

## Reference Architecture

A reference should be an entity that can contain one or more images, not only a single gallery image.

```text
Elias Quinn — Character
  Primary identity image
  Profile image
  Expression image

Metropolitan uniform — Wardrobe
  Front reference
  Badge detail
```

Reference roles, project vocabulary, and provenance are separate dimensions:

- **Roles**: zero or more of character, wardrobe, location / set, prop, look, and composition. Multiple roles are valid when one image genuinely owns several visual facts.
- **Tags**: free-form project vocabulary for named people, places, periods, sequences, departments, or any other retrieval need.
- **Origin**: imported, generated, or research, with optional source URL, title, and rights note.

Research describes where an image came from, not what the image depicts.

References can be assigned at project, group, shot, or panel scope. The UI should show inheritance in plain language such as **Scene default** or **This shot**.

## Flexible Creation Paths

Every entry path should converge on the same storyboard model:

- start blank;
- describe an idea;
- import a script;
- paste an outline;
- import a shot list;
- duplicate a storyboard.

Project templates can set default labels and visible fields without creating hardcoded products:

- film or television: Scene;
- documentary: Sequence;
- commercial or social: Section;
- music video: Setup or Section;
- generic project: Group.

## Visual and Interaction Principles

- Use semantic design tokens and shared accessible primitives.
- Prefer one clear primary action per surface.
- Use neutral selection; reserve green for an explicit successful approval.
- Do not use body text below 12px.
- Use pills only for filters, tags, and compact statuses.
- Use borders for structure and shadows mainly for elevated overlays.
- Keep raw prompts, provider details, and provenance available but collapsed.
- Make keyboard navigation, duplication, reordering, and previous/next shot movement fast.
- Do not force every creator to see every production field.

## Research Questions

The competitive study should answer:

1. How do director-facing tools model projects, storyboards, scenes/groups, shots, panels, and versions?
2. Which information stays visible on board cards, and which moves into inspectors or shot-list columns?
3. How do tools support script-first and scriptless creation without splitting the product?
4. How do they organize reusable characters, locations, props, wardrobe, and visual style?
5. How do they separate creation, generation, comparison, selection, review, approval, and export?
6. Which AI controls are exposed, and which are hidden behind higher-level creative direction?
7. How do they transition from still boards to timing, animatics, and video?
8. Which patterns are appropriate for Lumen, and which belong to larger production-management suites?

## Competitive Research

### The relevant product landscape

Lumen sits between several established categories. These products are useful references, but none is the product to copy in full.

| Category | Representative products | What Lumen should learn |
| --- | --- | --- |
| Storyboard and shot planning | StudioBinder, Boords | Familiar hierarchy, board and shot-list views, grouping, collaboration, and exports. |
| Professional storyboarding and animatics | Toon Boom Storyboard Pro, Wonder Unit Storyboarder | Panel structure, captions, timing, audio, keyboard speed, and a disciplined path from boards to animatics. |
| Director's blocking and previs | Previs Pro, Shot Designer, FrameForge | Blocking, camera intent, lens choices, and the difference between story order and shooting concerns. |
| Visual research and look development | ShotDeck, Milanote, Adobe Firefly Boards | Searchable references, decks or collections, provenance, moodboards, and optional freeform ideation. |
| Review and version comparison | Frame.io | Versions, comparison, comments, and approval as separate concepts. |
| AI-native visual storytelling | LTX Studio, Katalist, Storyboarder.ai, StoryboardHero | Persistent story entities, editable AI breakdowns, reusable references, targeted revisions, and current market expectations. |
| Image-reference systems | Runway, Midjourney, OpenAI image generation | References have different jobs; provider-specific capabilities should sit behind a stable creative model. |

The closest product-design references are **StudioBinder and Boords for structure**, **Storyboard Pro and Storyboarder for the working loop**, **LTX Studio for persistent AI context**, and **Runway, Midjourney, and OpenAI for reference-aware generation**. Previs Pro and Shot Designer are valuable future references for blocking and camera planning, but their 3D scope should not drive the current application.

### Product findings

#### StudioBinder: production-familiar structure without adopting the whole suite

[StudioBinder's storyboard tool](https://www.studiobinder.com/storyboarding-tool/) separates storyboards, shot lists, and moodboards while allowing them to connect to scripts and production planning. It supports camera specifications, grouping by scene or location, custom layouts, aspect ratios, image libraries, shot numbering, comments, and sharing.

Adopt:

- recognizable project, storyboard, scene, shot, and shot-list concepts;
- separate visual and structured views over the same shots;
- grouping and sorting that does not change the underlying story order;
- curated camera and framing choices rather than prompt-shaped forms;
- printable and shareable outputs.

Do not adopt scheduling, call sheets, contacts, and production administration. They would obscure Lumen's director-facing creative loop.

#### Boords: task-specific views over one storyboard

[Boords' storyboard views](https://boords.com/docs/storyboard-views) provide global, grid, shot-list, script-text, frame-editor, generator, and external review views. [Its creation flow](https://boords.com/docs/creating-storyboards) supports blank boards, script import, and AI generation. [Frame notes](https://help.boords.com/en/articles/3430147-adding-notes-to-a-storyboard) can expose standard or custom fields such as action, sound, lighting, and camera.

Adopt:

- one canonical storyboard with views optimized for ordering, editing, generation, timing, and review;
- optional blank, idea, outline, shot-list, and script entry paths;
- project-level field visibility and custom labels;
- a dedicated frame or shot editor instead of putting every field on every card.

Avoid multiplying navigation modes until each has a distinct task. Lumen initially needs only Board, Shot list, and Timing.

#### Toon Boom Storyboard Pro: the professional object and timing model

[Storyboard Pro's structure](https://docs.toonboom.com/help/storyboard-pro-20/storyboard/structure/about-storyboard-structure.html) distinguishes acts, sequences, scenes, and panels. In live-action language, its scene is effectively a shot, and multiple panels can describe action within that camera event. [Panel captions](https://docs.toonboom.com/help/storyboard-pro-24/storyboard/caption/about-default-panel-caption.html) include dialogue, action, timing, and notes and can be customized. Its [animatic workflow](https://docs.toonboom.com/help/storyboard-pro-20/storyboard/getting-started/animatic.html) adds panel duration, camera and layer motion, transitions, and synchronized audio.

Adopt:

- a shot can contain more than one visual panel without forcing every shot to do so;
- action, dialogue, timing, and notes are structured fields, not prompt fragments;
- an animatic is timed playback of selected panels with sound, not a synonym for a gallery slideshow;
- panel duration and audio belong in a timeline-oriented view.

Avoid exposing drawing layers, compositing, and animation-production controls in the main Lumen workspace.

#### Wonder Unit Storyboarder: speed is a feature

[Storyboarder](https://wonderunit.com/storyboarder/) centers a fast loop: add, draw or import, duplicate, reorder, annotate, and export. Dialogue, action, timing, and shot type live in a compact inspector. It also supports an external-editor round trip and exports to common editorial tools.

Adopt:

- fast previous/next navigation, duplicate shot, reorder, and keyboard shortcuts;
- a compact inspector for the common fields;
- a clean round trip from a panel into Lumen's existing image editor;
- exports that allow creators to leave Lumen without losing their work.

#### Previs Pro and Shot Designer: preserve director intent

[Previs Pro](https://www.previspro.com/) follows a director-oriented progression: construct the environment, block actors and props, choose the camera, then iterate in a shot list or timeline. [Shot Designer](https://play.google.com/store/apps/details?id=air.us.hollywoodcamerawork.shotdesigner) connects camera diagrams, blocking, shot lists, and storyboards.

Adopt now:

- language for subject blocking, screen direction, shot size, camera angle, movement, and optional focal length;
- progressive disclosure: most users see framing and movement, while advanced camera data remains available;
- room in the model for later blocking diagrams and camera plans.

Do not build 3D sets, AR, lens simulation, or camera diagrams in the current refactor. They are integrations or later workstreams, not prerequisites for a coherent storyboard product.

#### ShotDeck and Milanote: references need retrieval and curation

[ShotDeck](https://shotdeck.com/) makes film stills useful through detailed tags for framing, composition, lighting, color, locations, emotion, cameras, and lenses, then lets creators assemble shareable decks. [Milanote](https://milanote.com/product/storyboarding) provides flexible boards for collecting notes, images, video, and files.

Adopt:

- searchable, tagged reference entities and reusable collections;
- filters based on creative attributes, not only filenames or provider IDs;
- optional moodboards or a freeform visual-development surface;
- clear attribution and provenance for uploaded, researched, imported, and generated material.

Do not make an infinite canvas the primary storyboard. Ordered shots, metadata, and timing need a canonical sequence.

#### Frame.io: selection is not approval

[Frame.io's comparison viewer](https://help.frame.io/en/articles/9952618-comparison-viewer) treats comparison as a dedicated task, with side-by-side and overlay views, linked zoom, and asset-specific comments.

Adopt:

- **Selected version** for the version currently used on the board;
- a focused compare surface for two or more versions;
- **Approved** only when Lumen has a named review state, actor, and history;
- comments and external review as a later workflow, not as decorative status color.

### AI-native findings

#### LTX Studio: reusable entities, editable breakdowns, targeted revisions

[LTX Studio's workflow](https://ltx.io/blog/ltx-studio-tutorial) connects generation, storyboards, retakes, timing, and sound. Its [Elements system](https://ltx.io/blog/getting-started-with-elements) creates reusable characters, objects, locations, and styles that can be assigned to shots. Its newer [storyboard workflow](https://ltx.io/blog/ltx-storyboard-generator-update) extracts structure from an input and lets the creator review the breakdown before committing generation.

Adopt:

- persistent, reusable creative entities instead of repeatedly describing a character or location;
- explicit assignment of entities to the shots in which they belong;
- AI-suggested breakdowns that remain editable before paid generation;
- targeted **Revise selected** actions instead of treating full regeneration as the only correction method;
- a visible generation plan that shows shots, references, model, and expected cost.

Avoid a black-box “make the whole film” action as the primary experience. The product should accelerate direction, not remove it.

#### AI storyboard generators: useful market signal, not the product architecture

[Katalist](https://www.katalist.ai/), [Storyboarder.ai](https://www.storyboarder.ai/), and [StoryboardHero](https://storyboardhero.ai/features) converge on familiar promises: idea or script input, automatic scene and shot breakdown, consistent characters, per-frame edits, camera controls, animatics, and export.

This validates user demand for fast setup and consistency. It also exposes the commodity risk: an application that only turns text into a grid of generated images is an image-model wrapper. Lumen should differentiate through reusable context, deliberate reference routing, version history, continuity review, finishing, and provider-neutral handoff to video.

### Reference-aware image generation

Current image systems do not use “a reference” in one universal way:

- [Runway References](https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References) supports persistent character, location, and treatment references, while sketches can direct composition and placement.
- Midjourney separates [image prompts](https://docs.midjourney.com/hc/en-us/articles/32040250122381-Image-Prompts), [style references](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference), [Omni References](https://docs.midjourney.com/hc/en-us/articles/36285124473997-Omni-Reference), and [moodboards](https://docs.midjourney.com/hc/en-us/articles/39193335040013-Moodboards).
- [OpenAI image generation](https://developers.openai.com/api/docs/guides/image-generation) supports image generation and editing from one or more image inputs. Its Responses API supports multi-turn image workflows, while the Image API fits single generation or edit operations.
- [Adobe Firefly Boards](https://helpx.adobe.com/uk/firefly/web/create-mood-boards/firefly-boards/about-firefly-boards.html) combines references, artboards, ideation, editing, partner models, and visible provenance in a freeform visual-development surface.

Lumen should therefore store a provider-neutral assignment with a semantic role:

| Reference role | Creative meaning | Typical use |
| --- | --- | --- |
| Character | Keep a person or creature recognizable. | Face, age, hair, build, and distinguishing features. |
| Wardrobe | Carry a specific worn item or costume design. | A uniform used only in selected scenes. |
| Location / set | Establish recurring architecture and spatial facts. | The same office from different angles. |
| Prop | Preserve a handled or hero object and its ownership. | A badge, satchel, vehicle, or weapon. |
| Look | Guide palette, texture, medium, lighting language, or period treatment. | A storyboard-wide look profile. |
| Composition | Guide placement, pose, eyeline, screen direction, or camera geometry. | A sketch, diagram, or prior composition. |
| Continuity source | Preserve relevant facts from an existing panel without inheriting everything in it. | Match wardrobe and time of day across non-adjacent shots. |
| Start or end frame | Anchor a video generation or transition. | Later image-to-video workflows. |

The provider adapter maps these stable roles to the capabilities, limits, and vocabulary of the selected model. The UI should never silently attach every reference to every shot. It should show inheritance, shot-specific assignments, unsupported roles, reference-count limits, and which inputs were actually sent.

### Cross-product conclusions

The strongest recurring patterns are:

1. **One canonical sequence, several task-specific views.** Board, Shot list, and Timing are representations of the same shots.
2. **Hierarchy stays shallow in the interface but durable in the model.** Project, Storyboard, Group, Shot, Panel, and Version supports professional work without forcing complexity onto a new user.
3. **References are first-class reusable entities.** They are not attachments embedded in one prompt or one browser session.
4. **Shot direction and generation settings are different concerns.** “Low angle, slow push-in” belongs to the shot; provider, model, quality, and cost belong to a generation run.
5. **AI proposes structure but the director commits it.** Breakdown, reference routing, and generation plans should be reviewable and editable.
6. **Versions are immutable outputs.** Select, compare, revise, approve, and delete are separate actions.
7. **Timing earns a dedicated workspace.** Animatic playback, audio, and duration do not belong on every board card.
8. **Freeform visual development is useful but secondary.** Moodboards and research collections feed the ordered storyboard rather than replacing it.
9. **Progressive disclosure beats universal forms.** Common direction stays visible; provider internals, lenses, seeds, prompts, and provenance remain available when needed.
10. **Portability creates trust.** Exported boards, shot lists, images, metadata, and later editorial handoffs prevent lock-in.

## Recommended Lumen Framework

### Primary product loop

```text
Collect references → Build groups and shots → Assign relevant context
        ↓                                           ↓
   Create or import panels ← Review generation plan → Generate
        ↓
Compare versions → Select → Check continuity → Time as animatic → Export
```

The user can enter at any point. A creator may build references first, start with a blank shot, import existing panels, or ask AI for an editable breakdown.

### Project structure

```text
Project
├── Storyboards
│   ├── Board
│   ├── Shot list
│   └── Timing
└── References
    ├── All
    ├── Characters
    ├── Locations
    ├── Wardrobe and props
    ├── Looks
    └── Collections
```

References are scoped to the active project by default. A future workspace library can support deliberate reuse across projects, but should be a separately labeled scope rather than a mixed gallery.

### Board-card information hierarchy

A board card should show only what is needed for sequence review:

- shot number and selected panel;
- shot title or short action beat;
- shot size, movement, and duration when present;
- missing, generating, or failed state;
- count of additional panels or versions;
- a subtle selected state.

Full prompt text, every reference thumbnail, provider, price, seed, dialogue, and continuity notes belong in the inspector or another view. View controls can optionally expose one caption field or increase metadata density.

### Shot-list columns

The Shot list is a table or dense list over the same shots. Sensible defaults are shot number, group, description, shot size, angle or movement, duration, panel state, and selected version. Users can show dialogue, sound, location, lens, status, or custom fields without making them universal requirements.

### Generation run

Generation should open a temporary review surface rather than expanding the shot inspector indefinitely:

1. Choose missing panels, selected shots, or an entire group.
2. Review the compiled direction and reference assignments per shot.
3. Resolve unsupported references or provider limits.
4. Choose provider, model, quality, and output count.
5. Show an estimated total before submission.
6. Run a queue whose outputs are saved as immutable versions with provenance.

### Continuity review

Continuity should report evidence, not decorate cards with a generic score. Findings can be grouped by subject identity, wardrobe or prop, environment, screen direction, time of day, and look. Each finding should identify the affected shots and allow the creator to accept, dismiss, change reference routing, or revise a selected panel.

## Standard Terminology

Use established terms wherever possible:

| Term | Lumen meaning |
| --- | --- |
| Storyboard | An ordered visual plan for a sequence or piece. |
| Group | A neutral organizing container presented as Scene, Sequence, Section, or Setup by template. |
| Shot | One continuous camera event. |
| Panel | A key image representing a moment within a shot. |
| Version | An alternative output for one panel. |
| Shot list | A structured view of shots and production-relevant metadata. |
| Animatic | Timed playback of storyboard panels, normally with dialogue, voice-over, sound, or music. |
| Blocking | Placement and movement of subjects relative to the set and camera. |
| Previsualization or previs | Planning motion, staging, camera, and timing before production, often in 3D. |
| Moodboard | A curated visual reference collection used to establish direction, not an ordered sequence. |
| Look | Reusable visual treatment such as lighting language, palette, texture, medium, and period treatment. |
| Select | Choose the version currently used by the storyboard. |
| Approve | Record a formal review decision with a reviewer and history. |

## Incremental Refactor Plan

This should be an extraction and migration, not a rewrite. Preserve the working storyboard, local workspace, generated assets, storage APIs, and image editor. Replace semantics and layout around them in small verifiable steps.

### Phase 1: correct the shell and language

- Make **Storyboards** and **References** project-level destinations.
- Put **Board**, **Shot list**, and **Timing** inside the active storyboard.
- Replace the left settings form with an outline of groups and shots.
- Move project setup to a project dialog and group fields to the contextual inspector.
- Rename visible **Takes** to **Versions** and **Approved** to **Selected** without changing stored fields yet.
- Remove the global green approved treatment; use neutral selection and semantic success only for completed operations.
- Move provider, model, quality, price, and generate controls into a generation dialog or drawer.
- Scope References to the active project and clearly label any later workspace-wide library.

This phase should operate on the existing store and APIs so its risk is primarily presentational.

### Phase 2: split the current workspace into focused components

Extract from the current storyboard workspace one surface at a time:

```text
StoryboardShell
├── StoryboardHeader
├── StoryboardOutline
├── BoardView
├── ShotListView
├── TimingView
├── ContextInspector
└── GenerationRunDialog
```

Keep the current state owner while extracting. Each component should receive domain objects and callbacks rather than reaching into storage directly. Shared buttons, dialogs, tabs, fields, menus, tooltips, and scroll areas should use the application's accessible UI primitives and semantic tokens.

Current code seams make this feasible without replacing the application:

| Current module | Incremental treatment |
| --- | --- |
| `src/components/storyboard/StoryboardWorkspace.tsx` | Keep as the state-owning shell first. Extract its existing project panel, board, shot card, review stage, and inspector into focused components; then add Shot list and Timing views against the same props. |
| `src/lib/storyboard/store.ts` | Preserve the Zustand store and server persistence. Add a domain adapter and versioned migrations before changing persisted shapes. |
| `src/lib/storyboard/prompt.ts` | Evolve from one compiled prompt function into provider-neutral direction compilation plus small provider adapters. Keep compiled prompts inspectable. |
| `src/lib/storyboard/reference.ts` | Holds role and provenance inference, labels, and library filter helpers. Schema v6 assignment-role inheritance is resolved in `generation-plan.ts`. |
| `src/lib/storage/shared-workspace.ts` | Keep as the client boundary for canonical shared data; UI components should not call workspace routes directly. |
| `src/lib/storage/local-workspace-server.ts` | Preserve the local server-backed project and asset authority; add schema-aware reads and migrations without moving data back into a browser-only store. |
| `src/components/editor/*` | Keep the editor independent. Open the selected panel version as an edit source and save the finished result as a new version. |

`StoryboardWorkspace.tsx` is currently large enough that extraction itself is a meaningful reliability improvement. The first extraction should not introduce a new state library or redesign storage at the same time.

### Phase 3: add a compatibility domain layer and migrations

Introduce additive schema changes behind adapters:

- create one default storyboard for existing projects;
- create one default panel for each existing shot;
- map existing `takes` to panel versions and `selectedTakeId` to selected version;
- split reference `category` from `origin` — implemented as multi-select roles, free-form tags, and `sourceType` provenance, with the legacy `research` kind migrated to provenance;
- allow a reference entity to hold multiple visual assets while retaining the current primary image;
- store reference scope and semantic assignment role — implemented in schema v6 with scene and shot role overrides plus take-level snapshots;
- preserve old serialized projects and migrate on load with a schema version.

The UI should consume the compatibility domain model before storage is rewritten. Old work must open with the same selected images and ordering.

### Phase 4: make generation explicit and provider-neutral

Add `GenerationPlan`, `GenerationRun`, and provider-adapter concepts:

- compile direction from project, group, shot, and panel fields;
- resolve inherited and shot-specific references with semantic roles;
- validate provider capabilities and input limits;
- preview selected shots, references, output count, and estimated cost;
- queue each panel independently so one failure does not discard a batch;
- persist immutable version provenance, including provider, model, inputs, and source version;
- separate **Generate alternative**, **Revise selected**, **Edit in Lumen**, and **Import**.

Do not make the compiled prompt the domain model. It is an inspectable output of the plan and adapter.

### Phase 5: introduce evidence-based continuity

- compare selected panels against the references actually assigned to each shot;
- support non-adjacent comparisons through shared entities rather than chaining every image to the previous one;
- report focused findings with affected shots and a suggested action;
- let the creator accept, dismiss, reassign a reference, or create a targeted revision;
- never imply that an unchecked panel is consistent.

### Phase 6: make Timing a real animatic workspace

- play selected panels in sequence using their durations;
- add dialogue, voice-over, music, and sound tracks progressively;
- allow shot and panel timing adjustments without changing board order;
- support start and end panels for shots intended for image-to-video generation;
- export an animatic and structured editorial handoff when the data is sufficient.

### Phase 7: optional visual-development and review surfaces

- add reference collections or moodboards without replacing the ordered board;
- add a focused version-comparison surface;
- add external review, comments, and formal approval only with real reviewer identity and history;
- explore blocking diagrams or a previs integration only after the core storyboard loop is reliable.

## Refactor Guardrails

- No big-bang rewrite or replacement state system.
- No browser-only project authority; the current server-backed workspace remains canonical.
- No automatic use of every reference in every generation.
- No destructive regeneration of a selected version.
- No script requirement and no rigid universal prompt form.
- No provider-specific terms in the core domain model.
- No invented continuity score without inspectable evidence.
- No expansion into scheduling, call sheets, budgeting, or crew management.
- No removal of the image editor; expose it as a deliberate finishing action.

## Acceptance Criteria for the First Product Pass

1. A new user can tell the difference between a project, a storyboard, a group, a shot, a panel, and a version through the interface without reading documentation.
2. The board remains the visual center; both sidebars can close without making it unusable.
3. References shown and assigned belong to the current project, with visible scope and role.
4. A selected image is labeled selected, not approved.
5. A user can switch between Board and Shot list without changing or duplicating data.
6. Generation exposes target shots, references, provider, output count, and expected cost before it runs.
7. Each generated output records enough provenance to reproduce or revise intentionally.
8. Existing local projects and generated images survive the migration unchanged.
9. The current image editor is reachable as **Edit selected** and produces a new version rather than flattening history.
10. The layout works for a three-shot test and a fifty-shot board without turning into one long form.
