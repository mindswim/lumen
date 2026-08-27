# Storyboard Prototype Handoff

Last updated: 2026-08-27
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
| `/storyboard-print` | Working print surface | Project-specific storyboard layout used by the production Export dialog for printing or saving a PDF. |

Do not mistake polished prototype interactions for production functionality. The prototype intentionally has no store, persistence, generation calls, mutations, or export behavior.

## Active Refactor Branch

Branch: `codex/storyboard-workspace-refactor`

The production transition and the first director-workflow pass are now implemented on this branch:

- the prototype's two header rows are collapsed into one responsive workspace header;
- Storyboards and References are project-level destinations; Board, Shot list, and Timing are views of the same storyboard data;
- a scene-and-shot outline replaces the former permanent project-settings rail, while project and scene setup remain available in a focused dialog;
- the Board keeps images primary and groups the real stored shots by scene;
- Shot list is a structured table over those same shots, with panel, scene, action, framing, movement, duration, and selected-version state;
- Timing is a working lightweight animatic preview with play/pause, accurate elapsed time, scrubbing, shot seeking, dialogue/voice-over display, and optional within-shot panel playback;
- the References workspace is project-scoped, categorized, searchable, and built from production reference records rather than all gallery images;
- selecting a reference opens a production-asset inspector with editable category/direction, provenance, and inherited/direct shot usage;
- image generation moved out of the long inspector form into an explicit generation plan. It can target the current panel, the current scene, or every shot missing a Start panel; shows the exact references and validation state for each target; and keeps successful results if another target fails;
- a shot can optionally expose Start, Middle, and End panels. Each enabled panel has its own direction, selected version, versions, comparison action, and generation target; one-panel shots remain the default;
- each generated or imported result is appended as a new take. Version comparison supports side-by-side and opacity overlay modes, with selection kept distinct from review approval; the finishing editor still needs to return edits as new takes rather than mutating a take's gallery asset;
- the shot inspector remains the home for direction, reference assignment, timing, optional panels, imported images, and versions;
- Export provides a printable/PDF board, high-resolution contact-sheet PNG, shot-list CSV, and portable project manifest;
- visible **Approved** language is replaced with **Selected**, decorative green approval treatment is removed, and the fake continuity score/view is gone.

The refactor deliberately preserves the shared-workspace APIs, generated Police Riot assets, existing image editor, and generation API. The storyboard store advances from schema v3 to v4; hydration migrates every existing take and selected version to the Start panel and writes the normalized project back to shared storage. `/storyboard-prototype` remains as a design fixture; `/` is the real implementation to evaluate.

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

## Areas That Still Need Better Treatment

These are thoughtful follow-ups, not all requirements for the first implementation pass.

### Header and navigation

- Collapse the two header rows.
- Make the relationship among project, storyboard, current view, and References obvious without breadcrumb clutter.
- Determine whether References is a persistent destination in the unified header or the root item in the left project outline.
- Retain usable navigation when both sidebars are collapsed.

### Inspector density

- The production inspector is clearer but still risks becoming a vertical form.
- Consider compact summary rows with focused edit modes rather than making every field permanently editable.
- Versions now have a focused compare action; linked pan/zoom is not implemented yet.
- Project, scene, shot, panel, and version selection states must never be ambiguous.

### Board density

- Test small, medium, and large card densities on boards with 3, 9, 30, and 50 shots.
- The current selected-card outline may be visually heavier than necessary.
- Add view preferences for one caption field, metadata density, card size, and scene grouping without turning the toolbar into a settings shelf.

### Responsive behavior

- The drawers work, but the narrow-screen header still needs deliberate prioritization.
- Mobile should support review and light edits; dense shot-list and advanced generation planning can optimize for wider screens.

## Researched Patterns and Their Current Status

### Multiple storyboards and flexible grouping

StudioBinder and Boords support multiple boards and flexible grouping. The prototype presents one storyboard and fixed scenes. Production should eventually support multiple storyboards per project and allow templates to label the neutral group object as Scene, Sequence, Section, or Setup.

### Multiple panels within a shot

Implemented in production using optional Start, Middle, and End panels. Start is always present; Middle and End are explicitly added only when a moving or complex shot needs another composition. Disabling a panel does not destroy its versions. This preserves Storyboard Pro's useful shot/panel distinction without exposing empty panel complexity to every user.

### Configurable caption fields and shot-list columns

Boords and Storyboard Pro allow projects to choose fields such as Action, Dialogue, Sound, Lighting, Camera, and custom notes. The prototype uses a fixed set. A later pass should allow field visibility and naming at the project or template level.

### Real version comparison and review

Implemented side-by-side and opacity-overlay comparison with clear version identity and a **Select this version** action. Linked zoom is still absent. Selection remains separate from approval; formal approval should wait until reviewer identity and history exist.

### Editable AI breakdown before generation

LTX Studio and AI storyboard products commonly turn an idea, outline, shot list, or script into a proposed breakdown. Lumen should show that structure for editing before committing paid generation. The prototype begins after shots already exist.

### Multi-shot generation planning

Implemented for the current panel, current scene, and all shots missing Start panels. Targets can be individually included or excluded; each row shows exact scoped references, provider-limit validation, run state, and isolated errors. Successful frames persist when another target fails. An arbitrary selection assembled directly from the Board or Shot list remains a later refinement. The compiled prompt remains derived output, not the core data model.

### Semantic reference routing and inheritance

The prototype displays roles such as Subject identity and Environment, but assignment is not interactive. Production needs semantic roles, project/group/shot/panel scope, visible inheritance, provider-capability mapping, and a guarantee that every project reference is not silently sent to every generation.

### Evidence-based continuity review

Continuity is intentionally absent from the prototype. Do not reintroduce a generic score or green badge. A future review should name the issue, affected shots, evidence category, and available actions such as dismiss, reassign a reference, or revise a selected panel.

### Real animatic editing

Timing now has accurate duration-based playback, elapsed time, scrubbing, shot seeking, dialogue/voice-over display, and proportional within-shot panel timing. Audio tracks, waveforms, transitions, and rendered video export remain intentionally deferred; this is an animatic review surface, not a general video editor.

### Faster professional operation

Wonder Unit Storyboarder highlights keyboard speed. Lumen still needs shortcuts for previous/next shot, duplicate, reorder, add shot, select version, and open the inspector. Drag reordering and bulk shot-list editing are also unresolved.

### Moodboards, collections, and provenance

ShotDeck, Milanote, and Firefly Boards suggest better reference retrieval, collections, visual-development boards, and source provenance. These should feed the ordered storyboard and should not replace it with an infinite canvas.

### Blocking, lenses, and previs

Previs Pro and Shot Designer show the value of blocking, screen direction, focal length, and camera diagrams. Preserve room in the model, but do not build 3D sets, AR, or a full previs system during the current refactor.

### Export and editorial handoff

Production now exports a printable/PDF storyboard, contact-sheet PNG, shot-list CSV, and JSON project manifest using the selected version of every enabled panel. Rendered animatic video, audio, and editorial interchange formats remain deferred.

## Production Code to Preserve

- `src/components/storyboard/StoryboardWorkspace.tsx` is the current state-owning storyboard implementation. It is large and should be extracted incrementally, not replaced wholesale.
- `src/lib/storyboard/store.ts` contains the current Zustand domain and versioned persistence migration.
- `src/lib/storyboard/prompt.ts` composes current storyboard prompts and should evolve into provider-neutral direction compilation plus provider adapters.
- `src/lib/storage/shared-workspace.ts` is the client boundary for shared local state.
- `src/lib/storage/local-workspace-server.ts` owns server-backed metadata and assets under `.lumen/` by default.
- `src/components/editor/` and the WebGL pipeline are working production surfaces. Preserve them and connect selected-panel editing through new immutable versions later.

The repository contains calibration scripts and the complete Police Riot image bundle. They are evidence and test fixtures for continuity/reference experiments, not the long-term product data model.

## Recommended Next Sequence

1. Refresh `/` so the v3-to-v4 migration runs, then evaluate a real storyboard end to end: add a Middle panel, generate or import two versions, compare and select one, scrub Timing, and export the board.
2. Make **Open in editor** save its result as a new immutable take on the originating shot and panel. The editor must not overwrite the gallery asset backing an older storyboard version.
3. Extract `StoryboardWorkspace.tsx` into focused production components now that Board, Shot list, Timing, inspector, generation plan, comparison, and export boundaries are stable.
4. Add arbitrary multi-shot selection and retry-failed actions to the generation plan; do not add a global reference bucket or send every reference to every target.
5. Add direct manipulation for reorder/duplicate, practical keyboard shortcuts, and denser 30–50-shot board modes before adding more metadata.
6. Decide whether one project needs multiple storyboards and neutral groups before evolving the current Scene model. Treat this as a product decision and a separate schema migration.
7. Add audio tracks, waveform display, and rendered animatic export only after the current timing model proves useful in a real storyboard-to-video workflow.

## Validation on the Refactor Branch

- `npm run lint`
- `npm run build`
- production build includes `/`, `/editor`, `/storyboard-prototype`, and `/storyboard-print`
- the earlier shell transition received browser review of Board, project outline, project settings, Shot list, Timing, References, reference inspector, and generation review with no application console errors
- the 2026-08-27 director-workflow pass was linted and production-built, but automated localhost browser verification was blocked by the in-app browser's URL security policy after the server restart; manually refresh `/` for final interaction QA and persistence migration

## Schema v4 Notes

- `StoryboardShot.panelRoles` stores enabled Start/Middle/End panels. Start is mandatory.
- `StoryboardShot.panelDirections` stores optional direction specific to Middle or End while `prompt` remains shared shot direction.
- `StoryboardShot.selectedTakeIds` stores one selected take per panel role; legacy `selectedTakeId` remains mirrored for Start compatibility.
- `StoryboardTake.panelRole` identifies which panel owns a version.
- Existing v3 takes and selection migrate to Start. Migration is idempotent and persists through the existing shared-workspace endpoint after hydration.
- Generation for a Middle or End panel adds the preceding selected same-shot panel as continuity context. Generation for Start uses only assigned project/scene/shot references unless the user explicitly enables the previous-panel option.

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
