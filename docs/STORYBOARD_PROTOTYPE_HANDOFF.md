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

The first production transition is underway on this branch:

- the prototype's two header rows are collapsed into one responsive workspace header;
- production Storyboard, Timing, and References now share a single visible header instead of stacking a global and local header;
- the production storyboard toolbar is isolated as its own component boundary inside `StoryboardWorkspace.tsx` while retaining the existing store ownership;
- visible **Approved** language is replaced with **Selected**, and the decorative green approval treatment is removed;
- the production reference header now uses the same height, compact project selector, and responsive priorities as the storyboard header.

No persisted schema, workspace API, generation route, image asset, or editor behavior changed in this first slice. The next production step should replace the Project settings rail with an outline and introduce Board, Shot list, and Timing as explicit views over the existing shots.

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

The user likes the overall prototype and considers it close. Their first concrete change is to collapse the two stacked headers. The upper header feels sparse, and its controls should be redistributed rather than consuming a full row.

Recommended single-header exploration:

```text
L  Project / Storyboard        Board  Shot list  Timing        References  Generate  Share  User
```

When References is active, the middle can become the reference search and filters, while the right side becomes Import and Add reference. On narrow screens, preserve the project name, current view, Generate, and overflow; move secondary actions into menus.

This should be prototyped and reviewed before changing the production shell. Do not immediately port the current two-row header.

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

1. Refine the prototype into one unified header using the current Police Riot data.
2. Gather the user's remaining questions and comments before implementing production changes.
3. Test the prototype with a long board, at least one shot with multiple versions, and one shot with multiple panels.
4. Prototype an actual version-comparison surface and a multi-shot generation plan.
5. Confirm the IA and density decisions.
6. Begin Phase 1 from the product-design document: shell and language changes against the existing production store.
7. Extract the production workspace one component at a time while preserving shared storage, generated assets, and the editor.

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
