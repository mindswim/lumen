# Storyboard Prototype Handoff

Last updated: 2026-08-26
Audience: the next product-design or implementation agent working on Lumen

## Read This First

Lumen is being repositioned from a VSCO-style image editor with AI controls into an image-first director's workspace for creating coherent storyboards, while preserving the existing image editor as a finishing surface.

The intended product is not a full film-production-management suite and not a prompt-to-image grid. Its durable value is reusable visual context, deliberate reference assignment, structured shot direction, immutable versions, continuity review, timing, and eventual handoff to video.

Read [STORYBOARD_PRODUCT_DESIGN.md](./STORYBOARD_PRODUCT_DESIGN.md) for the research, recommended domain model, information architecture, standard terminology, and incremental refactor plan.

## Current Routes

| Route | Status | Purpose |
| --- | --- | --- |
| `/` | Working production workspace | Current gallery, storyboard, timing, references, storage, generation, and editor integration. This remains the canonical implementation. |
| `/storyboard-prototype` | Static interactive prototype | Proposed information architecture and workspace shell. It uses representative Police Riot data and real images but does not read or write project state. |
| `/editor` | Working production editor | Existing image-finishing surface that should remain independent and later save edits as new panel versions. |

Do not mistake polished prototype interactions for production functionality. The prototype intentionally has no store, persistence, generation calls, mutations, or export behavior.

## Active Refactor Branch

Branch: `codex/storyboard-workspace-refactor`

The production transition is now implemented on this branch:

- the prototype's two header rows are collapsed into one responsive workspace header;
- Storyboards and References are project-level destinations; Board, Shot list, and Timing are views of the same storyboard data;
- a scene-and-shot outline replaces the former permanent project-settings rail, while project and scene setup remain available in a focused dialog;
- the Board keeps images primary and groups the real stored shots by scene;
- Shot list is a structured table over those same shots, with panel, scene, action, framing, movement, duration, and selected-version state;
- Timing is a working lightweight animatic preview that advances through selected panels according to each shot's stored duration;
- the References workspace is project-scoped, categorized, searchable, and built from production reference records rather than all gallery images;
- selecting a reference opens a production-asset inspector with editable category/direction, provenance, and inherited/direct shot usage;
- image generation moved out of the long inspector form into an explicit review dialog showing the target, exact assigned references, inheritance scope, provider limit, tier, pricing basis, and paid-run action;
- the shot inspector remains the home for direction, reference assignment, timing, imported panels, and immutable versions;
- visible **Approved** language is replaced with **Selected**, decorative green approval treatment is removed, and the fake continuity score/view is gone.

The refactor deliberately preserves the current persisted schema, shared-workspace APIs, generated Police Riot assets, existing image editor, and generation API. `/storyboard-prototype` remains as a design fixture; `/` is the real implementation to evaluate.

## Prototype Source

- `src/app/storyboard-prototype/page.tsx`
- `src/components/storyboard-prototype/StoryboardPrototype.tsx`
- `public/generated/great-police-riot/`

The prototype currently demonstrates:

- project-level Storyboards and References destinations;
- Board, Shot list, and Timing views over the same static shot sequence;
- scene and shot outline navigation;
- contextual shot inspector;
- neutral **Selected version** semantics rather than decorative approval;
- project-scoped reusable references and visible shot usage;
- a generation-review dialog showing target, assigned references, provider, quality, outputs, and a cost checkpoint;
- a lightweight animatic player and proportional shot strip;
- responsive outline and inspector drawers.

Validation completed at handoff:

- `npm run lint`
- `npm run build`
- browser checks of Board, Shot list, Timing, References, generation review, responsive outline, and responsive inspector

## Latest User Feedback

The user approved continuing the prototype-to-production transition. The core intent remains:

- keep the product flexible and image-first rather than making script ingestion mandatory;
- use references systematically without sending every reference to every shot;
- preserve the image editor, but do not position AI as a collection of look sliders;
- make the app feel like a legitimate director-side product using familiar storyboard terminology and proven information architecture;
- keep clean storyboard-to-video handoff as the longer-term direction.

The unified shell is now in production code. Further work should refine this implementation rather than create another detached mockup.

## What the Prototype Gets Right

1. The images are again the visual center of the product.
2. Board, Shot list, and Timing read as task-specific views of one sequence rather than separate products.
3. The outline is navigation and ordering, not a long settings form.
4. The inspector is contextual to the selected shot.
5. References are visibly project-scoped rather than mixed across projects.
6. Selection is neutral and distinct from review approval.
7. Generation is a deliberate run with visible inputs instead of an opaque button buried in shot metadata.
8. The visual language remains recognizably Lumen rather than imitating a large production suite.

## Areas That Need Better Treatment

These are thoughtful follow-ups, not all requirements for the first implementation pass.

### Header and navigation

- Collapse the two header rows.
- Make the relationship among project, storyboard, current view, and References obvious without breadcrumb clutter.
- Determine whether References is a persistent destination in the unified header or the root item in the left project outline.
- Retain usable navigation when both sidebars are collapsed.

### Inspector density

- The prototype inspector is cleaner than production but still risks becoming a vertical form.
- Consider compact summary rows with focused edit modes rather than making every field permanently editable.
- Versions may deserve a visual strip or focused compare action rather than only a stacked inspector section.
- Project, scene, shot, panel, and version selection states must never be ambiguous.

### Board density

- Test small, medium, and large card densities on boards with 3, 9, 30, and 50 shots.
- The current selected-card outline may be visually heavier than necessary.
- Add view preferences for one caption field, metadata density, card size, and scene grouping without turning the toolbar into a settings shelf.

### Responsive behavior

- The drawers work, but the narrow-screen header still needs deliberate prioritization.
- Mobile should support review and light edits; dense shot-list and advanced generation planning can optimize for wider screens.

## Researched Patterns Not Yet Fully Represented

### Multiple storyboards and flexible grouping

StudioBinder and Boords support multiple boards and flexible grouping. The prototype presents one storyboard and fixed scenes. Production should eventually support multiple storyboards per project and allow templates to label the neutral group object as Scene, Sequence, Section, or Setup.

### Multiple panels within a shot

Storyboard Pro's important distinction between a shot and its panels is only in the design document, not the prototype. Most shots can begin with one panel, but a moving or complex shot should be able to add start, middle, or end panels. Do not expose empty panel complexity to every user.

### Configurable caption fields and shot-list columns

Boords and Storyboard Pro allow projects to choose fields such as Action, Dialogue, Sound, Lighting, Camera, and custom notes. The prototype uses a fixed set. A later pass should allow field visibility and naming at the project or template level.

### Real version comparison and review

Frame.io's dedicated comparison pattern is represented only by a button. A useful compare surface needs side-by-side or overlay comparison, linked zoom, clear version identity, and selection separate from approval. Formal approval should wait until reviewer identity and history exist.

### Editable AI breakdown before generation

LTX Studio and AI storyboard products commonly turn an idea, outline, shot list, or script into a proposed breakdown. Lumen should show that structure for editing before committing paid generation. The prototype begins after shots already exist.

### Multi-shot generation planning

The generation dialog currently demonstrates one selected shot. It should eventually support missing panels, selected shots, or a group; expose per-shot reference assignments; validate provider limits; and isolate failures. The compiled prompt should remain an inspectable output, not the core data model.

### Semantic reference routing and inheritance

The prototype displays roles such as Subject identity and Environment, but assignment is not interactive. Production needs semantic roles, project/group/shot/panel scope, visible inheritance, provider-capability mapping, and a guarantee that every project reference is not silently sent to every generation.

### Evidence-based continuity review

Continuity is intentionally absent from the prototype. Do not reintroduce a generic score or green badge. A future review should name the issue, affected shots, evidence category, and available actions such as dismiss, reassign a reference, or revise a selected panel.

### Real animatic editing

The prototype Timing view demonstrates the concept but advances frames on a simple preview timer. A real animatic needs accurate durations, scrubbing, playhead behavior, dialogue or voice-over, audio tracks, and later waveform and export support.

### Faster professional operation

Wonder Unit Storyboarder highlights keyboard speed. Lumen still needs shortcuts for previous/next shot, duplicate, reorder, add shot, select version, and open the inspector. Drag reordering and bulk shot-list editing are also unresolved.

### Moodboards, collections, and provenance

ShotDeck, Milanote, and Firefly Boards suggest better reference retrieval, collections, visual-development boards, and source provenance. These should feed the ordered storyboard and should not replace it with an infinite canvas.

### Blocking, lenses, and previs

Previs Pro and Shot Designer show the value of blocking, screen direction, focal length, and camera diagrams. Preserve room in the model, but do not build 3D sets, AR, or a full previs system during the current refactor.

### Export and editorial handoff

Professional tools earn trust through PDF, images, shot-list data, animatics, and editorial exports. The prototype does not show export or portability yet.

## Production Code to Preserve

- `src/components/storyboard/StoryboardWorkspace.tsx` is the current state-owning storyboard implementation. It is large and should be extracted incrementally, not replaced wholesale.
- `src/lib/storyboard/store.ts` contains the current Zustand domain and versioned persistence migration.
- `src/lib/storyboard/prompt.ts` composes current storyboard prompts and should evolve into provider-neutral direction compilation plus provider adapters.
- `src/lib/storage/shared-workspace.ts` is the client boundary for shared local state.
- `src/lib/storage/local-workspace-server.ts` owns server-backed metadata and assets under `.lumen/` by default.
- `src/components/editor/` and the WebGL pipeline are working production surfaces. Preserve them and connect selected-panel editing through new immutable versions later.

The repository contains calibration scripts and the complete Police Riot image bundle. They are evidence and test fixtures for continuity/reference experiments, not the long-term product data model.

## Recommended Next Sequence

1. Let the user evaluate `/` with a second real storyboard and note friction in Board, Shot list, Timing, References, and generation review.
2. Extract `StoryboardWorkspace.tsx` into focused production components now that the UI boundaries have stabilized; do not change the store during that extraction.
3. Add explicit version comparison and make image-editor saves create new storyboard versions instead of mutating the selected asset in place.
4. Add multi-shot generation planning for missing or selected shots, with per-shot validation and isolated failure/retry.
5. Evolve the model from one storyboard per project toward multiple storyboards and neutral groups, then add optional start/middle/end panels only for shots that need them.
6. Upgrade the animatic with scrubbing, accurate playhead time, dialogue/voice-over tracks, and export rather than expanding into a general video editor.
7. Add professional export and handoff surfaces: PDF/contact sheet, images, shot-list data, and animatic output.

## Validation on the Refactor Branch

- `npm run lint`
- `npm run build`
- browser review of the production Board, project outline, project settings, Shot list, working animatic playback, project-scoped References, reference inspector, and generation-review dialog
- browser console checked with no application errors

## Guardrails for the Next Agent

- Do not rewrite the current store and UI simultaneously.
- Do not connect the prototype directly to production persistence as a shortcut.
- Do not restore **Approved** merely because every current shot has a selected image.
- Do not send every reference to every shot.
- Do not make scripts mandatory.
- Do not invent film-production terminology when an established term exists.
- Do not remove or flatten the image editor; edits should eventually create new versions.
- Do not expand into schedules, budgets, call sheets, or crew management.
- Preserve unrelated user changes in the dirty worktree.
