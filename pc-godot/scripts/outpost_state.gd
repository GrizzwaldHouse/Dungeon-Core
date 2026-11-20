extends RefCounted
## Pure gameplay state for the open-world outpost: no nodes, so it is easy to test.
## World axes: +X east/right, -Z north/forward (away from the camera).
## Frontier layout: Deepwood (west, x < -12) | Guild (center) | Permafrost (east, x > 12).
## The northern gate leads to a separate dungeon hall; its exit returns to the same gate.

enum Phase { INTRO, SEEK_MARKERS, RETURN_TO_GUILD, EXPLORE }
enum Location { FRONTIER, DUNGEON }

const INTRO_SPEAKER := "QUEST MASTER"
const INTRO_LINES: Array[String] = [
	"Wayfarer, our signal from the Thornwake frontier ended three nights ago.",
	"The forest is freezing from its roots upward. The old outpost is silent.",
	"Two survey markers still stand: the Hollow Cairn in the Deepwood, west, and the Frost Obelisk in the Permafrost, east.",
	"Find both, in either order, and report back to me here at the Guild Hall.",
	"The northern gate leads to the dungeon. Look, but do not rush it. Bring every crawler home.",
]

const START_POS := Vector3(0.0, 0.0, 7.0)
const QUEST_MASTER_POS := Vector3(-4.0, 0.0, 4.0)
const GATE_POS := Vector3(0.0, 0.0, -10.0)
## Where the player reappears after leaving the dungeon: in front of the same gate.
const GATE_EXIT_POS := Vector3(0.0, 0.0, -6.5)
const DEEPWOOD_MARKER_POS := Vector3(-30.0, 0.0, -6.0)
const PERMAFROST_MARKER_POS := Vector3(30.0, 0.0, -9.0)
const ELDER_TREE_POS := Vector3(-38.0, 0.0, 15.0)
const GLACIER_SPIRE_POS := Vector3(38.0, 0.0, 14.0)

const DUNGEON_ENTRY_POS := Vector3(0.0, 0.0, -71.0)
const DUNGEON_EXIT_POS := Vector3(0.0, 0.0, -65.5)
const DUNGEON_CORE_POS := Vector3(0.0, 0.0, -86.0)

const MOVE_SPEED := 5.5
const PLAYER_RADIUS := 0.5
## Per-substep travel cap; below the smallest obstacle radius so nothing is skipped.
const MAX_SUBSTEP := 0.2
const MAX_SUBSTEPS := 600
const REGION_EDGE := 12.0

## Frontier bounds (x +-, z +-) and dungeon bounds.
const WORLD_HALF_X := 48.0
const WORLD_HALF_Z := 30.0
const DUNGEON_HALF_X := 8.0
const DUNGEON_MIN_Z := -90.0
const DUNGEON_MAX_Z := -64.0

const MARKER_REACH := 2.8
const GATE_REACH := 3.6
const QUEST_MASTER_REACH := 2.8
const EXIT_REACH := 2.6
const CORE_REACH := 3.0
const DISCOVER_RADIUS := 7.0
const MESSAGE_SECONDS := 4.0

## Solid circles on the ground plane: Vector3(x, z, radius).
const FRONTIER_OBSTACLES: Array[Vector3] = [
	Vector3(-4.0, 4.0, 0.7),     # Quest Master
	Vector3(-2.6, -10.0, 1.0),   # gate pillar west
	Vector3(2.6, -10.0, 1.0),    # gate pillar east
	Vector3(-8.0, -2.0, 1.1),    # guild basalt cluster
	Vector3(-10.5, 3.0, 0.9),
	Vector3(5.0, 1.0, 0.9),
	Vector3(10.0, -8.0, 1.2),
	Vector3(-6.0, -8.0, 1.0),
	Vector3(7.0, -7.0, 0.9),
	Vector3(-6.2, 2.0, 0.5),     # Guild Hall banner pole
	Vector3(-13.0, -13.0, 2.1),  # ruined watchtower
	Vector3(DEEPWOOD_MARKER_POS.x, DEEPWOOD_MARKER_POS.z, 1.1),      # Hollow Cairn
	Vector3(PERMAFROST_MARKER_POS.x, PERMAFROST_MARKER_POS.z, 0.9),  # Frost Obelisk
	Vector3(ELDER_TREE_POS.x, ELDER_TREE_POS.z, 2.2),                # Elder Tree trunk
	Vector3(GLACIER_SPIRE_POS.x, GLACIER_SPIRE_POS.z, 2.4),          # Glacier Spire base
]

## Decorative-but-solid trees (Deepwood) and ice spikes (Permafrost): Vector3(x, z, radius).
const DEEPWOOD_TREES: Array[Vector3] = [
	Vector3(-17.0, -4.0, 0.8), Vector3(-20.0, 7.0, 0.9), Vector3(-23.0, -14.0, 0.8),
	Vector3(-26.0, 3.0, 0.9), Vector3(-33.0, -12.0, 0.8), Vector3(-34.0, 6.0, 0.9),
	Vector3(-28.0, 18.0, 0.8), Vector3(-42.0, -4.0, 0.9), Vector3(-44.0, 20.0, 0.8),
	Vector3(-40.0, -20.0, 0.9), Vector3(-19.0, 20.0, 0.8), Vector3(-30.0, -22.0, 0.8),
]
const ICE_SPIKES: Array[Vector3] = [
	Vector3(17.0, -3.0, 0.8), Vector3(20.0, 9.0, 0.9), Vector3(24.0, -16.0, 0.8),
	Vector3(26.0, 2.0, 0.8), Vector3(33.0, -14.0, 0.9), Vector3(34.0, 7.0, 0.8),
	Vector3(28.0, 20.0, 0.9), Vector3(42.0, -5.0, 0.8), Vector3(44.0, 22.0, 0.9),
	Vector3(40.0, -22.0, 0.8), Vector3(19.0, 21.0, 0.8), Vector3(31.0, -24.0, 0.8),
]

const DUNGEON_OBSTACLES: Array[Vector3] = [
	Vector3(-4.0, -74.0, 0.8), Vector3(4.0, -74.0, 0.8),
	Vector3(-4.0, -79.0, 0.8), Vector3(4.0, -79.0, 0.8),
	Vector3(-4.0, -84.0, 0.8), Vector3(4.0, -84.0, 0.8),
	Vector3(DUNGEON_CORE_POS.x, DUNGEON_CORE_POS.z - 1.5, 1.0),  # core plinth
]

## Landmarks the HUD points at. `kind`: hub, gate, marker, optional, exit, core.
const LANDMARKS: Array[Dictionary] = [
	{"id": "guild_hall", "name": "Guild Hall (Quest Master)", "pos": QUEST_MASTER_POS, "kind": "hub", "loc": 0},
	{"id": "gate", "name": "Northern Gate (dungeon)", "pos": GATE_POS, "kind": "gate", "loc": 0},
	{"id": "deepwood", "name": "Hollow Cairn (Deepwood marker)", "pos": DEEPWOOD_MARKER_POS, "kind": "marker", "loc": 0},
	{"id": "permafrost", "name": "Frost Obelisk (Permafrost marker)", "pos": PERMAFROST_MARKER_POS, "kind": "marker", "loc": 0},
	{"id": "elder_tree", "name": "Elder Tree (optional)", "pos": ELDER_TREE_POS, "kind": "optional", "loc": 0},
	{"id": "glacier_spire", "name": "Glacier Spire (optional)", "pos": GLACIER_SPIRE_POS, "kind": "optional", "loc": 0},
	{"id": "exit", "name": "Exit Portal (to the frontier gate)", "pos": DUNGEON_EXIT_POS, "kind": "exit", "loc": 1},
	{"id": "core", "name": "Dormant Core", "pos": DUNGEON_CORE_POS, "kind": "core", "loc": 1},
]

const MARKER_IDS: Array[String] = ["deepwood", "permafrost"]
const REGION_NAMES := {"deepwood": "Deepwood (west)", "guild": "Guild Outpost (center)", "permafrost": "Permafrost (east)"}
const COMPASS: Array[String] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

var phase: int = Phase.INTRO
var location: int = Location.FRONTIER
var line_index: int = 0
var collected: Dictionary = {}   # marker id -> true once taken
var delivered: bool = false
var visited: Dictionary = {}     # landmark id -> true once the player came near
var region: String = "guild"
var player_pos: Vector3 = START_POS
var facing: Vector3 = Vector3(0.0, 0.0, -1.0)
var message: String = ""
var message_time: float = 0.0


func reset() -> void:
	phase = Phase.INTRO
	location = Location.FRONTIER
	line_index = 0
	collected = {}
	delivered = false
	visited = {}
	region = "guild"
	player_pos = START_POS
	facing = Vector3(0.0, 0.0, -1.0)
	message = ""
	message_time = 0.0


## Movement is only locked during the intro dialogue; it is never locked afterwards.
func can_move() -> bool:
	return phase != Phase.INTRO


func current_line() -> String:
	if phase != Phase.INTRO:
		return ""
	return INTRO_LINES[line_index]


func set_message(text: String, seconds: float = MESSAGE_SECONDS) -> void:
	message = text
	message_time = seconds


## Expire the brief toast message. Call once per frame.
func tick(delta: float) -> void:
	if message != "":
		message_time -= delta
		if message_time <= 0.0:
			message = ""
			message_time = 0.0


func markers_found() -> int:
	return collected.size()


func survey_complete() -> bool:
	return collected.size() >= MARKER_IDS.size()


## Advance the Quest Master dialogue. Returns true when it ends the intro.
func advance_dialogue() -> bool:
	if phase != Phase.INTRO:
		return false
	line_index += 1
	if line_index >= INTRO_LINES.size():
		line_index = INTRO_LINES.size() - 1
		phase = Phase.SEEK_MARKERS
		message = ""
		return true
	return false


func skip_intro() -> void:
	if phase == Phase.INTRO:
		line_index = INTRO_LINES.size() - 1
		phase = Phase.SEEK_MARKERS
		message = ""


# ---------------------------------------------------------------- movement

## Move the adventurer. `input` is Input.get_vector style: x right, y back (+Z).
## The step is split into substeps no longer than MAX_SUBSTEP, so large frame
## deltas cannot tunnel through obstacles.
func move(input: Vector2, delta: float) -> void:
	if not can_move():
		return
	if input.length() < 0.001:
		return
	if input.length() > 1.0:
		input = input.normalized()
	var total := input * MOVE_SPEED * delta
	var count := clampi(ceili(total.length() / MAX_SUBSTEP), 1, MAX_SUBSTEPS)
	var step := Vector3(total.x, 0.0, total.y) / float(count)
	for i in count:
		player_pos = _resolve(player_pos + step)
	facing = Vector3(input.x, 0.0, input.y).normalized()
	_after_move()


func obstacles() -> Array[Vector3]:
	if location == Location.DUNGEON:
		return DUNGEON_OBSTACLES
	var all: Array[Vector3] = []
	all.append_array(FRONTIER_OBSTACLES)
	all.append_array(DEEPWOOD_TREES)
	all.append_array(ICE_SPIKES)
	return all


func _resolve(pos: Vector3) -> Vector3:
	if location == Location.DUNGEON:
		pos.x = clampf(pos.x, -DUNGEON_HALF_X, DUNGEON_HALF_X)
		pos.z = clampf(pos.z, DUNGEON_MIN_Z, DUNGEON_MAX_Z)
	else:
		pos.x = clampf(pos.x, -WORLD_HALF_X, WORLD_HALF_X)
		pos.z = clampf(pos.z, -WORLD_HALF_Z, WORLD_HALF_Z)
	var solids := obstacles()
	for pass_index in 2:
		for o in solids:
			var offset := Vector2(pos.x - o.x, pos.z - o.y)
			var min_dist := o.z + PLAYER_RADIUS
			var dist := offset.length()
			if dist < min_dist:
				if dist < 0.0001:
					offset = Vector2(0.0, 1.0)
					dist = 1.0
				var pushed := offset / dist * min_dist
				pos.x = o.x + pushed.x
				pos.z = o.y + pushed.y
	return pos


static func region_at(pos: Vector3) -> String:
	if pos.x < -REGION_EDGE:
		return "deepwood"
	if pos.x > REGION_EDGE:
		return "permafrost"
	return "guild"


func region_label() -> String:
	if location == Location.DUNGEON:
		return "Dungeon (north of the gate)"
	return REGION_NAMES[region]


func _after_move() -> void:
	if location == Location.DUNGEON:
		return
	var now := region_at(player_pos)
	if now != region:
		region = now
		set_message("Entering " + REGION_NAMES[now])
	for lm in LANDMARKS:
		if lm["loc"] != 0 or visited.has(lm["id"]):
			continue
		if _flat_distance(player_pos, lm["pos"]) <= DISCOVER_RADIUS:
			visited[lm["id"]] = true
			if lm["kind"] == "marker" or lm["kind"] == "optional":
				set_message("Discovered: " + lm["name"])


func _flat_distance(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()


## 8-point compass word from `from` to `to`; north is -Z.
static func compass_dir(from: Vector3, to: Vector3) -> String:
	var angle := atan2(to.x - from.x, -(to.z - from.z))
	var idx := int(roundf(angle / (PI / 4.0)))
	return COMPASS[posmod(idx, 8)]


## Landmarks for the current location with direction/distance from the player.
## Entries: {id, name, kind, dir, dist, done}.
func landmark_entries() -> Array[Dictionary]:
	var out: Array[Dictionary] = []
	var loc := 1 if location == Location.DUNGEON else 0
	for lm in LANDMARKS:
		if lm["loc"] != loc:
			continue
		var done := false
		match lm["kind"]:
			"marker":
				done = collected.has(lm["id"])
			"optional":
				done = visited.has(lm["id"])
		out.append({
			"id": lm["id"], "name": lm["name"], "kind": lm["kind"],
			"dir": compass_dir(player_pos, lm["pos"]),
			"dist": _flat_distance(player_pos, lm["pos"]),
			"done": done,
		})
	return out


# ---------------------------------------------------------------- interaction

## Closest interactable in reach: "deepwood_marker", "permafrost_marker", "gate",
## "quest_master", "exit", "core" or "".
func nearby_target() -> String:
	if not can_move():
		return ""
	var candidates: Array = []
	if location == Location.DUNGEON:
		candidates = [["exit", DUNGEON_EXIT_POS, EXIT_REACH], ["core", DUNGEON_CORE_POS, CORE_REACH]]
	else:
		candidates = [
			["quest_master", QUEST_MASTER_POS, QUEST_MASTER_REACH],
			["gate", GATE_POS, GATE_REACH],
		]
		if not collected.has("deepwood"):
			candidates.append(["deepwood_marker", DEEPWOOD_MARKER_POS, MARKER_REACH])
		if not collected.has("permafrost"):
			candidates.append(["permafrost_marker", PERMAFROST_MARKER_POS, MARKER_REACH])
	var best := ""
	var best_dist := INF
	for c in candidates:
		var d := _flat_distance(player_pos, c[1])
		if d <= c[2] and d < best_dist:
			best = c[0]
			best_dist = d
	return best


## Perform the interaction. Returns an event name for the view/tests:
## "advance", "intro_done", "marker", "deliver", "talk", "enter_dungeon",
## "exit_dungeon", "core" or "none".
func interact() -> String:
	if phase == Phase.INTRO:
		return "intro_done" if advance_dialogue() else "advance"
	var target := nearby_target()
	match target:
		"deepwood_marker", "permafrost_marker":
			var id := target.trim_suffix("_marker")
			collected[id] = true
			if survey_complete():
				phase = Phase.RETURN_TO_GUILD
				set_message("%s recovered. Both markers found: report to the Quest Master (Guild Hall)." % _marker_title(id))
			else:
				set_message("%s recovered. Now find the %s marker." % [
					_marker_title(id), "Permafrost (east)" if id == "deepwood" else "Deepwood (west)"])
			return "marker"
		"quest_master":
			if survey_complete() and not delivered:
				delivered = true
				phase = Phase.EXPLORE
				set_message("Survey delivered. The frontier is yours: explore freely.", 6.0)
				return "deliver"
			if delivered:
				set_message("Quest Master: Roam as you like. The gate north leads to the dungeon.")
			elif collected.size() == 1:
				set_message("Quest Master: One marker found. The other frontier still waits.")
			else:
				set_message("Quest Master: Find the Hollow Cairn (west) and Frost Obelisk (east), any order.")
			return "talk"
		"gate":
			location = Location.DUNGEON
			player_pos = DUNGEON_ENTRY_POS
			facing = Vector3(0.0, 0.0, -1.0)
			set_message("You step through the gate into the dungeon. The exit portal is behind you.")
			return "enter_dungeon"
		"exit":
			location = Location.FRONTIER
			player_pos = GATE_EXIT_POS
			facing = Vector3(0.0, 0.0, 1.0)
			region = "guild"
			set_message("Back at the northern gate. The frontier lies open.")
			return "exit_dungeon"
		"core":
			set_message("The dormant core hums faintly. It is not ready. Return when the survey is done.")
			return "core"
	return "none"


func _marker_title(id: String) -> String:
	return "Deepwood survey record" if id == "deepwood" else "Permafrost survey record"


func objective_text(compact: bool = false) -> String:
	if phase == Phase.INTRO:
		return "Listen to the Quest Master"
	var lines: Array[String] = []
	match phase:
		Phase.SEEK_MARKERS:
			if not compact:
				lines.append("Objective: survey both frontiers (either order)")
			lines.append("  %s Deepwood: Hollow Cairn, west" % ("[x]" if collected.has("deepwood") else "[ ]"))
			lines.append("  %s Permafrost: Frost Obelisk, east" % ("[x]" if collected.has("permafrost") else "[ ]"))
		Phase.RETURN_TO_GUILD:
			lines.append("Report to Guild Hall (center)" if compact else "Objective: report to the Quest Master at the Guild Hall (center)")
		_:
			lines.append("Survey delivered. Explore freely.")
			if not compact:
				lines.append("  Optional: Elder Tree (Deepwood), Glacier Spire (Permafrost), Northern Gate dungeon")
	if location == Location.DUNGEON:
		lines.append("Exit south: press E at the portal" if compact else "In the dungeon: walk to the Exit Portal (south) and press E to return to the gate")
	return "\n".join(lines)
