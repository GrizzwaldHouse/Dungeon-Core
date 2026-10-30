// story-chapters.js
// Developer: Marcus Daley
// Date: 2026-10-18
// Why: Tie illustrated Guild clues to server-confirmed portal and floor transitions.

const ART = '/quest-storyboard-draft.png';

const CHAPTERS = Object.freeze({
  'shift-gate': { title: 'The route beneath the map',
    copy: 'The first gate opens where the Guild chart shows solid stone. Someone marked this path, then hid it.',
    position: '0% 0%', alt: 'The Wayfarers receive a sealed charter from the Guild Quest Master.' },
  'REST:2': { title: 'The outpost',
    copy: 'At the edge of the frontier, frost spreads through abandoned watch posts. The Guild signal is still pulsing below them.',
    position: '100% 0%', alt: 'The expedition approaches a deserted outpost amid frost, roots, and violet light.' },
  FLOOR_TWO: { title: 'A route erased',
    copy: 'A second gate follows an older survey line. The party finds the route was crossed out long before the outpost went silent.',
    position: '100% 0%', alt: 'The party crosses the frosted outpost beneath a mysterious signal.' },
  'REST:3': { title: 'The roots remember',
    copy: 'The same mark appears under the vault and in the living roots. The menace is following a path someone built.',
    position: '0% 100%', alt: 'The Wayfarers face roots and a looming guardian in the Deepwood.' },
  FLOOR_THREE: { title: 'The hidden record',
    copy: 'A sealed survey fragment points deeper. Its dates disagree with the Guild charter by years.',
    position: '0% 100%', alt: 'Wayfarers search the Deepwood for a way past the root guardian.' },
  'REST:4': { title: 'Before the wings',
    copy: 'Wingbeats echo ahead. The record names a guardian, but the line describing who placed it has been removed.',
    position: '0% 100%', alt: 'The party readies itself beneath Barkwings and the root guardian.' },
  DEEPWOOD: { title: 'The Deepwood guardian',
    copy: 'The guardian holds the route shut. Every Wayfarer must survive long enough to learn what it protects.',
    position: '0% 100%', alt: 'Four Wayfarers cooperate against the root guardian and Barkwings.' },
  FLOOR_FOUR: { title: 'The Guild folio',
    copy: 'A recovered folio shows the signal was once a warning. The final pages are still missing.',
    position: '100% 100%', alt: 'The party reads survey records near a violet gate.' },
  'REST:5': { title: 'The final route',
    copy: 'The last gate glows with the same light as the charter seal. The party carries the folio onward, seeking the truth.',
    position: '100% 100%', alt: 'The Wayfarers examine the folio beside the final violet gate.' },
  FLOOR_FIVE: { title: 'What the Guild withheld',
    copy: 'The missing account lies beyond this chamber. Defeat the core, then decide which answers to bring home.',
    position: '100% 100%', alt: 'Four travelers stand at the gate with the recovered records.' }
});

// Why: A local picture may only appear after the authoritative server confirms travel.
// Input: A validated network event type and its room-scoped public detail.
// Output: Story content or null; no game state is modified.
export function chapterForTransition(type, detail) {
  if (!detail || !Number.isSafeInteger(detail.revision) || detail.revision < 0) return null;
  let key = null;
  if (type === 'portal-resolved' && detail.portalId === 'shift-gate') key = 'shift-gate';
  if (type === 'floor-transition' && Number.isSafeInteger(detail.floorIndex)) {
    key = detail.toStage === 'REST' ? `REST:${detail.floorIndex}` : detail.toStage;
  }
  const chapter = CHAPTERS[key];
  return chapter ? { ...chapter, id: `${detail.cycle ?? 1}:${key}`,
    image: ART, revision: detail.revision } : null;
}

// Why: A reconnect or duplicate transport event must not interrupt the same player twice.
// Input: Session storage, room/player identity, and one known chapter ID.
// Output: True only on first display; storage denial allows the live event to show once.
export function claimChapter(storage, roomCode, playerId, chapterId) {
  if (!roomCode || !playerId || !chapterId) return false;
  const key = `dungeon-core-story:${roomCode}:${playerId}:${chapterId}`;
  try {
    if (storage.getItem(key) === '1') return false;
    storage.setItem(key, '1');
  } catch {
    // Private browsing may deny storage; transport events are not replayed on reconnect.
  }
  return true;
}
