# Dungeon Core Crawler — start here

This repository is the authoritative Node.js + Socket.IO cooperative dungeon. `npm start` serves the client and 30 Hz simulation on the configured port. Open the printed HTTP address, create a four-character room, then join with a second browser or add mock explorers in the lobby. The client sends movement and action intents; the server owns collision, health, loot, encounters, portals, and XP.

Commit `38f245b` contains a five-floor integration candidate. It has focused unit evidence but **is not a verified release candidate**. Read [TASKS.md](TASKS.md), [TEST_RESULTS.md](TEST_RESULTS.md), [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md), and [NEXT_SESSION.md](NEXT_SESSION.md) before treating a feature as complete. Follow [AGENTS.md](AGENTS.md) and [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) before editing or committing.

Visual review: [Figma import board](docs/FIGMA_DESIGN_BOARD.svg) and [review questions](docs/FIGMA_DESIGN_REVIEW.md). Project tracking: [Notion import CSV](docs/NOTION_TASK_BOARD.csv) and [import guide](docs/NOTION_BOARD_HANDOFF.md). The cloud boards await account sign-in.
