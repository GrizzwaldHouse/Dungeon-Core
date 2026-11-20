extends Node3D
## Rootfall Aqueduct review level: scene, HUD, input and capture hooks.
##
## Why: reviewers need one standalone, playable room that shows a descending
## wet basalt aqueduct into a root basin, two active Wayfarers, a rooted bark
## guardian with an airborne barkwing, and every combat beat made readable.
## All rules live in rootfall_state.gd; this node renders that state, turns
## its events into effects and procedural audio, and never edits outcomes.
## It is a review candidate and is not wired into the production outpost.
##
## User args after `--`: --autoplay, --capture, --quit-on-finish.

const RootfallState := preload("res://review_levels/a_rootfall/rootfall_state.gd")
const RootfallAudio := preload("res://review_levels/a_rootfall/rootfall_audio.gd")
const CAPTURE_DIR := "res://build/rootfall-review"

# Palette follows the Deepwood title cover contract: gray-violet dusk, charcoal
# bark, wet slate, muted moss, small violet, ember and cold cyan accents.
const C_BASALT := Color(0.13, 0.135, 0.16)
const C_BASALT_WET := Color(0.08, 0.09, 0.11)
const C_BARK := Color(0.17, 0.13, 0.12)
const C_MOSS := Color(0.12, 0.18, 0.12)
const C_WATER := Color(0.28, 0.40, 0.46, 0.62)
const C_VIOLET := Color(0.62, 0.42, 0.95)
const C_EMBER := Color(0.92, 0.34, 0.2)
const C_STEEL := Color(0.66, 0.69, 0.74)

var state := RootfallState.new()
var audio: Node
var autoplay_arg := false
var capture_arg := false
var quit_on_finish := false
var captured: Array = []        # capture names already saved
var _pending_captures: Array = []
var _finish_tick := -1
var _time := 0.0

var camera: Camera3D
var member_nodes := {}
var axe_pivot: Node3D
var bow_node: Node3D
var guardian_node: Node3D
var guardian_arms: Array = []
var guardian_heart: MeshInstance3D
var guardian_flash := 0.0
var guardian_mats: Array = []
var wing_node: Node3D
var wing_parts: Array = []
var wing_flash := 0.0
var telegraph: Node3D
var telegraph_fill: MeshInstance3D
var dive_ring: MeshInstance3D
var spikes: Array = []          # [node, age]
var floaters: Array = []        # [label, age]
var projectile_nodes := {}
var drop_nodes: Array = []      # parallel to state.drops
var water_mats: Array = []
var axe_swing := 0.0
var bow_draw := 0.0

var hud: CanvasLayer
var party_bars := {}
var enemy_bars := {}
var inventory_label: Label
var inventory_flash: Label
var caption_label: Label
var banner_label: Label
var mode_label: Label
var _inventory_flash_time := 0.0
var _caption := "Descend the Rootfall Aqueduct into the root basin."


func _ready() -> void:
	Engine.physics_ticks_per_second = 60
	var args := OS.get_cmdline_user_args()
	autoplay_arg = args.has("--autoplay")
	capture_arg = args.has("--capture")
	quit_on_finish = args.has("--quit-on-finish")
	state.autoplay = state.autoplay or autoplay_arg
	_ensure_input_map()
	_build_environment()
	_build_aqueduct()
	_build_basin()
	_build_guardian()
	_build_wing()
	_build_party()
	_build_telegraphs()
	_build_camera()
	_build_hud()
	audio = RootfallAudio.new()
	audio.name = "Audio"
	add_child(audio)
	_sync_view(1.0)


# ---------------------------------------------------------------- input

static func _ensure_input_map() -> void:
	var bindings := {
		"rf_left": [KEY_A, KEY_LEFT], "rf_right": [KEY_D, KEY_RIGHT],
		"rf_forward": [KEY_W, KEY_UP], "rf_back": [KEY_S, KEY_DOWN],
		"rf_axe": [KEY_J], "rf_arrow": [KEY_K], "rf_spell": [KEY_L],
		"rf_autoplay": [KEY_P], "rf_restart": [KEY_R],
	}
	for action in bindings:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
			for key in bindings[action]:
				var ev := InputEventKey.new()
				ev.physical_keycode = key
				InputMap.action_add_event(action, ev)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("rf_restart"):
		restart()
	elif event.is_action_pressed("rf_autoplay"):
		state.autoplay = not state.autoplay


func restart() -> void:
	var auto := state.autoplay
	state.reset()
	state.autoplay = auto
	for n in projectile_nodes.values():
		n.queue_free()
	projectile_nodes.clear()
	for n in drop_nodes:
		n.queue_free()
	drop_nodes.clear()
	wing_node.show()
	wing_node.rotation = Vector3.ZERO
	_finish_tick = -1
	_caption = "Descend the Rootfall Aqueduct into the root basin."


## Manual input: WASD steers the Warden, the Thornbow follows. J axe, K arrow, L spell.
func read_manual_input() -> Dictionary:
	# Screen-relative: the camera looks down the aqueduct toward +z.
	var move := Vector2(Input.get_axis("rf_right", "rf_left"), Input.get_axis("rf_back", "rf_forward"))
	var actions: Array = []
	for pair in [["rf_axe", "axe"], ["rf_arrow", "arrow"], ["rf_spell", "spell"]]:
		if Input.is_action_pressed(pair[0]):
			actions.append(pair[1])
	return {"move": move, "actions": actions}


# ---------------------------------------------------------------- frame loop

func _physics_process(_delta: float) -> void:
	var manual := read_manual_input()
	state.step(manual.move, manual.actions)
	for e in state.drain_events():
		_on_event(e)
	# Victory freezes state.tick, so the outro hold counts frames instead.
	if state.phase == RootfallState.Phase.VICTORY:
		_finish_tick += 1
		if _finish_tick == 70:
			_request_capture("10_victory")
		if quit_on_finish and _finish_tick == 150:
			_write_event_log()
			get_tree().quit(0)
	if state.tick == 150:
		_request_capture("01_descent")
	_animate(RootfallState.STEP)
	_sync_view(RootfallState.STEP)
	if not _pending_captures.is_empty():
		_flush_captures()


func _on_event(e: Dictionary) -> void:
	audio.play_event(e.type)
	match e.type:
		"encounter_started":
			_caption = "The Bark Guardian wakes. The barkwing takes the air."
			_request_capture("02_encounter", 30)
		"axe_swing":
			axe_swing = 1.0
		"arrow_loosed":
			bow_draw = 1.0
			if state.count("arrow_loosed") == 2:
				_request_capture("04_arrow_flight", 4)
		"spell_loosed":
			bow_draw = 1.0
			_caption = "Thornbow Sefa looses a hush bolt."
			if state.count("spell_loosed") == 2:
				_request_capture("05_spell_flight", 14)
		"enemy_hit":
			var target: String = e.target
			var at: Vector3 = state.enemy_aim(target) + Vector3(0.0, 0.6, 0.0)
			var col := C_VIOLET.lightened(0.25) if e.source == "spell" else Color(0.92, 0.90, 0.86)
			_floater("-%d" % e.amount, at, col)
			if target == "guardian":
				guardian_flash = 1.0
			else:
				wing_flash = 1.0
		"member_hit":
			var m: Dictionary = state.members[e.member]
			_floater("-%d" % e.amount, m.pos + Vector3(0.0, 2.2, 0.0), Color(1.0, 0.42, 0.36))
			_caption = "%s takes %d from the %s." % [m.name, e.amount, e.source]
			if e.source == "roots":
				_request_capture("07_root_hit", 8)
			else:
				_request_capture("06_barkwing_dive", 0)
		"root_telegraph":
			_caption = "Roots gather under the party. Step out of the ring."
			_request_capture("03_root_telegraph", 50)
		"root_strike":
			_spawn_spikes(e.at)
		"barkwing_shriek":
			_caption = "The barkwing shrieks and dives at the Thornbow."
		"enemy_defeated":
			_caption = "%s falls." % ("The Bark Guardian" if e.target == "guardian" else "The barkwing")
		"reward_dropped":
			_spawn_drop(state.drops.size() - 1)
			if e.from == "guardian":
				_request_capture("08_reward_drop", 30)
		"item_picked":
			_inventory_flash_time = 2.5
			inventory_flash.text = "+ %s" % e.item
			_caption = "%s added to the pack." % e.item
			if state.count("item_picked") == 2:
				_request_capture("09_inventory", 20)
		"victory":
			_caption = "Root basin cleared. Review candidate run complete."


# ---------------------------------------------------------------- capture

func _request_capture(name: String, delay_ticks: int = 0) -> void:
	if capture_arg and not captured.has(name):
		captured.append(name)
		_pending_captures.append([name, delay_ticks])


func _flush_captures() -> void:
	var due: Array = []
	for c in _pending_captures:
		c[1] -= 1
		if c[1] <= 0:
			due.append(c)
	for c in due:
		_pending_captures.erase(c)
		_save_frame(c[0])


func _save_frame(name: String) -> void:
	await RenderingServer.frame_post_draw
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(CAPTURE_DIR))
	var img := get_viewport().get_texture().get_image()
	img.save_png(ProjectSettings.globalize_path("%s/%s.png" % [CAPTURE_DIR, name]))


func _write_event_log() -> void:
	if not capture_arg:
		return
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(CAPTURE_DIR))
	var f := FileAccess.open(ProjectSettings.globalize_path(CAPTURE_DIR + "/events.json"), FileAccess.WRITE)
	var rows: Array = []
	for e in state.history:
		rows.append({"tick": e.tick, "type": e.type})
	f.store_string(JSON.stringify({"snapshot": state.snapshot(), "audio_cues": audio.played.size(),
			"captures": captured, "events": rows}, "  "))
	f.close()


# ---------------------------------------------------------------- helpers

func _mat(color: Color, rough: float = 0.85, emissive: float = 0.0, metal: float = 0.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	m.metallic = metal
	if color.a < 1.0:
		m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	if emissive > 0.0:
		m.emission_enabled = true
		m.emission = Color(color.r, color.g, color.b)
		m.emission_energy_multiplier = emissive
	return m


func _mesh(parent: Node, mesh: Mesh, mat: Material, pos: Vector3, rot_deg := Vector3.ZERO,
		scale := Vector3.ONE) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot_deg
	mi.scale = scale
	parent.add_child(mi)
	return mi


func _box(size: Vector3) -> BoxMesh:
	var b := BoxMesh.new()
	b.size = size
	return b


func _cyl(top: float, bottom: float, height: float, segments: int = 8) -> CylinderMesh:
	var c := CylinderMesh.new()
	c.top_radius = top
	c.bottom_radius = bottom
	c.height = height
	c.radial_segments = segments
	c.rings = 1
	return c


func _sphere(radius: float, height: float = -1.0) -> SphereMesh:
	var s := SphereMesh.new()
	s.radius = radius
	s.height = radius * 2.0 if height < 0.0 else height
	s.radial_segments = 12
	s.rings = 6
	return s


func _ring(inner: float, outer: float) -> TorusMesh:
	var t := TorusMesh.new()
	t.inner_radius = inner
	t.outer_radius = outer
	t.rings = 32
	t.ring_segments = 6
	return t


func _water_mat() -> StandardMaterial3D:
	var m := _mat(C_WATER, 0.08, 0.25, 0.2)
	var noise := FastNoiseLite.new()
	noise.frequency = 0.04
	noise.seed = 11
	var tex := NoiseTexture2D.new()
	tex.noise = noise
	tex.seamless = true
	tex.width = 128
	tex.height = 128
	m.albedo_texture = tex
	m.uv1_scale = Vector3(1.0, 6.0, 1.0)
	water_mats.append(m)
	return m


# ---------------------------------------------------------------- world

func _build_environment() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.11, 0.10, 0.18)
	sky_mat.sky_horizon_color = Color(0.26, 0.24, 0.32)
	sky_mat.ground_horizon_color = Color(0.18, 0.17, 0.24)
	sky_mat.ground_bottom_color = Color(0.05, 0.05, 0.08)
	var sky := Sky.new()
	sky.sky_material = sky_mat
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.30, 0.29, 0.42)
	env.ambient_light_energy = 0.5
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color(0.20, 0.19, 0.28)
	env.fog_density = 0.012
	env.glow_enabled = true
	env.glow_intensity = 0.5
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)
	var key := DirectionalLight3D.new()
	key.light_color = Color(0.68, 0.66, 0.78)
	key.light_energy = 1.25
	key.rotation_degrees = Vector3(-38.0, 150.0, 0.0)
	key.shadow_enabled = true
	add_child(key)
	# Cold cyan bounce from the basin water.
	var bounce := OmniLight3D.new()
	bounce.light_color = Color(0.45, 0.70, 0.78)
	bounce.light_energy = 0.9
	bounce.omni_range = 14.0
	bounce.position = Vector3(-5.0, 1.5, 9.0)
	add_child(bounce)


func _build_aqueduct() -> void:
	var root := Node3D.new()
	root.name = "Aqueduct"
	add_child(root)
	var slope := rad_to_deg(atan2(RootfallState.AQUEDUCT_DROP,
			RootfallState.AQUEDUCT_FOOT_Z - RootfallState.AQUEDUCT_TOP_Z))
	var deck_mat := _mat(C_BASALT_WET, 0.22, 0.0, 0.15)
	var lip_mat := _mat(C_BASALT.lightened(0.12), 0.5)
	var wall_mat := _mat(C_BASALT, 0.7)
	var moss_mat := _mat(C_MOSS, 0.95)
	var seg := 2.1
	var z := RootfallState.AQUEDUCT_TOP_Z - 1.6
	var i := 0
	while z < RootfallState.AQUEDUCT_FOOT_Z + 1.2:
		var y := RootfallState.ground_height(Vector3(0, 0, z))
		_mesh(root, _box(Vector3(4.4, 0.5, seg + 0.04)), deck_mat, Vector3(0, y - 0.25, z), Vector3(slope, 0, 0))
		# Worn step lip so the descent reads as old stair masonry.
		_mesh(root, _box(Vector3(4.2, 0.08, 0.16)), lip_mat, Vector3(0, y + 0.02, z + seg * 0.5 - 0.1), Vector3(slope, 0, 0))
		for side in [-1.0, 1.0]:
			_mesh(root, _box(Vector3(0.5, 0.9, seg + 0.04)), wall_mat,
					Vector3(side * 2.75, y + 0.2, z), Vector3(slope, 0, 0))
			if i % 3 == 1:
				_mesh(root, _sphere(0.22, 0.12), moss_mat, Vector3(side * 2.62, y + 0.66, z + 0.3), Vector3.ZERO,
						Vector3(1.2, 1.0, 1.8))
		# Supporting arch piers dropping into the misty gorge below.
		if i % 3 == 0:
			for side in [-1.0, 1.0]:
				var h := y + 9.0
				_mesh(root, _cyl(0.42, 0.5, h, 6), wall_mat, Vector3(side * 2.3, y - 0.5 - h * 0.5, z))
			_mesh(root, _box(Vector3(5.2, 0.7, 0.9)), wall_mat, Vector3(0, y - 1.1, z))
			_mesh(root, _box(Vector3(2.4, 0.35, 0.8)), wall_mat, Vector3(-1.2, y - 1.8, z), Vector3(0, 0, -32))
			_mesh(root, _box(Vector3(2.4, 0.35, 0.8)), wall_mat, Vector3(1.2, y - 1.8, z), Vector3(0, 0, 32))
		z += seg
		i += 1
	# Twin runnels of water flowing down beside the deck.
	var length := RootfallState.AQUEDUCT_FOOT_Z - RootfallState.AQUEDUCT_TOP_Z + 3.0
	var mid_z := (RootfallState.AQUEDUCT_FOOT_Z + RootfallState.AQUEDUCT_TOP_Z) * 0.5
	var mid_y := RootfallState.AQUEDUCT_DROP * 0.5
	for side in [-1.0, 1.0]:
		_mesh(root, _box(Vector3(0.34, 0.06, length)), _water_mat(),
				Vector3(side * 2.32, mid_y + 0.02, mid_z), Vector3(slope, 0, 0))
	# Spill falls where the runnels pour into the basin.
	for side in [-1.0, 1.0]:
		var fall := CPUParticles3D.new()
		fall.position = Vector3(side * 2.4, 0.6, RootfallState.AQUEDUCT_FOOT_Z + 1.0)
		fall.amount = 40
		fall.lifetime = 0.9
		fall.direction = Vector3(0, -0.3, 1)
		fall.spread = 12.0
		fall.initial_velocity_min = 1.5
		fall.initial_velocity_max = 2.2
		fall.gravity = Vector3(0, -6, 0)
		fall.scale_amount_min = 0.05
		fall.scale_amount_max = 0.09
		fall.mesh = _sphere(0.5)
		fall.material_override = _mat(Color(0.6, 0.75, 0.82, 0.55), 0.1, 0.3)
		fall.fixed_fps = 30
		fall.randomness = 0.0
		root.add_child(fall)


func _build_basin() -> void:
	var root := Node3D.new()
	root.name = "RootBasin"
	add_child(root)
	var c := RootfallState.BASIN_CENTER
	_mesh(root, _cyl(12.0, 12.4, 1.0, 28), _mat(Color(0.12, 0.14, 0.13), 0.6, 0.0, 0.05), c + Vector3(0, -0.5, 0))
	# Wet flagstones in rings under the moss.
	var flag_mat := _mat(C_BASALT_WET, 0.3, 0.0, 0.1)
	for ring in [3.5, 6.0, 8.5]:
		var n := int(ring * 2.4)
		for k in n:
			var a: float = TAU * float(k) / float(n) + ring
			var p := c + Vector3(cos(a) * ring, 0.01, sin(a) * ring)
			_mesh(root, _box(Vector3(1.3, 0.04, 0.9)), flag_mat, p, Vector3(0, -rad_to_deg(a), 0))
	# Pool fed by the aqueduct.
	_mesh(root, _cyl(3.0, 3.0, 0.06, 24), _water_mat(), c + Vector3(-6.2, 0.02, 4.0))
	# Basalt rim of stepped hex columns, open where the aqueduct arrives.
	var col_mat := _mat(C_BASALT, 0.65)
	for k in 30:
		var a := TAU * float(k) / 30.0
		var dir := Vector3(cos(a), 0, sin(a))
		if dir.z < -0.9:
			continue
		var h := 2.0 + fmod(float(k) * 1.37, 2.6)
		_mesh(root, _cyl(0.75, 0.82, h, 6), col_mat, c + dir * 12.3 + Vector3(0, h * 0.5 - 0.3, 0),
				Vector3(0, float(k) * 17.0, 0))
	# Roots spreading from the guardian's footing across the floor and up the rim.
	var root_mat := _mat(C_BARK, 0.95)
	for k in 14:
		var a := TAU * float(k) / 14.0 + 0.2
		var dir := Vector3(cos(a), 0, sin(a))
		var len := 6.0 + fmod(float(k) * 2.3, 4.0)
		var mid := RootfallState.GUARDIAN_POS + dir * (len * 0.5 + 0.8)
		mid.y = 0.12
		var r := _mesh(root, _cyl(0.06, 0.28, len, 6), root_mat, mid)
		r.look_at_from_position(mid, mid + dir, Vector3.UP)
		r.rotate_object_local(Vector3.RIGHT, PI * 0.5)
	for k in 10:
		var a := TAU * float(k) / 10.0 + 0.5
		var dir := Vector3(cos(a), 0, sin(a))
		if dir.z < -0.8:
			continue
		var p := c + dir * 11.2 + Vector3(0, 1.4, 0)
		_mesh(root, _cyl(0.05, 0.22, 3.4, 6), root_mat, p, Vector3(rad_to_deg(dir.z) * 0.5, 0, -rad_to_deg(dir.x) * 0.5))
	var moss_mat := _mat(C_MOSS, 0.95)
	for k in 12:
		var a := float(k) * 2.1
		var p := c + Vector3(cos(a) * (4.0 + k % 5), 0.03, sin(a) * (4.0 + k % 5))
		_mesh(root, _sphere(0.45, 0.08), moss_mat, p, Vector3.ZERO, Vector3(1.5, 1.0, 1.1))


func _build_guardian() -> void:
	guardian_node = Node3D.new()
	guardian_node.name = "BarkGuardian"
	guardian_node.position = RootfallState.GUARDIAN_POS
	add_child(guardian_node)
	var bark := _mat(C_BARK, 0.95)
	var bark_dark := _mat(C_BARK.darkened(0.3), 0.95)
	guardian_mats = [bark, bark_dark]
	_mesh(guardian_node, _cyl(0.95, 1.5, 4.2, 9), bark, Vector3(0, 2.1, 0))
	_mesh(guardian_node, _cyl(0.5, 0.95, 1.4, 9), bark_dark, Vector3(0, 4.6, 0.05), Vector3(-8, 0, 0))
	for k in 6:
		var a := TAU * float(k) / 6.0 + 0.4
		var r := _mesh(guardian_node, _cyl(0.12, 0.45, 2.2, 6), bark_dark,
				Vector3(cos(a) * 1.4, 0.45, sin(a) * 1.4))
		r.rotation = Vector3(sin(a) * 1.1, 0, -cos(a) * 1.1)
	for side in [-1.0, 1.0]:
		var pivot := Node3D.new()
		pivot.position = Vector3(side * 1.0, 3.6, 0)
		guardian_node.add_child(pivot)
		_mesh(pivot, _cyl(0.14, 0.38, 3.0, 6), bark, Vector3(side * 1.1, 0.6, -0.3), Vector3(-20, 0, side * -55))
		_mesh(pivot, _cyl(0.04, 0.14, 1.4, 5), bark_dark, Vector3(side * 2.2, 1.6, -0.6), Vector3(-40, 0, side * -20))
		guardian_arms.append(pivot)
	# Ember eyes in a deep knot, and one restrained violet heartwood glow.
	for side in [-1.0, 1.0]:
		_mesh(guardian_node, _sphere(0.09), _mat(C_EMBER, 0.4, 3.0), Vector3(side * 0.28, 4.75, -0.62))
	guardian_heart = _mesh(guardian_node, _sphere(0.22), _mat(C_VIOLET, 0.3, 0.6), Vector3(0, 2.9, -1.08))
	for k in 5:
		_mesh(guardian_node, _sphere(0.4, 0.16), _mat(C_MOSS, 0.95),
				Vector3(cos(k * 1.3) * 1.0, 1.0 + k * 0.7, sin(k * 1.3) * 1.0 - 0.2), Vector3(0, 0, 70), Vector3(1.2, 1, 1))


func _build_wing() -> void:
	wing_node = Node3D.new()
	wing_node.name = "Barkwing"
	add_child(wing_node)
	var bark := _mat(C_BARK.lightened(0.08), 0.9)
	_mesh(wing_node, _cyl(0.12, 0.3, 1.1, 6), bark, Vector3.ZERO, Vector3(90, 0, 0))
	_mesh(wing_node, _sphere(0.22), bark, Vector3(0, 0.05, -0.62))
	for side in [-1.0, 1.0]:
		_mesh(wing_node, _sphere(0.04), _mat(C_EMBER, 0.4, 3.0), Vector3(side * 0.1, 0.12, -0.8))
		var pivot := Node3D.new()
		pivot.position = Vector3(side * 0.2, 0.1, 0)
		wing_node.add_child(pivot)
		_mesh(pivot, _box(Vector3(1.5, 0.04, 0.7)), _mat(Color(0.22, 0.18, 0.2), 0.9), Vector3(side * 0.8, 0, 0.1),
				Vector3(0, side * 12, 0))
		_mesh(pivot, _box(Vector3(0.7, 0.03, 0.4)), _mat(C_MOSS.darkened(0.2), 0.9), Vector3(side * 1.6, 0, 0.3),
				Vector3(0, side * 25, 0))
		wing_parts.append(pivot)
	_mesh(wing_node, _box(Vector3(0.3, 0.03, 0.6)), bark, Vector3(0, 0, 0.75))


func _build_party() -> void:
	# Warden: broad, armored, carries a large readable steel-bladed axe.
	var w := Node3D.new()
	w.name = "Warden"
	add_child(w)
	var cloth := _mat(Color(0.22, 0.24, 0.31), 0.9)
	var plate := _mat(Color(0.36, 0.38, 0.44), 0.45, 0.0, 0.5)
	var skin := _mat(Color(0.55, 0.45, 0.42), 0.8)
	_mesh(w, CapsuleMesh.new(), cloth, Vector3(0, 0.85, 0), Vector3.ZERO, Vector3(1.05, 0.85, 0.9))
	for side in [-1.0, 1.0]:
		_mesh(w, _sphere(0.24, 0.3), plate, Vector3(side * 0.42, 1.38, 0))
	_mesh(w, _sphere(0.2), skin, Vector3(0, 1.72, 0))
	_mesh(w, _box(Vector3(0.62, 0.5, 0.12)), _mat(Color(0.3, 0.24, 0.2), 0.9), Vector3(0, 1.1, 0.3))
	axe_pivot = Node3D.new()
	axe_pivot.position = Vector3(0.5, 1.15, -0.1)
	w.add_child(axe_pivot)
	_mesh(axe_pivot, _cyl(0.045, 0.05, 1.5, 6), _mat(Color(0.32, 0.23, 0.16), 0.8), Vector3(0, 0.45, 0))
	_mesh(axe_pivot, _box(Vector3(0.08, 0.62, 0.62)), _mat(C_STEEL, 0.3, 0.0, 0.8), Vector3(0, 1.0, -0.3))
	_mesh(axe_pivot, _box(Vector3(0.09, 0.7, 0.07)), _mat(Color(0.85, 0.88, 0.92), 0.2, 0.7, 0.6), Vector3(0, 1.0, -0.63))
	axe_pivot.rotation = Vector3(0.0, 0.0, -0.35)
	_add_member_ring(w, Color(0.5, 0.6, 0.78))
	member_nodes["warden"] = w
	# Thornbow: slim, hooded, moss cloak and a recurve bow.
	var t := Node3D.new()
	t.name = "Thornbow"
	add_child(t)
	var cloak := _mat(Color(0.2, 0.27, 0.21), 0.95)
	_mesh(t, CapsuleMesh.new(), cloak, Vector3(0, 0.8, 0), Vector3.ZERO, Vector3(0.78, 0.8, 0.72))
	_mesh(t, _cyl(0.0, 0.3, 0.55, 8), cloak, Vector3(0, 1.75, 0.04))
	_mesh(t, _sphere(0.15), skin, Vector3(0, 1.6, -0.12))
	bow_node = Node3D.new()
	bow_node.position = Vector3(-0.38, 1.1, -0.2)
	t.add_child(bow_node)
	var wood := _mat(Color(0.36, 0.27, 0.2), 0.7)
	_mesh(bow_node, _box(Vector3(0.05, 0.55, 0.05)), wood, Vector3(0, 0.32, -0.1), Vector3(-22, 0, 0))
	_mesh(bow_node, _box(Vector3(0.05, 0.55, 0.05)), wood, Vector3(0, -0.32, -0.1), Vector3(22, 0, 0))
	_mesh(bow_node, _box(Vector3(0.012, 1.1, 0.012)), _mat(Color(0.8, 0.8, 0.78), 0.5), Vector3(0, 0, 0.02))
	_add_member_ring(t, Color(0.48, 0.66, 0.5))
	member_nodes["thornbow"] = t


func _add_member_ring(parent: Node3D, col: Color) -> void:
	_mesh(parent, _ring(0.5, 0.6), _mat(Color(col.r, col.g, col.b, 0.7), 0.5, 1.0), Vector3(0, 0.04, 0))


func _build_telegraphs() -> void:
	telegraph = Node3D.new()
	telegraph.name = "RootTelegraph"
	add_child(telegraph)
	var r := RootfallState.ROOT_RADIUS
	_mesh(telegraph, _ring(r - 0.14, r), _mat(Color(C_EMBER.r, C_EMBER.g, C_EMBER.b, 0.9), 0.5, 1.2), Vector3(0, 0.06, 0))
	telegraph_fill = _mesh(telegraph, _cyl(r, r, 0.02, 32), _mat(Color(0.7, 0.3, 0.55, 0.35), 0.5, 0.8),
			Vector3(0, 0.05, 0))
	telegraph.hide()
	dive_ring = _mesh(self, _ring(0.7, 0.85), _mat(Color(0.9, 0.5, 0.7, 0.85), 0.5, 1.8), Vector3.ZERO)
	dive_ring.hide()


func _spawn_spikes(at: Vector3) -> void:
	var mat := _mat(Color(0.30, 0.20, 0.16), 0.9, 0.35)
	for k in 9:
		var a := TAU * float(k) / 9.0
		var rad := 0.4 if k == 0 else RootfallState.ROOT_RADIUS * (0.45 + 0.4 * float(k % 2))
		var p := at + Vector3(cos(a) * rad, 0.0, sin(a) * rad)
		var spike := _mesh(self, _cyl(0.0, 0.38, 2.6, 6), mat, p, Vector3(cos(a) * 14, 0, sin(a) * 14))
		spike.scale = Vector3(1, 0.01, 1)
		spikes.append([spike, 0.0])


func _floater(text: String, at: Vector3, col: Color) -> void:
	var l := Label3D.new()
	l.text = text
	l.font_size = 88
	l.pixel_size = 0.008
	l.outline_size = 14
	l.modulate = col
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = true
	l.position = at
	add_child(l)
	floaters.append([l, 0.0])


func _spawn_drop(index: int) -> void:
	var d: Dictionary = state.drops[index]
	var node := Node3D.new()
	node.position = d.pos
	add_child(node)
	var col := C_EMBER if d.from == "guardian" else C_VIOLET
	if d.from == "guardian":
		_mesh(node, _cyl(0.12, 0.16, 0.34, 8), _mat(Color(0.55, 0.3, 0.18), 0.3, 0.9), Vector3(0, 0.7, 0))
	else:
		_mesh(node, _box(Vector3(0.06, 0.04, 0.6)), _mat(Color(0.5, 0.42, 0.6), 0.6, 0.7), Vector3(0, 0.7, 0), Vector3(0, 30, 20))
	_mesh(node, _cyl(0.05, 0.05, 2.4, 6), _mat(Color(col.r, col.g, col.b, 0.35), 0.5, 1.5), Vector3(0, 1.2, 0))
	_mesh(node, _ring(0.4, 0.5), _mat(Color(col.r, col.g, col.b, 0.8), 0.5, 1.5), Vector3(0, 0.04, 0))
	var light := OmniLight3D.new()
	light.light_color = col
	light.light_energy = 0.8
	light.omni_range = 3.0
	light.position = Vector3(0, 0.8, 0)
	node.add_child(light)
	drop_nodes.append(node)


func _build_camera() -> void:
	camera = Camera3D.new()
	camera.fov = 58.0
	camera.current = true
	add_child(camera)


# ---------------------------------------------------------------- HUD

func _label(text: String, size: int, col := Color(0.9, 0.89, 0.94)) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.add_theme_constant_override("outline_size", 6)
	l.add_theme_color_override("font_outline_color", Color(0.04, 0.04, 0.07))
	return l


func _panel(parent: Control) -> VBoxContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.07, 0.07, 0.1, 0.78)
	sb.border_color = Color(0.36, 0.33, 0.46, 0.8)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(4)
	sb.set_content_margin_all(10)
	p.add_theme_stylebox_override("panel", sb)
	parent.add_child(p)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 4)
	p.add_child(box)
	return box


func _bar(parent: Control, title: String, col: Color) -> Dictionary:
	var row := VBoxContainer.new()
	parent.add_child(row)
	var name := _label(title, 15)
	row.add_child(name)
	var bg := ColorRect.new()
	bg.color = Color(0.16, 0.15, 0.2)
	bg.custom_minimum_size = Vector2(220, 12)
	row.add_child(bg)
	var fill := ColorRect.new()
	fill.color = col
	fill.size = Vector2(220, 12)
	bg.add_child(fill)
	var lag := ColorRect.new()
	lag.color = Color(0.95, 0.9, 0.85, 0.55)
	lag.size = Vector2(0, 12)
	bg.add_child(lag)
	return {"name": name, "fill": fill, "lag": lag, "shown": 1.0}


## Pins a panel to a viewport corner; negative offsets grow it back on screen.
func _place(c: Control, ax: float, ay: float, ox: float, oy: float) -> void:
	c.anchor_left = ax
	c.anchor_right = ax
	c.anchor_top = ay
	c.anchor_bottom = ay
	c.offset_left = ox
	c.offset_right = ox
	c.offset_top = oy
	c.offset_bottom = oy
	c.grow_horizontal = Control.GROW_DIRECTION_BEGIN if ax > 0.5 else Control.GROW_DIRECTION_END
	c.grow_vertical = Control.GROW_DIRECTION_BEGIN if ay > 0.5 else Control.GROW_DIRECTION_END


func _build_hud() -> void:
	hud = CanvasLayer.new()
	add_child(hud)
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud.add_child(root)
	var party := _panel(root)
	_place(party.get_parent(), 0.0, 0.0, 16.0, 16.0)
	party.add_child(_label("Party", 17, Color(0.78, 0.76, 0.9)))
	party_bars["warden"] = _bar(party, "", Color(0.45, 0.58, 0.8))
	party_bars["thornbow"] = _bar(party, "", Color(0.45, 0.68, 0.5))
	var foes := _panel(root)
	_place(foes.get_parent(), 1.0, 0.0, -16.0, 16.0)
	foes.add_child(_label("Root basin", 17, Color(0.9, 0.76, 0.72)))
	enemy_bars["guardian"] = _bar(foes, "", Color(0.78, 0.42, 0.28))
	enemy_bars["barkwing"] = _bar(foes, "", Color(0.68, 0.5, 0.78))
	var pack := _panel(root)
	_place(pack.get_parent(), 0.0, 1.0, 16.0, -16.0)
	pack.add_child(_label("Pack", 17, Color(0.78, 0.76, 0.9)))
	inventory_label = _label("", 15)
	pack.add_child(inventory_label)
	inventory_flash = _label("", 16, Color(0.95, 0.72, 0.5))
	pack.add_child(inventory_flash)
	var title := _label("Rootfall Aqueduct   review candidate, not production", 15, Color(0.7, 0.68, 0.8))
	title.set_anchors_preset(Control.PRESET_CENTER_TOP)
	title.position = Vector2(-200, 12)
	root.add_child(title)
	caption_label = _label("", 19)
	caption_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	caption_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	caption_label.size = Vector2(760, 30)
	caption_label.position = Vector2(-380, -78)
	root.add_child(caption_label)
	mode_label = _label("", 14, Color(0.68, 0.66, 0.76))
	mode_label.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	mode_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	mode_label.size = Vector2(760, 24)
	mode_label.position = Vector2(-380, -44)
	root.add_child(mode_label)
	banner_label = _label("", 34, Color(0.88, 0.84, 0.96))
	banner_label.set_anchors_preset(Control.PRESET_CENTER)
	banner_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_label.size = Vector2(600, 50)
	banner_label.position = Vector2(-300, -120)
	root.add_child(banner_label)


func _update_bar(bar: Dictionary, title: String, hp: int, max_hp: int, dt: float) -> void:
	var ratio := float(hp) / float(max_hp)
	bar.name.text = "%s   %d / %d" % [title, hp, max_hp]
	bar.fill.size.x = 220.0 * ratio
	# Pale lag segment shows the size of the most recent hit, then drains.
	bar.shown = maxf(ratio, bar.shown - dt * 0.6)
	bar.lag.position.x = 220.0 * ratio
	bar.lag.size.x = 220.0 * (bar.shown - ratio)


func hud_text() -> Dictionary:
	return {"party": party_bars.warden.name.text + "\n" + party_bars.thornbow.name.text,
			"enemies": enemy_bars.guardian.name.text + "\n" + enemy_bars.barkwing.name.text,
			"inventory": inventory_label.text, "caption": caption_label.text}


# ---------------------------------------------------------------- view sync

func _sync_view(dt: float) -> void:
	for id in member_nodes:
		var m: Dictionary = state.members[id]
		var node: Node3D = member_nodes[id]
		var prev := node.position
		node.position = m.pos
		var face: Vector3 = m.pos - prev
		var target_dir := Vector3(0, 0, 1)
		if face.length() > 0.002:
			target_dir = face.normalized()
		if state.phase == RootfallState.Phase.ENCOUNTER:
			var foe: Vector3 = RootfallState.GUARDIAN_POS if id == "warden" or state.wing.dead else state.wing.pos
			target_dir = Vector3(foe.x - m.pos.x, 0, foe.z - m.pos.z).normalized()
		node.rotation.y = lerp_angle(node.rotation.y, atan2(-target_dir.x, -target_dir.z), 0.2)
		node.rotation.z = 1.4 if m.downed else 0.0
		_update_bar(party_bars[id], m.name, m.hp, m.max_hp, dt)
	_update_bar(enemy_bars.guardian, "Bark Guardian (felled)" if state.guardian.dead else "Bark Guardian", state.guardian.hp, state.guardian.max_hp, dt)
	var wing_title := "Barkwing (airborne)" if not state.wing_low() else "Barkwing (diving, axe can reach)"
	if state.wing.dead:
		wing_title = "Barkwing (downed)"
	_update_bar(enemy_bars.barkwing, wing_title, state.wing.hp, state.wing.max_hp, dt)
	# Barkwing transform: face its travel direction, bank in the orbit.
	if not state.wing.dead or state.wing.fall < 1.0:
		var wp: Vector3 = state.wing.pos
		var to := wp - wing_node.position
		wing_node.position = wp
		if to.length() > 0.001 and not state.wing.dead:
			wing_node.rotation.y = atan2(-to.x, -to.z)
			wing_node.rotation.z = -0.35
		elif state.wing.dead:
			wing_node.rotation.z = state.wing.fall * 2.4
	elif wing_node.visible:
		wing_node.hide()
	# Telegraphs.
	telegraph.visible = state.guardian.windup > 0.0
	if telegraph.visible:
		telegraph.position = state.guardian.target
		var progress: float = 1.0 - state.guardian.windup / RootfallState.ROOT_WINDUP
		telegraph_fill.scale = Vector3(progress, 1.0, progress)
	dive_ring.visible = state.wing.mode == "shriek" and not state.wing.dead
	if dive_ring.visible:
		dive_ring.position = state.members.thornbow.pos + Vector3(0, 0.05, 0)
	# Projectiles.
	var live := {}
	for p in state.projectiles:
		live[p.id] = true
		if not projectile_nodes.has(p.id):
			projectile_nodes[p.id] = _make_projectile(p.kind)
		var pn: Node3D = projectile_nodes[p.id]
		var aim := state.enemy_aim(p.target)
		pn.position = p.pos
		if aim.distance_to(p.pos) > 0.05:
			pn.look_at(aim, Vector3.UP)
	for id in projectile_nodes.keys():
		if not live.has(id):
			projectile_nodes[id].queue_free()
			projectile_nodes.erase(id)
	# Drops.
	for i in drop_nodes.size():
		var dn: Node3D = drop_nodes[i]
		if state.drops[i].taken and dn.visible:
			dn.hide()
	# Inventory text.
	var keys := state.inventory.keys()
	keys.sort()
	var lines: Array = []
	for k in keys:
		lines.append("%s  x%d" % [k, state.inventory[k]])
	inventory_label.text = "\n".join(lines)
	_inventory_flash_time = maxf(0.0, _inventory_flash_time - dt)
	inventory_flash.visible = _inventory_flash_time > 0.0
	caption_label.text = _caption
	var cds: Dictionary = state.members.thornbow.cd
	mode_label.text = ("AUTOPLAY review run   P manual   R restart" if state.autoplay else
			"WASD move   J axe   K arrow   L hush spell (%.0fs)   P autoplay   R restart" % float(cds.get("spell", 0.0)))
	banner_label.text = {RootfallState.Phase.VICTORY: "Root basin cleared",
			RootfallState.Phase.DEFEAT: "The party falls. Press R."}.get(state.phase, "")
	_update_camera()


func _make_projectile(kind: String) -> Node3D:
	var n := Node3D.new()
	add_child(n)
	if kind == "arrow":
		_mesh(n, _box(Vector3(0.03, 0.03, 0.9)), _mat(Color(0.82, 0.78, 0.7), 0.6, 0.4), Vector3.ZERO)
		_mesh(n, _box(Vector3(0.12, 0.02, 0.16)), _mat(Color(0.5, 0.6, 0.52), 0.8), Vector3(0, 0, 0.38))
	else:
		_mesh(n, _sphere(0.16), _mat(C_VIOLET, 0.2, 2.4), Vector3.ZERO)
		_mesh(n, _sphere(0.1), _mat(C_VIOLET.darkened(0.2), 0.2, 1.4), Vector3(0, 0, 0.3))
		var light := OmniLight3D.new()
		light.light_color = C_VIOLET
		light.light_energy = 1.1
		light.omni_range = 3.2
		n.add_child(light)
	return n


func _update_camera() -> void:
	var lead: Vector3 = state.members[state.leader].pos
	var eye: Vector3
	var look: Vector3
	if state.phase == RootfallState.Phase.DESCENT:
		# Behind and above the party, looking down the aqueduct into the basin.
		eye = lead + Vector3(3.2, 5.6, -8.2)
		look = lead + Vector3(0, -0.6, 6.0)
	else:
		var mid := lead.lerp(RootfallState.GUARDIAN_POS, 0.45)
		eye = mid + Vector3(9.5, 10.5, -8.5)
		look = mid + Vector3(0, 0.8, 0.4)
	if camera.position == Vector3.ZERO:
		camera.position = eye
	camera.position = camera.position.lerp(eye, 0.06)
	camera.look_at(look if camera.position.distance_to(look) > 0.1 else look + Vector3.FORWARD, Vector3.UP)


func _animate(dt: float) -> void:
	_time += dt
	for m in water_mats:
		m.uv1_offset.y = -_time * 0.35
	# Guardian sway, arm raise during root windup, and hit flash.
	var windup := 0.0
	if state.guardian.windup > 0.0:
		windup = 1.0 - state.guardian.windup / RootfallState.ROOT_WINDUP
	if state.guardian.dead:
		guardian_node.rotation.x = lerpf(guardian_node.rotation.x, 0.9, 0.05)
		guardian_node.position.y = lerpf(guardian_node.position.y, -2.2, 0.04)
	else:
		guardian_node.rotation.z = sin(_time * 0.7) * 0.03
		for i in guardian_arms.size():
			var side := -1.0 if i == 0 else 1.0
			guardian_arms[i].rotation.z = side * (0.1 + windup * 0.9) + sin(_time * 1.1 + i) * 0.04
			guardian_arms[i].rotation.x = -windup * 0.5
	var heart_mat: StandardMaterial3D = guardian_heart.material_override
	heart_mat.emission_energy_multiplier = 0.0 if state.guardian.dead else 0.6 + windup * 1.6
	guardian_flash = maxf(0.0, guardian_flash - dt * 5.0)
	for m in guardian_mats:
		m.emission_enabled = guardian_flash > 0.0
		m.emission = Color(0.9, 0.85, 0.8)
		m.emission_energy_multiplier = guardian_flash * 0.8
	if guardian_flash > 0.0 and not state.guardian.dead:
		guardian_node.position.x = RootfallState.GUARDIAN_POS.x + sin(_time * 80.0) * 0.06 * guardian_flash
	# Barkwing flap, faster while diving.
	var flap_rate := 18.0 if state.wing.mode in ["dive", "shriek"] else 9.0
	for i in wing_parts.size():
		var side := -1.0 if i == 0 else 1.0
		wing_parts[i].rotation.z = side * sin(_time * flap_rate) * 0.7 if not state.wing.dead else side * 0.9
	wing_flash = maxf(0.0, wing_flash - dt * 5.0)
	wing_node.scale = Vector3.ONE * (1.0 + wing_flash * 0.25)
	# Axe swing arc and bow draw pulse.
	axe_swing = maxf(0.0, axe_swing - dt * 3.2)
	var arc := sin((1.0 - axe_swing) * PI) if axe_swing > 0.0 else 0.0
	axe_pivot.rotation = Vector3(-arc * 1.9, 0.0, -0.35 - arc * 0.4)
	bow_draw = maxf(0.0, bow_draw - dt * 4.0)
	bow_node.position.z = -0.2 - bow_draw * 0.12
	# Root spikes erupt then sink.
	var keep: Array = []
	for s in spikes:
		s[1] += dt
		var t: float = s[1]
		var sc := clampf(t / 0.12, 0.0, 1.0) * clampf((0.9 - t) / 0.4, 0.0, 1.0)
		s[0].scale = Vector3(1, maxf(0.01, sc), 1)
		s[0].position.y = sc * 0.9 - 0.05
		if t < 0.9:
			keep.append(s)
		else:
			s[0].queue_free()
	spikes = keep
	# Floating damage numbers rise and fade.
	var fkeep: Array = []
	for f in floaters:
		f[1] += dt
		f[0].position.y += dt * 1.1
		f[0].modulate.a = clampf(1.2 - f[1] * 1.3, 0.0, 1.0)
		if f[1] < 0.95:
			fkeep.append(f)
		else:
			f[0].queue_free()
	floaters = fkeep
	for i in drop_nodes.size():
		drop_nodes[i].get_child(0).position.y = 0.7 + sin(_time * 2.5 + i) * 0.12
		drop_nodes[i].rotation.y = _time
