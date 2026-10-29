# Illustrated quest draft — reviewed preview milestone

The owner requested a picture slideshow for story and quest-fighting scenes that cannot reach the preferred animated/3D standard within the competition timeframe. Public source publication and necessary pushes were explicitly authorized October 29. This milestone admits one new generated sheet ONLY as an optional, clearly labelled draft preview. It does not promote the eleven older concept PNGs or certify final art approval.

## Source and intended use

- Exact asset: `client/quest-storyboard-draft.png`, PNG 1672 x 941, 3,621,938 bytes, SHA256 `39b85c55b0893cb7a7405402f1197f49dae178b984981758dfa1ce1fed0c68cc`.
- Generated October29 using the built-in image generation tool in this chat. Execution/output reference: `exec-ed074980-4009-4b99-b6bf-e342b56d9d7e.png`; original retained under the chat's generated_images directory. The workspace copy is byte-identical.
- Input: the user's selected `client/title-cover-deepwood.png`, used solely as primary palette/world/silhouette reference. Canonical cover SHA256 remains `B7332DB53BB3D3D91E1D8540BDF3E2433A3DBD2C7738F2E2E7D1E2CA993A820B`; it is not overwritten or retitled.
- Prompt contract: one 2 x 2 sheet, four 16:9 illustrations, no text/UI/logos; same purple mage, stocky moss/fur protector, green-hooded scout and white-cloaked healer; Guild charter/map room, silent frontier outpost with roots/permafrost/violet gate, cooperative root-guardian/Barkwing fight, recovered survey folio beside an unresolved gate. Weathered tactile 3D fantasy, gray-violet dusk, wet slate, muted moss/dirty frost, restrained magic. Avoid franchise likenesses, cheerful saturation, repeated diamonds and broad gold wash. Full request and returned file are traceable in the originating image tool call.
- Source story: `docs/design/OPENING_CINEMATIC_AND_STORY.md`. The fourth scene remains a proposed aftermath, with explicit page copy distinguishing it from the implemented victory/results behavior.
- Runtime slot: optional `/story-preview.html`, reached from a separate lobby link; no automatic cutscene, room input or campaign-state mutation. Each panel is presented with CSS background positioning; the original generated file remains unchanged. HTML supplies captions and descriptive image labels.

## Optimization, visual and usage review

- One 3.45 MiB sheet is fetched only on explicit preview navigation and reused across all four slides. No storyboard request is added to initial game load; no extra libraries, animation, audio assets or timers. The raw PNG is not compressed further, and no low-bandwidth performance claim is made. Proposed future delivery optimization: separately reviewed WebP/AVIF derivative with matching crops and a measured phone budget.
- Reviewed against the selected cover: consistent dusk/stone/root materials and four distinct party silhouettes; no baked-in text. This is a storyboard illustration, not a claim that the scene's environment/character models exist in playable 3D.
- Browser acceptance: all four slides, disabled first/last navigation boundaries and ArrowLeft navigation were exercised on the local server. Captions and alt labels change with the visible panel. No autoplay; no new motion requiring an accessibility override. Physical-phone acceptance remains open.
- License/usage status: generated for this project with the built-in image tool from the project's selected reference. No external stock photo, font or franchise asset was supplied. Shared as an owner-requested concept draft; no blanket redistribution/commercial-clearance or public-domain/Creative-Commons license is asserted. Provider/account terms and underlying reference rights remain part of the full asset ledger's open rights review.
- Public visibility does not imply a general source/art reuse license. No LICENSE was invented or added. The canonical cover and eleven original untracked concepts are preserved.
