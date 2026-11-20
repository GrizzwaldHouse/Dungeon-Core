extends RefCounted
## Rootfall Aqueduct review level: deterministic encounter model.
##
## Why: the review scene, the headed autoplay capture and the headless tests
## must all see the same fight. Every rule lives here, advances by a fixed
## step and uses no randomness, so one input script always yields one outcome.
## The scene only renders this state and plays audio for the events it emits.
## This is a review candidate. Nothing in the production outpost reads it.

const STEP := 1.0 / 60.0

# Layout. The aqueduct descends from the north (negative z) into the basin.
const AQUEDUCT_TOP_Z := -34.0
const AQUEDUCT_FOOT_Z := -7.0
const AQUEDUCT_DROP := 7.0
const AQUEDUCT_HALF_WIDTH := 2.0
const BASIN_CENTER := Vector3(0.0, 0.0, 4.0)
const BASIN_RADIUS := 10.5
const ENCOUNTER_Z := -3.0

# Party tuning.
const WALK_SPEED := 4.2
const FOLLOW_SPEED := 4.6
const FOLLOW_OFFSET := Vector3(1.7, 0.0, -1.9)
const AXE_DAMAGE := 8
const AXE_COOLDOWN := 0.9
const AXE_REACH := 1.6
const ARROW_DAMAGE := 4
const ARROW_COOLDOWN := 0.8
const ARROW_SPEED := 22.0
const ARROW_RANGE := 15.0
const SPELL_DAMAGE := 14
const SPELL_COOLDOWN := 6.0
const SPELL_SPEED := 9.0
const PICKUP_RADIUS := 1.3

# Enemy tuning.
const GUARDIAN_POS := Vector3(0.0, 0.0, 7.0)
const GUARDIAN_RADIUS := 1.5
const GUARDIAN_HP := 140
const ROOT_FIRST_DELAY := 1.8
const ROOT_WINDUP := 1.4
const ROOT_COOLDOWN := 4.8
const ROOT_RADIUS := 2.2
const ROOT_DAMAGE := 12
const WING_HP := 24
const WING_HEIGHT := 3.8
const WING_ORBIT_RADIUS := 4.2
const WING_ORBIT_SPEED := 0.9
const WING_FIRST_DIVE := 2.2
const WING_DIVE_COOLDOWN := 4.5
const WING_SHRIEK := 0.7
const WING_DIVE_TIME := 0.5
const WING_RISE_TIME := 0.8
const WING_DAMAGE := 5

enum Phase { DESCENT, ENCOUNTER, SPOILS, VICTORY, DEFEAT }

var tick := 0
var phase := Phase.DESCENT
var members := {}
var leader := "warden"
var guardian := {}
var wing := {}
var projectiles: Array = []
var drops: Array = []
var inventory := {}
var events: Array = []      # pending events for the view, drained each frame
var history: Array = []     # every event this run, kept for tests and review logs
var autoplay := false
var _next_projectile := 0
var _auto_telegraphs_seen := 0
var _auto_dodging := false


func _init() -> void:
	reset()


func reset() -> void:
	tick = 0
	phase = Phase.DESCENT
	members = {
		"warden": {"id": "warden", "name": "Warden Brannoch", "weapon": "axe",
				"hp": 48, "max_hp": 48, "pos": Vector3(0.0, 0.0, -31.5), "cd": {}, "downed": false},
		"thornbow": {"id": "thornbow", "name": "Thornbow Sefa", "weapon": "bow",
				"hp": 32, "max_hp": 32, "pos": Vector3(1.7, 0.0, -33.4), "cd": {}, "downed": false},
	}
	for id in members:
		var m: Dictionary = members[id]
		m.pos.y = ground_height(m.pos)
	leader = "warden"
	guardian = {"id": "guardian", "name": "Bark Guardian", "hp": GUARDIAN_HP, "max_hp": GUARDIAN_HP,
			"pos": GUARDIAN_POS, "awake": false, "root_cd": ROOT_FIRST_DELAY,
			"windup": 0.0, "target": Vector3.ZERO, "dead": false}
	wing = {"id": "barkwing", "name": "Barkwing", "hp": WING_HP, "max_hp": WING_HP,
			"pos": Vector3.ZERO, "angle": 0.0, "mode": "orbit", "timer": 0.0,
			"dive_cd": WING_FIRST_DIVE, "dive_from": Vector3.ZERO, "dive_to": Vector3.ZERO,
			"dead": false, "fall": 0.0}
	wing.pos = _wing_orbit_point(0.0)
	projectiles = []
	drops = []
	inventory = {"Frayed aqueduct map": 1, "Waterskin": 1}
	events = []
	history = []
	_next_projectile = 0
	_auto_telegraphs_seen = 0
	_auto_dodging = false


# ---------------------------------------------------------------- geometry

## Walkable height: a constant slope down the aqueduct, flat in the basin.
static func ground_height(p: Vector3) -> float:
	var t := clampf((AQUEDUCT_FOOT_Z - p.z) / (AQUEDUCT_FOOT_Z - AQUEDUCT_TOP_Z), 0.0, 1.0)
	return AQUEDUCT_DROP * t


## Keeps a point on the aqueduct deck or inside the basin rim, whichever is nearer.
static func clamp_walkable(p: Vector3) -> Vector3:
	var deck := Vector3(clampf(p.x, -AQUEDUCT_HALF_WIDTH, AQUEDUCT_HALF_WIDTH), 0.0,
			clampf(p.z, AQUEDUCT_TOP_Z, -4.0))
	var flat := Vector3(p.x, 0.0, p.z) - BASIN_CENTER
	var basin := BASIN_CENTER + flat.limit_length(BASIN_RADIUS)
	var flat_p := Vector3(p.x, 0.0, p.z)
	var out := deck if flat_p.distance_to(deck) < flat_p.distance_to(basin) else basin
	# Keep party members out of the guardian's rooted trunk.
	var off := Vector3(out.x, 0.0, out.z) - GUARDIAN_POS
	if off.length() < GUARDIAN_RADIUS + 0.4:
		off = (off if off.length() > 0.01 else Vector3(0, 0, -1)).normalized() * (GUARDIAN_RADIUS + 0.4)
		out = GUARDIAN_POS + off
	out.y = ground_height(out)
	return out


func _wing_orbit_point(angle: float) -> Vector3:
	return Vector3(GUARDIAN_POS.x + cos(angle) * WING_ORBIT_RADIUS, WING_HEIGHT,
			GUARDIAN_POS.z - 1.0 + sin(angle) * WING_ORBIT_RADIUS)


func enemy_aim(id: String) -> Vector3:
	if id == "guardian":
		return guardian.pos + Vector3(0.0, 2.6, 0.0)
	return wing.pos


func enemy_alive(id: String) -> bool:
	return not (guardian.dead if id == "guardian" else wing.dead)


func wing_low() -> bool:
	return wing.mode == "dive" or (wing.mode == "rise" and wing.timer < 0.25)


# ---------------------------------------------------------------- events

func _emit(type: String, data: Dictionary = {}) -> void:
	var e := data.duplicate()
	e["type"] = type
	e["tick"] = tick
	events.append(e)
	history.append(e)


func drain_events() -> Array:
	var out := events
	events = []
	return out


func count(type: String) -> int:
	var n := 0
	for e in history:
		if e.type == type:
			n += 1
	return n


func first_tick(type: String) -> int:
	for e in history:
		if e.type == type:
			return e.tick
	return -1


# ---------------------------------------------------------------- actions

func _ready_to(m: Dictionary, action: String) -> bool:
	return not m.downed and float(m.cd.get(action, 0.0)) <= 0.0


## Warden axe. Reaches the rooted guardian, or the barkwing only while it dives low.
func swing_axe() -> bool:
	var m: Dictionary = members.warden
	if phase != Phase.ENCOUNTER or not _ready_to(m, "axe"):
		return false
	m.cd["axe"] = AXE_COOLDOWN
	var target := ""
	if not wing.dead and wing_low() and _flat_dist(m.pos, wing.pos) <= AXE_REACH + 0.6:
		target = "barkwing"
	elif not guardian.dead and _flat_dist(m.pos, guardian.pos) <= GUARDIAN_RADIUS + AXE_REACH:
		target = "guardian"
	_emit("axe_swing", {"member": "warden", "target": target})
	if target != "":
		_damage_enemy(target, AXE_DAMAGE, "axe")
	return true


## Thornbow arrow. Prefers the airborne barkwing, which the axe cannot reach in flight.
func loose_arrow() -> bool:
	var m: Dictionary = members.thornbow
	if phase != Phase.ENCOUNTER or not _ready_to(m, "arrow"):
		return false
	var target := "barkwing" if not wing.dead else ("guardian" if not guardian.dead else "")
	if target == "" or m.pos.distance_to(enemy_aim(target)) > ARROW_RANGE:
		return false
	m.cd["arrow"] = ARROW_COOLDOWN
	_spawn_projectile("arrow", m, target, ARROW_SPEED, ARROW_DAMAGE)
	return true


## Thornbow violet hush spell: one slow, small bolt into the guardian.
func cast_spell() -> bool:
	var m: Dictionary = members.thornbow
	if phase != Phase.ENCOUNTER or not _ready_to(m, "spell") or guardian.dead:
		return false
	m.cd["spell"] = SPELL_COOLDOWN
	_spawn_projectile("spell", m, "guardian", SPELL_SPEED, SPELL_DAMAGE)
	return true


func _spawn_projectile(kind: String, m: Dictionary, target: String, speed: float, dmg: int) -> void:
	_next_projectile += 1
	var p := {"id": _next_projectile, "kind": kind, "target": target, "speed": speed,
			"dmg": dmg, "pos": m.pos + Vector3(0.0, 1.4, 0.0)}
	projectiles.append(p)
	_emit(kind + "_loosed", {"member": m.id, "target": target, "projectile": p.id})


func _damage_enemy(id: String, amount: int, source: String) -> void:
	var e: Dictionary = guardian if id == "guardian" else wing
	if e.dead:
		return
	e.hp = maxi(0, e.hp - amount)
	_emit("enemy_hit", {"target": id, "amount": amount, "source": source, "hp": e.hp})
	if e.hp == 0:
		e.dead = true
		var at: Vector3 = e.pos
		if id == "guardian":
			at = GUARDIAN_POS + Vector3(3.0, 0.0, -3.6)
		var drop_pos := clamp_walkable(Vector3(at.x, 0.0, at.z))
		var item := "Heartwood sap" if id == "guardian" else "Barkwing quill"
		drops.append({"item": item, "pos": drop_pos, "taken": false, "from": id})
		_emit("enemy_defeated", {"target": id})
		_emit("reward_dropped", {"item": item, "from": id})


func _damage_member(id: String, amount: int, source: String) -> void:
	var m: Dictionary = members[id]
	if m.downed:
		return
	m.hp = maxi(0, m.hp - amount)
	_emit("member_hit", {"member": id, "amount": amount, "source": source, "hp": m.hp})
	if m.hp == 0:
		m.downed = true
		_emit("member_downed", {"member": id})


static func _flat_dist(a: Vector3, b: Vector3) -> float:
	return Vector2(a.x - b.x, a.z - b.z).length()


# ---------------------------------------------------------------- simulation

## Advances one fixed step. `move` is the leader's desired planar direction.
func step(move: Vector2 = Vector2.ZERO, actions: Array = []) -> void:
	if phase == Phase.VICTORY or phase == Phase.DEFEAT:
		return
	tick += 1
	if autoplay:
		var plan := autoplay_plan()
		move = plan.move
		actions = plan.actions
	for m in members.values():
		for k in m.cd:
			m.cd[k] = maxf(0.0, m.cd[k] - STEP)
	_move_party(move)
	if phase == Phase.DESCENT and members[leader].pos.z > ENCOUNTER_Z:
		phase = Phase.ENCOUNTER
		guardian.awake = true
		_emit("encounter_started")
	for a in actions:
		match a:
			"axe": swing_axe()
			"arrow": loose_arrow()
			"spell": cast_spell()
	_advance_projectiles()
	if phase == Phase.ENCOUNTER:
		_advance_guardian()
		_advance_wing()
	elif not wing.dead:
		wing.angle += WING_ORBIT_SPEED * 0.35 * STEP
		wing.pos = _wing_orbit_point(wing.angle)
	if wing.dead and wing.fall < 1.0:
		wing.fall = minf(1.0, wing.fall + STEP * 1.6)
		wing.pos.y = lerpf(WING_HEIGHT, 0.3, wing.fall)
	_collect_drops()
	_update_phase()


func _move_party(move: Vector2) -> void:
	var lead: Dictionary = members[leader]
	if not lead.downed and move.length() > 0.01:
		var dir := move.limit_length(1.0)
		lead.pos = clamp_walkable(lead.pos + Vector3(dir.x, 0.0, dir.y) * WALK_SPEED * STEP)
	for id in members:
		if id == leader:
			continue
		var m: Dictionary = members[id]
		if m.downed:
			continue
		var goal := clamp_walkable(lead.pos + FOLLOW_OFFSET)
		var to := Vector3(goal.x - m.pos.x, 0.0, goal.z - m.pos.z)
		if to.length() > 0.05:
			m.pos = clamp_walkable(m.pos + to.limit_length(FOLLOW_SPEED * STEP))


func _advance_projectiles() -> void:
	var keep: Array = []
	for p in projectiles:
		if not enemy_alive(p.target):
			_emit("projectile_lost", {"projectile": p.id, "kind": p.kind})
			continue
		var aim := enemy_aim(p.target)
		var to: Vector3 = aim - p.pos
		var reach: float = p.speed * STEP
		if to.length() <= reach + 0.3:
			_emit(p.kind + "_hit", {"projectile": p.id, "target": p.target, "amount": p.dmg})
			_damage_enemy(p.target, p.dmg, p.kind)
		else:
			p.pos += to.normalized() * reach
			keep.append(p)
	projectiles = keep


func _advance_guardian() -> void:
	if guardian.dead:
		return
	if guardian.windup > 0.0:
		guardian.windup = maxf(0.0, guardian.windup - STEP)
		if guardian.windup == 0.0:
			_emit("root_strike", {"at": guardian.target})
			for id in members:
				var m: Dictionary = members[id]
				if not m.downed and _flat_dist(m.pos, guardian.target) <= ROOT_RADIUS:
					_damage_member(id, ROOT_DAMAGE, "roots")
			guardian.root_cd = ROOT_COOLDOWN
		return
	guardian.root_cd -= STEP
	if guardian.root_cd <= 0.0:
		var lead: Dictionary = members[leader] if not members[leader].downed else members.thornbow
		guardian.target = Vector3(lead.pos.x, 0.0, lead.pos.z)
		guardian.windup = ROOT_WINDUP
		_emit("root_telegraph", {"at": guardian.target, "windup": ROOT_WINDUP})


func _advance_wing() -> void:
	if wing.dead:
		return
	match wing.mode:
		"orbit":
			wing.angle += WING_ORBIT_SPEED * STEP
			wing.pos = _wing_orbit_point(wing.angle)
			wing.dive_cd -= STEP
			if wing.dive_cd <= 0.0 and not members.thornbow.downed:
				wing.mode = "shriek"
				wing.timer = WING_SHRIEK
				_emit("barkwing_shriek", {"target": "thornbow"})
		"shriek":
			wing.timer -= STEP
			if wing.timer <= 0.0:
				wing.mode = "dive"
				wing.timer = 0.0
				wing.dive_from = wing.pos
				wing.dive_to = members.thornbow.pos + Vector3(0.0, 1.0, 0.0)
		"dive":
			wing.timer += STEP
			var t := minf(1.0, wing.timer / WING_DIVE_TIME)
			wing.pos = wing.dive_from.lerp(wing.dive_to, t * t)
			if t >= 1.0:
				if _flat_dist(members.thornbow.pos, wing.pos) <= 1.6:
					_damage_member("thornbow", WING_DAMAGE, "barkwing")
				else:
					_emit("barkwing_missed")
				wing.mode = "rise"
				wing.timer = 0.0
				wing.dive_from = wing.pos
		"rise":
			wing.timer += STEP
			var t := minf(1.0, wing.timer / WING_RISE_TIME)
			wing.pos = wing.dive_from.lerp(_wing_orbit_point(wing.angle), t)
			if t >= 1.0:
				wing.mode = "orbit"
				wing.dive_cd = WING_DIVE_COOLDOWN


func _collect_drops() -> void:
	var lead: Dictionary = members[leader]
	for d in drops:
		if not d.taken and _flat_dist(lead.pos, d.pos) <= PICKUP_RADIUS:
			d.taken = true
			inventory[d.item] = int(inventory.get(d.item, 0)) + 1
			_emit("item_picked", {"item": d.item, "count": inventory[d.item]})


func _update_phase() -> void:
	if members.warden.downed and members.thornbow.downed:
		phase = Phase.DEFEAT
		_emit("party_defeated")
		return
	if members[leader].downed:
		leader = "thornbow" if leader == "warden" else "warden"
		_emit("leader_changed", {"member": leader})
	if phase == Phase.ENCOUNTER and guardian.dead and wing.dead:
		phase = Phase.SPOILS
		_emit("basin_cleared")
	if phase == Phase.SPOILS and drops.all(func(d): return d.taken):
		phase = Phase.VICTORY
		_emit("victory")


# ---------------------------------------------------------------- autoplay

## Deterministic review director. It descends the aqueduct, lets the first
## root strike land so the party health change is visible, dodges later
## telegraphs, fights both enemies with all three attacks and collects spoils.
func autoplay_plan() -> Dictionary:
	var lead: Dictionary = members[leader]
	var actions: Array = []
	var goal := Vector3(0.0, 0.0, -2.0)
	match phase:
		Phase.DESCENT:
			goal = Vector3(0.0, 0.0, -1.0)
		Phase.ENCOUNTER:
			actions = ["arrow", "spell"]
			if not guardian.dead:
				goal = GUARDIAN_POS + Vector3(-0.6, 0.0, -(GUARDIAN_RADIUS + 1.1))
				actions.append("axe")
			else:
				goal = Vector3(wing.pos.x, 0.0, wing.pos.z)
				if wing_low():
					actions.append("axe")
			if guardian.windup > 0.0:
				var seen := count("root_telegraph")
				if seen != _auto_telegraphs_seen:
					_auto_telegraphs_seen = seen
					_auto_dodging = seen > 1
				if _auto_dodging:
					var away: Vector3 = Vector3(lead.pos.x, 0.0, lead.pos.z) - guardian.target
					away.x += 0.001 if away.x >= 0.0 else -0.001
					goal = guardian.target + Vector3(signf(away.x) * (ROOT_RADIUS + 1.6), 0.0, -0.4)
					actions.erase("axe")
			else:
				_auto_dodging = false
		Phase.SPOILS:
			# Hold briefly so the reward drop reads on camera before pickup.
			goal = Vector3(lead.pos.x, 0.0, lead.pos.z)
			if tick - first_tick("basin_cleared") > 50:
				for d in drops:
					if not d.taken:
						goal = d.pos
						break
	var to := Vector3(goal.x - lead.pos.x, 0.0, goal.z - lead.pos.z)
	var move := Vector2.ZERO
	if to.length() > 0.12:
		move = Vector2(to.x, to.z).normalized() * clampf(to.length() / 0.6, 0.25, 1.0)
	return {"move": move, "actions": actions}


## Compact fingerprint used to prove two runs are identical.
func snapshot() -> String:
	var parts: Array = [tick, phase, guardian.hp, wing.hp, members.warden.hp, members.thornbow.hp,
			"%.3f,%.3f" % [members.warden.pos.x, members.warden.pos.z], history.size()]
	var keys := inventory.keys()
	keys.sort()
	for k in keys:
		parts.append("%s=%d" % [k, inventory[k]])
	return "|".join(parts.map(func(x): return str(x)))
