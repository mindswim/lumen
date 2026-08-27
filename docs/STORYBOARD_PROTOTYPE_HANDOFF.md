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
| `/editor` | Working production editor | Existing image-finishing surface. Storyboard-launched edits now save as a new panel version and preserve the source version. |
| `/storyboard-print` | Working print surface | Project-specific storyboard layout used by the production Export dialog for printing or saving a PDF. |

Do not mistake polished prototype interactions for production functionality. The prototype intentionally has no store, persistence, generation calls, mutations, or export behavior.

## Refactor Status

The production transition, structural extraction, and reliability pass are implemented on `main`. The final hardening pass was completed on `codex/storyboard-refactor-finish` before merging back to `main`:

- the prototype's two header rows are collapsed into one responsive workspace header;
- Storyboards and References are project-level destinations; Board, Shot list, and Timing are views of the same storyboard data;
- a scene-and-shot outline replaces the former permanent project-settings rail, while project and scene setup remain available in a focused dialog;
- the Board keeps images primary and groups the real stored shots by scene;
- Shot list is a structured table over those same shots, with panel, scene, action, framing, movement, duration, and selected-version state;
- Timing is a working lightweight animatic preview with play/pause, accurate elapsed time, scrubbing, shot seeking, dialogue/voice-over display, and optional within-shot panel playback;
- the References workspace is project-scoped, searchable by name/direction/tag, filterable by production role or research provenance, and built from production reference records rather than all gallery images;
- selecting a reference opens a production-asset inspector with editable multi-role usage, free-form tags, direction, provenance, and inherited/direct shot usage;
- reference-library presentation is extracted from the gallery shell as an image-first contact sheet: full-resolution assets, consistent uncropped frames, compact captions, valid accessible selection semantics, and descriptive metadata reserved for the inspector. Bulk removal requires an explicit checkpoint before detaching project references and cleaning up only truly orphaned image records;
- image generation moved out of the long inspector form into an explicit generation plan. It can target the current panel, the current scene, or every shot missing a Start panel; shows the exact references and validation state for each target; displays a provider-based cost estimate; keeps successful results if another target fails; and retries only eligible failed targets;
- a shot can optionally expose Start, Middle, and End panels. Each enabled panel has its own direction, selected version, versions, comparison action, and generation target; one-panel shots remain the default;
- each generated or imported result is appended as a new take. Version comparison supports side-by-side and opacity overlay modes, with selection kept distinct from review approval;
- opening a storyboard version in the finishing editor carries exact project, shot, panel, and source-take context. Saving clones the gallery asset metadata, appends a provenance-linked `Lumen editor` take, selects it, and leaves the source take and source edit state unchanged;
- the shot inspector remains the home for direction, reference assignment, timing, optional panels, imported images, and versions;
- Export provides a project-specific printable/PDF board, bounded high-resolution contact-sheet PNG, shot-list CSV, and portable project manifest. Missing panels are explicit and invalid project links do not silently fall back to another board;
- shot and reference removal now require a deliberate inline confirmation;
- schema normalization, guarded take selection, reference-removal cascades, scoped reference routing, prior-panel continuity, and panel prompt compilation have focused Node tests;
- stale take IDs can no longer corrupt Start-panel selection, and an empty or malformed image-provider result is surfaced as a failed frame rather than a successful run;
- the former 2,466-line `StoryboardWorkspace.tsx` is now a roughly 200-line state-owning shell over focused board, toolbar, project, inspector, generation, dialog, and helper modules;
- the unified workspace toolbar now deliberately wraps its view switcher below the project and action rows at narrow breakpoints instead of depending on accidental overflow;
- visible **Approved** language is replaced with **Selected**, decorative green approval treatment is removed, and the fake continuity score/view is gone.

The refactor deliberately preserves the shared-workspace APIs, generated Police Riot assets, image editor, and generation API. The storyboard store is now schema v6. Hydration first migrates legacy takes and selected versions to the Start panel, then migrates single reference kinds into multi-role references with separate provenance and tags. Schema v6 adds scene and shot role overrides plus an immutable role snapshot on each take. The normalized project is written back to shared storage. `/storyboard-prototype` remains only as a design fixture; `/` is the real implementation.

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

Prototype-era validation:

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

These are follow-up product decisions, not merge blockers for this refactor.

### Project and storyboard hierarchy

- The current model intentionally remains one storyboard per project. The project selector therefore labels projects and does not pretend to be a storyboard selector.
- Decide whether real use requires multiple boards per project before adding another hierarchy level. That decision should drive a separate schema migration, not a cosmetic dropdown.
- References remains a project-level destination in the unified header; Board, Shot list, and Timing remain views over the active project storyboard.

### Inspector density

- The extracted production inspector is clearer but still risks becoming a vertical form.
- Consider compact summary rows with focused edit modes rather than making every field permanently editable.
- Versions have a focused compare action; linked pan/zoom is not implemented yet.
- Active within-shot panel selection now survives inspector close/reopen for the session. Formal reviewer approval remains intentionally absent.

### Board density

- Test small, medium, and large card densities on boards with 3, 9, 30, and 50 shots.
- The current selected-card outline may be visually heavier than necessary.
- Add view preferences for one caption field, metadata density, card size, and scene grouping without turning the toolbar into a settings shelf.

### Responsive behavior

- The code keeps the outline and inspector in mobile sheets, but the final 2026-08-27 browser controller could not apply its requested mobile viewport. Perform one manual narrow-screen visual pass before calling mobile polished.
- The narrow-screen header now prioritizes the project/actions row and moves Board, Shot list, and Timing to a centered second row; verify that behavior on a physical small viewport.
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

Implemented for the current panel, current scene, and all shots missing Start panels. Targets can be individually included or excluded; each row shows exact scoped references, provider-limit validation, run state, isolated errors, and a payable-output estimate. Successful frames persist when another target fails, and **Retry failed** reruns only currently valid failed targets. An arbitrary selection assembled directly from the Board or Shot list remains a later refinement. The compiled prompt remains derived output, not the core data model.

### Semantic reference routing and inheritance

Production assignment is interactive at scene and shot scope, inheritance is visible, and generation resolves only the active scene and shot assignments with duplicate removal. Each asset can now carry any combination of **Character**, **Wardrobe**, **Location / set**, **Prop**, **Look**, and **Composition** roles. Prompt compilation tells the provider exactly which attributes each role may contribute; Look and Composition explicitly cannot donate people or story content. **Research** is provenance rather than a role and can coexist with any role. Previous-shot imagery is included only when the shot explicitly opts into continuous action and both shots are in the same scene. Middle and End panels instead use the preceding selected panel inside the same shot. Provider-capability mapping and true panel-local reference assignment remain later refinements.

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

- `src/components/storyboard/StoryboardWorkspace.tsx` is now the small state-owning composition shell. Keep domain work out of it and extend the focused components beside it.
- `src/components/storyboard/StoryboardBoard.tsx`, `ShotInspector.tsx`, `ProjectPanel.tsx`, `StoryboardGenerationDialog.tsx`, `StoryboardWorkspaceToolbar.tsx`, and `StoryboardProjectDialogs.tsx` are the primary production UI seams created by the extraction.
- `src/components/gallery/ReferenceLibraryUI.tsx` owns reusable reference cards, empty state, categories, and the production-asset inspector; `Gallery.tsx` remains the workspace composition and image-editor bridge.
- `src/lib/storyboard/types.ts` is the canonical storyboard type surface; `domain.ts` contains pure normalization and guarded mutation behavior; `generation-plan.ts` contains pure reference/prior-panel/prompt planning; `store.ts` remains the Zustand mutation and persistence boundary.
- `src/lib/storyboard/prompt.ts` composes current storyboard prompts and should evolve into provider-neutral direction compilation plus provider adapters.
- `src/lib/storage/shared-workspace.ts` is the client boundary for shared local state.
- `src/lib/storage/local-workspace-server.ts` owns server-backed metadata and assets under `.lumen/` by default.
- `src/components/editor/` and the WebGL pipeline are working production surfaces. Storyboard edits now return through immutable versions with source provenance; preserve that contract.

The repository contains calibration scripts and the generated Police Riot images under `public/generated/great-police-riot/`. They are evidence and design-fixture assets for continuity/reference experiments, not the long-term product data model. The earlier generated-bundle import path (manifest, `/api/workspace/bundles`, and import script) was a stop-gap from the browser-storage era and has been removed; the shared `.lumen/` workspace already holds those assets as project references and takes.

## Recommended Next Sequence

The merge-blocking refactor is complete. Continue with product validation rather than another shell rewrite:

1. Run a small internal reference-consistency evaluation across the current FAL models and OpenAI `gpt-image-2`: generate the same character + wardrobe + location setup across wide, medium, close-up, and action shots, then record identity, role adherence, editability, latency, and cost before changing the Draft or Final defaults. This is an engineering evaluation, not a new user-facing model tier or screen. Note that `gpt-image-2` processes every image input at high fidelity automatically and rejects `input_fidelity`, and that its pricing is per token rather than per image.
2. Use one real project to generate a Start/Middle/End shot, compare alternatives, finish one version in the editor, scrub Timing, and export a handoff. Capture friction before adding hierarchy or metadata.
3. Add arbitrary multi-shot selection from Board or Shot list only if scene/missing-start generation proves insufficient. Reuse the existing target planner and retry state.
4. Add direct manipulation for duplicate/reorder, practical keyboard shortcuts, and denser 30–50-shot board modes before adding more form fields.
5. Decide whether one project needs multiple storyboards and whether Scene should stay fixed terminology. Treat either decision as a product choice and a separate schema migration.
6. Add an evidence-based continuity review that names a concrete issue and affected shots. Do not add a decorative score or generic green approval state.
7. Add audio tracks, waveform display, and rendered animatic export only after the current timing model proves useful in a real storyboard-to-video workflow.
8. Add cloud sync, collaboration, or the documentary-app integration only after the local project model and export contracts settle.

## Validation

- `npm run lint`
- `npm run test` — 19 passing tests covering migration/idempotence, reference-role/provenance migration and inference, assignment-role precedence and snapshots, library filtering by role, research provenance, and unclassified state, role-aware prompt compilation, guarded selection by panel, reference-removal cascades, scoped/deduplicated references, previous-shot opt-in, within-shot prior panels, and panel-specific prompt compilation
- `npm run build`
- `npx tsc --noEmit` — clean across the repository, including the domain tests
- production build includes `/`, `/editor`, `/storyboard-prototype`, and `/storyboard-print`
- earlier browser passes used a production server pointed at an isolated copy of `.lumen/`. The schema-v5 pass ran against the real workspace and migrated `storyboards.json` in place; a safety snapshot of that migrated v5 workspace was kept beside it as `.lumen/storyboards.backup-2026-08-27.json`
- Board, Shot list, Timing, animatic play/pause, project switching, project-scoped References, the shot inspector, optional Middle panel, active-panel continuity, the generation review, tier pricing, and deletion confirmation were exercised
- a selected storyboard version was opened in `/editor`, given a preset, and saved. The result was a second selected take with `sourceTakeId`/`sourceImageId`; the original gallery image retained its zeroed edit state. The new version and project selection survived a production-server restart
- the print route rendered the requested project, showed missing panels explicitly, respected the project aspect class, and returned **Storyboard not found** for an invalid explicit project id
- the final browser pass recorded no application console errors
- the finishing browser pass verified the outline settings action, project-scoped reference library, accessible selection state, explicit reference-removal checkpoint, and zero desktop page overflow without mutating the workspace
- the schema-v5 browser pass verified migrated project data, role/source filter counts, image-first captions, multi-role controls, tags, and editable provenance in the production reference inspector
- the bundle-removal pass rebuilt the production server on a clean `.next`, confirmed `/api/workspace/bundles` returns 404, and re-verified the References library (Used for / Source filter groups, the Unclassified empty state, the reference inspector with role toggles, tags, and editable provenance) and the project settings panel without its Imports control, with zero console errors or warnings
- automated narrow-screen visual QA remains outstanding because the browser controller reported success setting a mobile viewport while the page stayed at 1280×720; responsive behavior was reviewed statically and the temporary override was reset

## Schema v6 Notes

- `StoryboardShot.panelRoles` stores enabled Start/Middle/End panels. Start is mandatory.
- `StoryboardShot.panelDirections` stores optional direction specific to Middle or End while `prompt` remains shared shot direction.
- `StoryboardShot.selectedTakeIds` stores one selected take per panel role; legacy `selectedTakeId` remains mirrored for Start compatibility.
- `StoryboardTake.panelRole` identifies which panel owns a version.
- `StoryboardTake.sourceTakeId` and `sourceImageId` record editor-derived provenance without changing the source take.
- `StoryboardTake.referenceRoleSelections` records the exact semantic roles sent for each reference when that version was created, so later library edits do not rewrite generation lineage.
- Existing v3 takes and selection migrate to Start. Migration is idempotent and persists through the existing shared-workspace endpoint after hydration.
- Generation for a Middle or End panel adds the preceding selected same-shot panel as continuity context. Generation for Start uses only assigned project/scene/shot references unless the user explicitly enables the previous-panel option.
- `StoryReference.roles` stores zero or more semantic generation roles: Character, Wardrobe, Location / set, Prop, Look, and Composition. Zero roles means a general reference whose direction must explicitly name the usable details.
- `StoryboardScene.referenceRoleOverrides` can narrow a multi-purpose library reference for every shot in a scene. `StoryboardShot.referenceRoleOverrides` can narrow it further or explicitly restore all library roles for one shot. Missing overrides inherit the next broader assignment.
- `StoryReference.sourceType` independently records Generated, Imported, or Research provenance. Legacy `research` kinds migrate to research provenance with no assumed semantic role.
- `StoryReference.tags` stores deduplicated free-form project vocabulary. Role filters remain stable product semantics; tags are not promoted into hardcoded global categories.
- Legacy Character, Location, Object, and Style kinds migrate to Character, Location / set, Prop, and Look roles respectively. Generated legacy assets are recognized from their existing AI-generation rights note. IDs, assignments, images, source fields, and ordering remain unchanged.
- Prompt compilation is role-aware: production roles preserve their owned attributes while Look and Composition are prevented from donating identity or story content.
- Roles are inferred from file names for uploaded images and from direction text for generated references. Research imports and promoted storyboard frames start with no roles. The library's **Unclassified** filter lists non-research references with no roles so they can be classified deliberately.

## Guardrails for the Next Agent

- Do not rewrite the current store and UI simultaneously.
- Do not connect the prototype directly to production persistence as a shortcut.
- Do not restore **Approved** merely because every current shot has a selected image.
- Do not send every reference to every shot.
- Do not make scripts mandatory.
- Do not invent film-production terminology when an established term exists.
- Do not remove or flatten the image editor; storyboard-launched edits must create new versions.
- Do not mutate a gallery asset that already backs a storyboard take; editor round-trips must append a version.
- Do not expand into schedules, budgets, call sheets, or crew management.
- Preserve unrelated user changes in the dirty worktree.
