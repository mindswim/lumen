import type { StoryboardProject, StoryboardShot, StoryReference } from './store';

export interface PromptReference {
  reference: StoryReference | null;
  label: string;
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
      const detail = input.reference.description.trim();
        const source = input.reference.kind === 'research' && input.reference.sourceTitle
          ? ` Source: ${input.reference.sourceTitle}.`
          : '';
        const role = input.reference.kind === 'research'
          ? 'HISTORICAL RESEARCH reference — use as evidence for period-specific architecture, clothing, equipment, street texture, and material detail; do not copy an incidental person as a recurring character'
          : `${input.reference.kind.toUpperCase()} reference`;
        return `Image ${index + 1}: ${role} — ${input.reference.name}${detail ? `. ${detail}` : ''}${source}`;
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
    '- Preserve the identity, age, facial structure, hair, wardrobe, props, and architecture established by the relevant reference images.',
    '- Each labeled reference owns only its named subject. Do not transfer a prop, garment, face, or feature from one reference to another character.',
    '- Research references provide historical evidence, not recurring identity. Do not reproduce an incidental face from archival imagery as a character.',
    '- Respect explicit quantities and ownership in the frame description. If one recurring object is requested, render exactly one and give it only to the named character.',
    '- The previous-shot image is continuity context only: retain the world and identities while creating the new composition described above.',
    '- Preserve the project visual language, but allow lighting and framing to change when the story beat requires it.',
    '- Render a single full-bleed image. Do not make a collage, contact sheet, split screen, character sheet, border, caption, or text overlay.',
    '- Treat the frame description as authoritative. References define recurring nouns; they do not override the requested action or camera position.',
  ].filter(Boolean).join('\n');
}
