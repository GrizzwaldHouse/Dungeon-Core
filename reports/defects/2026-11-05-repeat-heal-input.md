# Repeated heal input while awaiting acknowledgement

Status: fixed locally. Severity: P2. Scope: one player's controls in a multiplayer room.

Candidate before fix: `9741aeb0d4b2c4569bb13b495c659d8eb266bb1e` on `qa/final-sprint-integration`.

## Reproduction and behavior

With a living injured explorer holding two healing charges, delay the server's heal acknowledgement and press Heal repeatedly. Previously the client kept the control enabled and each input could issue a distinct item-use request, allowing both charges to be spent. Expected: one outstanding heal intent until its reply or failure.

`client/app.js` now blocks repeated healing requests across mouse, touch, and keyboard input while awaiting acknowledgement. Snapshot updates preserve the pending state. Success and failure both release the guard; the latest server state determines whether healing is available. Health and inventory remain snapshot-owned. The control is also disabled outside a running expedition or with no charges.

## Fresh verification, November 5, 2026

- The new regression failed on the original code at the pending-control assertion.
- After the fix and correction of the test's keyboard event target, `node --test tests/client-ui.test.js tests/touch-controls.test.js tests/lan-action-ids.test.js` passed 21/21.
- The test delays a reply, supplies another snapshot, attempts mouse/touch/keyboard repeats, and observes only one request. It verifies success and timeout recovery and that acknowledgements do not mutate local health or inventory.
- `npm run check` passed for 52 JavaScript files.

Evidence uses the local VM UI harness, not physical-device or public-network play. A deliberate retry after a timeout can still issue a fresh action if the first acknowledgement was lost; this fix does not add transport-level retry deduplication. The public release gates remain open.
