import type { ReferenceRole, StoryboardProject, StoryboardShot, StoryReference } from './store';

export interface PromptReference {
  reference: StoryReference | null;
  label: string;
  /** Effective roles for this scene/shot assignment. Defaults to the library roles. */
  roles?: ReferenceRole[];
}

const ROLE_DIRECTIONS: Record<ReferenceRole, string> = {
  character: 'CHARACTER IDENTITY — preserve face, age, hair, build, and distinguishing features',
  wardrobe: 'WARDROBE — preserve garment design, materials, colors, layers, and fit',
  location: 'LOCATION / SET — preserve architecture, spatial layout, materials, and recurring set details',
  prop: 'PROP — preserve design, scale, materials, condition, and established ownership',
  look: 'LOOK — borrow lighting, color, texture, and rendering treatment only; do not copy its people or objects',
  composition: 'COMPOSITION — borrow framing, blocking, perspective, and camera geometry only; do not copy identities or story content',
};

function describeReference(reference: StoryReference, index: number, assignedRoles?: ReferenceRole[]): string {
  const roles = assignedRoles ?? reference.roles;
  const role = roles.length > 0
    ? roles.map((value) => ROLE_DIRECTIONS[value]).join('; ')
    : 'GENERAL VISUAL REFERENCE — use only the details explicitly named in its direction';
  const detail = reference.description.trim();
  const tags = reference.tags.length > 0 ? ` Tags: ${reference.tags.join(', ')}.` : '';
  const research = reference.sourceType === 'research'
    ? ` RESEARCH PROVENANCE${reference.sourceTitle ? ` (${reference.sourceTitle})` : ''} — treat this image as visual evidence, not as recurring identity unless Character is explicitly selected.`
    : '';

  return `Image ${index + 1}: ${role} — ${reference.name}${detail ? `. ${detail}` : ''}.${tags}${research}`;
}

export function composeStoryboardPrompt(
  project: StoryboardProject,
  shot: StoryboardShot,
  shotIndex: number,
  referenceInputs: PromptReference[],
): string {
  const references = referenceInputs.length > 0
    ? referenceInputs.map((input, index) => {
      if (!input.reference) return `Image ${index + 1}: ${input.label}`;
      return describeReference(input.reference, index, input.roles);
      }).join('\n')
    : 'No image references are attached. Establish the design cleanly so this frame can become a future continuity reference.';
  const scene = project.scenes.find((candidate) => candidate.id === shot.sceneId);
  const camera = [
    shot.shotSize !== 'unspecified' ? shot.shotSize : '',
    shot.cameraAngle !== 'unspecified' ? shot.cameraAngle : '',
    shot.cameraMovement,
  ].filter(Boolean).join(', ');

  return [
    `Create one complete cinematic storyboard image for shot ${shotIndex + 1} of ${project.shots.length}.`,
    '',
    `STORY: ${project.title}`,
    project.logline ? `PREMISE: ${project.logline}` : '',
    project.visualDirection ? `VISUAL LANGUAGE: ${project.visualDirection}` : '',
    scene ? `SCENE: ${scene.title}${scene.location ? ` — ${scene.location}` : ''}${scene.timeOfDay ? `, ${scene.timeOfDay}` : ''}` : '',
    scene?.summary ? `SCENE ACTION: ${scene.summary}` : '',
    shot.beat ? `ACTION / BEAT: ${shot.beat}` : '',
    camera ? `CAMERA: ${camera}` : '',
    `SHOT DESCRIPTION: ${shot.prompt.trim()}`,
    shot.dialogue ? `DIALOGUE / VOICE-OVER: ${shot.dialogue}` : '',
    `INTENDED DURATION: ${shot.durationSeconds} seconds`,
    shot.continuityNotes ? `CONTINUITY REQUIREMENTS: ${shot.continuityNotes}` : '',
    '',
    'REFERENCE IMAGES, IN ORDER:',
    references,
    '',
    'Continuity rules:',
    '- Use each reference only for its labeled roles. A reference may own several roles, and unlabeled attributes must not leak into the frame.',
    '- Character, Wardrobe, Location / set, and Prop references establish recurring production details. Keep those details stable whenever that subject appears.',
    '- Look and Composition references guide treatment and framing only. They do not donate faces, costumes, locations, props, or story events.',
    '- Research provenance marks visual evidence, not a semantic role. Do not reproduce an incidental archival face as a character unless Character is explicitly selected.',
    '- Do not transfer a prop, garment, face, or feature from one reference to another character.',
    '- Respect explicit quantities and ownership in the frame description. If one recurring object is requested, render exactly one and give it only to the named character.',
    '- The previous-shot image is continuity context only: retain the world and identities while creating the new composition described above.',
    '- Preserve the project visual language, but allow lighting and framing to change when the story beat requires it.',
    '- Render a single full-bleed image. Do not make a collage, contact sheet, split screen, character sheet, border, caption, or text overlay.',
    '- Treat the frame description as authoritative. References define recurring nouns; they do not override the requested action or camera position.',
  ].filter(Boolean).join('\n');
}
