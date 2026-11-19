extends Node3D
## Outpost slice: builds the basalt/roots dusk scene, HUD and input in code.

const OutpostState := preload("res://scripts/outpost_state.gd")

const CAMERA_OFFSET := Vector3(0.0, 11.0, 9.5)

var state := OutpostState.new()

var player: Node3D
var carried_markers: Dictionary = {}  # marker id -> tag shown above the player
var marker_nodes: Dictionary = {}     # marker id -> pickup node at its landmark
var camera: Camera3D
var portal_mesh: MeshInstance3D
var portal_light: OmniLight3D
var quest_master: Node3D

var objective_label: Label
var region_label: Label
var landmark_label: Label
var hint_label: Label
var toast_label: Label
var dialogue_panel: PanelContainer
var speaker_label: Label
var line_label: Label
var continue_label: Label

var _time := 0.0


func _ready() -> void:
	_ensure_input_map()
	_build_environment()
	_build_ground_and_walls()
	_build_gate()
	_build_guild_hall()
	_build_deepwood_landmarks()
	_build_permafrost_landmarks()
	_build_dungeon()
	_build_quest_master()
	_build_player()
	_build_camera()
	_build_ui()
	sync_view()


# ---------------------------------------------------------------- input

static func _ensure_input_map() -> void:
	var bindings := {
		"move_left": [KEY_A, KEY_LEFT],
		"move_right": [KEY_D, KEY_RIGHT],
		"move_forward": [KEY_W, KEY_UP],
		"move_back": [KEY_S, KEY_DOWN],
		"interact": [KEY_E],
		"advance": [KEY_SPACE, KEY_ENTER],
		"skip_intro": [KEY_ESCAPE],
		"restart": [KEY_R],
	}
	for action in bindings:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
			for key in bindings[action]:
				var ev := InputEventKey.new()
				ev.physical_keycode = key
				InputMap.action_add_event(action, ev)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("restart"):
		state.reset()
		sync_view()
	elif event.is_action_pressed("skip_intro"):
		state.skip_intro()
		sync_view()
	elif event.is_action_pressed("interact") or (
			state.phase == OutpostState.Phase.INTRO and event.is_action_pressed("advance")):
		state.interact()
		sync_view()


func _physics_process(delta: float) -> void:
	_time += delta
	state.tick(delta)
	if state.can_move():
		var axis := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		state.move(axis, delta)
	_animate()
	sync_view()


# ---------------------------------------------------------------- view sync

func sync_view() -> void:
	if player == null:
		return
	player.position = state.player_pos
	player.rotation.y = atan2(state.facing.x, state.facing.z)
	for id in OutpostState.MARKER_IDS:
		carried_markers[id].visible = state.collected.has(id) and not state.delivered
		marker_nodes[id].visible = not state.collected.has(id)
	_update_camera()

	var in_intro := state.phase == OutpostState.Phase.INTRO
	dialogue_panel.visible = in_intro
	if in_intro:
		line_label.text = state.current_line()
		continue_label.text = "[Space] Continue    [Esc] Skip intro    (%d/%d)" % [
			state.line_index + 1, OutpostState.INTRO_LINES.size()]
	objective_label.text = state.objective_text()
	region_label.text = "Region: " + state.region_label()
	landmark_label.text = _landmark_text()
	toast_label.text = state.message
	hint_label.text = _hint_text()


func _landmark_text() -> String:
	var lines: Array[String] = ["LANDMARKS  (north = up screen)"]
	for e in state.landmark_entries():
		var mark := ""
		if e["kind"] == "marker":
			mark = "[x] " if e["done"] else "[ ] "
		elif e["kind"] == "optional" and e["done"]:
			mark = "(seen) "
		lines.append("%s%s: %s %d m" % [mark, e["name"], e["dir"], int(round(e["dist"]))])
	return "\n".join(lines)


func _hint_text() -> String:
	if state.phase == OutpostState.Phase.INTRO:
		return "Space / Enter / E: continue    Esc: skip intro"
	var base := "WASD / Arrows: move    E: interact    R: restart"
	var prompt := ""
	match state.nearby_target():
		"deepwood_marker":
			prompt = "E: take the Deepwood survey record"
		"permafrost_marker":
			prompt = "E: take the Permafrost survey record"
		"gate":
			prompt = "E: enter the dungeon"
		"exit":
			prompt = "E: leave the dungeon (back to the northern gate)"
		"core":
			prompt = "E: examine the dormant core"
		"quest_master":
			if state.survey_complete() and not state.delivered:
				prompt = "E: deliver the survey to the Quest Master"
			else:
				prompt = "E: talk to the Quest Master"
	if prompt != "":
		return prompt + "    |    " + base
	return base


func _update_camera() -> void:
	if camera == null or not camera.is_inside_tree():
		return
	var focus := state.player_pos + Vector3(0.0, 1.0, 0.0)
	camera.global_position = focus + CAMERA_OFFSET
	camera.look_at(focus, Vector3.UP)


func _animate() -> void:
	for id in marker_nodes:
		marker_nodes[id].position.y = sin(_time * 2.0) * 0.12
	if portal_light:
		portal_light.light_energy = 2.2 + sin(_time * 1.7) * 0.5
	for id in carried_markers:
		carried_markers[id].position.y = 2.3 + sin(_time * 3.0) * 0.05


# ---------------------------------------------------------------- materials

func _mat(color: Color, emissive: float = 0.0, rough: float = 0.9) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	if emissive > 0.0:
		m.emission_enabled = true
		m.emission = color
		m.emission_energy_multiplier = emissive
	return m


func _add_mesh(parent: Node, mesh: Mesh, mat: Material, pos: Vector3,
		rot_deg: Vector3 = Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat
	mi.position = pos
	mi.rotation_degrees = rot_deg
	parent.add_child(mi)
	return mi


func _column(parent: Node, pos: Vector3, radius: float, height: float, mat: Material) -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = radius
	mesh.bottom_radius = radius * 1.05
	mesh.height = height
	mesh.radial_segments = 6  # hexagonal basalt
	mesh.rings = 1
	_add_mesh(parent, mesh, mat, pos + Vector3(0.0, height * 0.5, 0.0),
			Vector3(0.0, fmod(pos.x * 37.0 + pos.z * 11.0, 60.0), 0.0))


func _root(parent: Node, pos: Vector3, length: float, thickness: float, tilt: Vector3, mat: Material) -> void:
	var mesh := CylinderMesh.new()
	mesh.top_radius = thickness * 0.35
	mesh.bottom_radius = thickness
	mesh.height = length
	mesh.radial_segments = 8
	_add_mesh(parent, mesh, mat, pos, tilt)


# ---------------------------------------------------------------- world

func _build_environment() -> void:
	var sky_mat := ProceduralSkyMaterial.new()
	sky_mat.sky_top_color = Color(0.14, 0.12, 0.22)
	sky_mat.sky_horizon_color = Color(0.40, 0.34, 0.46)
	sky_mat.ground_horizon_color = Color(0.22, 0.20, 0.28)
	sky_mat.ground_bottom_color = Color(0.07, 0.07, 0.10)
	var sky := Sky.new()
	sky.sky_material = sky_mat
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.36, 0.34, 0.50)
	env.ambient_light_energy = 0.7
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	env.fog_enabled = true
	env.fog_light_color = Color(0.30, 0.26, 0.38)
	env.fog_density = 0.011
	env.glow_enabled = true
	env.glow_intensity = 0.6
	var we := WorldEnvironment.new()
	we.environment = env
	add_child(we)

	# Low, cool dusk key light with a slight rose cast (not yellow).
	var sun := DirectionalLight3D.new()
	sun.light_color = Color(0.72, 0.60, 0.78)
	sun.light_energy = 0.9
	sun.rotation_degrees = Vector3(-24.0, -35.0, 0.0)
	sun.shadow_enabled = true
	add_child(sun)


func _build_ground_and_walls() -> void:
	var world := Node3D.new()
	world.name = "World"
	add_child(world)

	# Three contiguous ground strips: Deepwood | Guild | Permafrost.
	var hz := OutpostState.WORLD_HALF_Z
	var hx := OutpostState.WORLD_HALF_X
	var edge_x := OutpostState.REGION_EDGE
	_ground(world, -hx, -edge_x, hz, Color(0.09, 0.15, 0.12))
	_ground(world, -edge_x, edge_x, hz, Color(0.13, 0.13, 0.17))
	_ground(world, edge_x, hx, hz, Color(0.58, 0.68, 0.78))

	var basalt := _mat(Color(0.19, 0.19, 0.25), 0.0, 0.7)
	var basalt_dark := _mat(Color(0.12, 0.12, 0.17), 0.0, 0.75)
	var bark := _mat(Color(0.20, 0.15, 0.14), 0.0, 0.95)
	var moss := _mat(Color(0.14, 0.22, 0.20), 0.0, 0.95)

	# Guild-area obstacles are basalt columns, matching OutpostState.FRONTIER_OBSTACLES.
	for o in OutpostState.FRONTIER_OBSTACLES:
		if absf(o.x) <= edge_x + 0.5 and o.z >= 0.9 and o.x != -4.0 and absf(o.x) != 2.6:
			_column(world, Vector3(o.x, 0.0, o.y), o.z, 2.2 + fmod(absf(o.x) * 0.7, 1.6), basalt)

	# Enclosing basalt palisade of varied heights.
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var ex := hx + 2.5
	var ez := hz + 2.5
	var i := -ex
	while i <= ex:
		for side in [Vector3(i, 0.0, -ez), Vector3(i, 0.0, ez)]:
			_column(world, side, rng.randf_range(0.7, 1.2), rng.randf_range(3.0, 8.0),
					basalt_dark if rng.randf() < 0.5 else basalt)
		i += 2.1
	i = -ez
	while i <= ez:
		for side in [Vector3(-ex, 0.0, i), Vector3(ex, 0.0, i)]:
			_column(world, side, rng.randf_range(0.7, 1.2), rng.randf_range(3.0, 8.0),
					basalt_dark if rng.randf() < 0.5 else basalt)
		i += 2.1

	# Roots creeping over the basalt around the guild center.
	for n in 16:
		var a := rng.randf() * TAU
		var r := rng.randf_range(9.0, 11.5)
		var pos := Vector3(cos(a) * r, rng.randf_range(0.2, 0.9), sin(a) * r - 3.0)
		_root(world, pos, rng.randf_range(3.0, 6.0), rng.randf_range(0.18, 0.4),
				Vector3(rng.randf_range(60.0, 100.0), rng.randf() * 360.0, rng.randf_range(-30.0, 30.0)),
				bark if rng.randf() < 0.7 else moss)

	# Region waymarks on the Guild/Deepwood and Guild/Permafrost borders.
	for side in [-1.0, 1.0]:
		var post := BoxMesh.new()
		post.size = Vector3(0.5, 3.0, 0.5)
		_add_mesh(world, post, basalt, Vector3(side * edge_x, 1.5, 6.0))
		_add_mesh(world, post, basalt, Vector3(side * edge_x, 1.5, 9.0))
		_sign(world, "<< DEEPWOOD" if side < 0.0 else "PERMAFROST >>",
				Vector3(side * edge_x, 3.8, 7.5), Color(0.55, 0.95, 0.65) if side < 0.0 else Color(0.65, 0.88, 1.0))

	# Distant ruined watchtower silhouette.
	var tower := BoxMesh.new()
	tower.size = Vector3(3.0, 11.0, 3.0)
	_add_mesh(world, tower, basalt_dark, Vector3(-13.0, 5.5, -13.0))
	var cap := BoxMesh.new()
	cap.size = Vector3(4.2, 0.8, 4.2)
	_add_mesh(world, cap, basalt, Vector3(-13.0, 11.4, -13.0))


func _build_gate() -> void:
	var gate := Node3D.new()
	gate.name = "Gate"
	gate.position = OutpostState.GATE_POS
	add_child(gate)
	var stone := _mat(Color(0.17, 0.17, 0.23), 0.0, 0.7)
	var pillar := BoxMesh.new()
	pillar.size = Vector3(1.8, 6.5, 1.8)
	_add_mesh(gate, pillar, stone, Vector3(-2.6, 3.25, 0.0))
	_add_mesh(gate, pillar, stone, Vector3(2.6, 3.25, 0.0))
	var lintel := BoxMesh.new()
	lintel.size = Vector3(7.4, 1.1, 1.8)
	_add_mesh(gate, lintel, stone, Vector3(0.0, 7.0, 0.0))

	var bark := _mat(Color(0.22, 0.16, 0.14), 0.0, 0.95)
	_root(gate, Vector3(-2.3, 3.4, 0.9), 6.5, 0.3, Vector3(8.0, 0.0, 14.0), bark)
	_root(gate, Vector3(2.4, 3.0, 0.9), 6.0, 0.28, Vector3(6.0, 0.0, -16.0), bark)
	_root(gate, Vector3(0.0, 6.7, 1.0), 6.6, 0.22, Vector3(0.0, 0.0, 90.0), bark)

	var quad := QuadMesh.new()
	quad.size = Vector2(3.6, 6.0)
	var pm := _mat(Color(0.55, 0.30, 0.85), 2.0, 0.2)
	pm.albedo_color.a = 0.55
	pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	portal_mesh = _add_mesh(gate, quad, pm, Vector3(0.0, 3.2, 0.0))
	portal_light = OmniLight3D.new()
	portal_light.light_color = Color(0.62, 0.38, 0.95)
	portal_light.light_energy = 2.2
	portal_light.omni_range = 14.0
	portal_light.position = Vector3(0.0, 3.0, 2.0)
	gate.add_child(portal_light)
	_sign(gate, "NORTHERN GATE - DUNGEON", Vector3(0.0, 9.2, 0.0), Color(0.80, 0.68, 1.0))


func _ground(parent: Node, x0: float, x1: float, half_z: float, color: Color) -> void:
	var plane := PlaneMesh.new()
	plane.size = Vector2(x1 - x0, half_z * 2.0)
	_add_mesh(parent, plane, _mat(color, 0.0, 0.8), Vector3((x0 + x1) * 0.5, 0.0, 0.0))


## Floating billboard name tag, readable from the top-down camera.
func _sign(parent: Node, text: String, pos: Vector3, color: Color) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.position = pos
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.pixel_size = 0.012
	l.font_size = 56
	l.outline_size = 14
	l.modulate = color
	l.outline_modulate = Color(0.03, 0.02, 0.07)
	l.no_depth_test = true
	parent.add_child(l)
	return l


func _beacon(parent: Node, pos: Vector3, height: float, color: Color) -> void:
	var beam := CylinderMesh.new()
	beam.top_radius = 0.05
	beam.bottom_radius = 0.12
	beam.height = height
	var m := _mat(color, 2.5, 0.3)
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_add_mesh(parent, beam, m, pos + Vector3(0.0, height * 0.5, 0.0))


## Collectible survey record: a glowing scroll that bobs over its landmark.
func _marker_pickup(parent: Node, id: String, offset: Vector3, color: Color) -> void:
	var node := Node3D.new()
	node.name = "Record_" + id
	node.position = offset
	parent.add_child(node)
	var scroll := CylinderMesh.new()
	scroll.top_radius = 0.14
	scroll.bottom_radius = 0.14
	scroll.height = 0.8
	_add_mesh(node, scroll, _mat(Color(0.82, 0.80, 0.88), 0.9, 0.6),
			Vector3(0.0, 1.0, 0.0), Vector3(0.0, 0.0, 90.0))
	var glow := OmniLight3D.new()
	glow.light_color = color
	glow.light_energy = 1.6
	glow.omni_range = 6.0
	glow.position = Vector3(0.0, 1.4, 0.0)
	node.add_child(glow)
	marker_nodes[id] = node


func _build_guild_hall() -> void:
	var hall := Node3D.new()
	hall.name = "GuildHall"
	hall.position = OutpostState.QUEST_MASTER_POS + Vector3(-2.2, 0.0, -2.0)
	add_child(hall)
	var stone := _mat(Color(0.17, 0.17, 0.23), 0.0, 0.7)
	var pole := BoxMesh.new()
	pole.size = Vector3(0.35, 7.0, 0.35)
	_add_mesh(hall, pole, stone, Vector3(0.0, 3.5, 0.0))
	var banner := BoxMesh.new()
	banner.size = Vector3(1.8, 2.6, 0.08)
	_add_mesh(hall, banner, _mat(Color(0.85, 0.55, 0.30), 1.4, 0.7), Vector3(1.1, 5.4, 0.0))
	var l := OmniLight3D.new()
	l.light_color = Color(0.95, 0.65, 0.40)
	l.light_energy = 1.3
	l.omni_range = 9.0
	l.position = Vector3(0.0, 4.0, 1.0)
	hall.add_child(l)
	_sign(hall, "GUILD HALL", Vector3(0.0, 8.2, 0.0), Color(1.0, 0.78, 0.50))


func _build_deepwood_landmarks() -> void:
	var root := Node3D.new()
	root.name = "Deepwood"
	add_child(root)
	var bark := _mat(Color(0.22, 0.16, 0.12), 0.0, 0.95)
	var leaf := _mat(Color(0.08, 0.20, 0.14), 0.0, 0.95)
	var leaf_glow := _mat(Color(0.22, 0.65, 0.40), 0.6, 0.9)
	var stone := _mat(Color(0.22, 0.26, 0.24), 0.0, 0.85)
	var green := Color(0.45, 0.95, 0.60)

	for t in OutpostState.DEEPWOOD_TREES:
		var h := 4.5 + fmod(absf(t.x * 3.1 + t.y), 3.0)
		var trunk := CylinderMesh.new()
		trunk.top_radius = t.z * 0.5
		trunk.bottom_radius = t.z * 0.7
		trunk.height = h
		_add_mesh(root, trunk, bark, Vector3(t.x, h * 0.5, t.y))
		var crown := SphereMesh.new()
		crown.radius = 2.0 + fmod(absf(t.x), 1.0)
		crown.height = crown.radius * 1.7
		_add_mesh(root, crown, leaf, Vector3(t.x, h + 0.6, t.y))

	# Hollow Cairn: stacked stones, green glow and a tall beacon (story marker).
	var cp := OutpostState.DEEPWOOD_MARKER_POS
	var radii := [1.1, 0.85, 0.6]
	var y := 0.0
	for r in radii:
		var rock := CylinderMesh.new()
		rock.top_radius = r * 0.9
		rock.bottom_radius = r
		rock.height = 0.9
		rock.radial_segments = 7
		_add_mesh(root, rock, stone, Vector3(cp.x, y + 0.45, cp.z), Vector3(0.0, y * 40.0, 0.0))
		y += 0.9
	var cairn_light := OmniLight3D.new()
	cairn_light.light_color = green
	cairn_light.light_energy = 1.8
	cairn_light.omni_range = 9.0
	cairn_light.position = cp + Vector3(0.0, 3.0, 0.0)
	root.add_child(cairn_light)
	_beacon(root, cp + Vector3(0.0, 2.7, 0.0), 8.0, green)
	_sign(root, "HOLLOW CAIRN", cp + Vector3(0.0, 6.5, 0.0), green)
	_marker_pickup(root, "deepwood", cp + Vector3(0.0, 0.0, 1.7), green)

	# Elder Tree: a giant glowing tree (optional landmark).
	var ep := OutpostState.ELDER_TREE_POS
	var elder_trunk := CylinderMesh.new()
	elder_trunk.top_radius = 1.4
	elder_trunk.bottom_radius = 2.0
	elder_trunk.height = 13.0
	_add_mesh(root, elder_trunk, bark, Vector3(ep.x, 6.5, ep.z))
	for off in [Vector3(0.0, 15.0, 0.0), Vector3(-3.5, 13.0, 1.5), Vector3(3.5, 13.5, -1.5)]:
		var crown := SphereMesh.new()
		crown.radius = 5.0
		crown.height = 8.0
		_add_mesh(root, crown, leaf_glow, ep + off)
	var tree_light := OmniLight3D.new()
	tree_light.light_color = green
	tree_light.light_energy = 1.5
	tree_light.omni_range = 14.0
	tree_light.position = ep + Vector3(0.0, 6.0, 3.0)
	root.add_child(tree_light)
	_sign(root, "ELDER TREE", ep + Vector3(0.0, 21.0, 0.0), green)


func _build_permafrost_landmarks() -> void:
	var root := Node3D.new()
	root.name = "Permafrost"
	add_child(root)
	var ice := _mat(Color(0.55, 0.80, 0.95), 0.5, 0.2)
	var ice_deep := _mat(Color(0.30, 0.55, 0.78), 0.3, 0.25)
	var blue := Color(0.55, 0.85, 1.0)

	for t in OutpostState.ICE_SPIKES:
		var spike := CylinderMesh.new()
		spike.top_radius = 0.0
		spike.bottom_radius = t.z * 1.1
		spike.height = 3.0 + fmod(absf(t.x * 1.7 + t.y), 3.0)
		spike.radial_segments = 5
		_add_mesh(root, spike, ice if int(absf(t.x)) % 2 == 0 else ice_deep,
				Vector3(t.x, spike.height * 0.5, t.y), Vector3(0.0, t.x * 13.0, 0.0))

	# Frost Obelisk: tall faceted pillar with a cold beacon (story marker).
	var op := OutpostState.PERMAFROST_MARKER_POS
	var obelisk := CylinderMesh.new()
	obelisk.top_radius = 0.25
	obelisk.bottom_radius = 0.9
	obelisk.height = 7.0
	obelisk.radial_segments = 4
	_add_mesh(root, obelisk, _mat(Color(0.45, 0.72, 0.95), 1.2, 0.15), Vector3(op.x, 3.5, op.z),
			Vector3(0.0, 45.0, 0.0))
	var cap := CylinderMesh.new()
	cap.top_radius = 0.0
	cap.bottom_radius = 0.28
	cap.height = 0.9
	cap.radial_segments = 4
	_add_mesh(root, cap, ice, Vector3(op.x, 7.4, op.z), Vector3(0.0, 45.0, 0.0))
	var obelisk_light := OmniLight3D.new()
	obelisk_light.light_color = blue
	obelisk_light.light_energy = 1.8
	obelisk_light.omni_range = 9.0
	obelisk_light.position = op + Vector3(0.0, 3.0, 0.0)
	root.add_child(obelisk_light)
	_beacon(root, op + Vector3(0.0, 7.8, 0.0), 6.0, blue)
	_sign(root, "FROST OBELISK", op + Vector3(0.0, 10.5, 0.0), blue)
	_marker_pickup(root, "permafrost", op + Vector3(0.0, 0.0, 1.7), blue)

	# Glacier Spire: a huge ice cone (optional landmark).
	var gp := OutpostState.GLACIER_SPIRE_POS
	var spire := CylinderMesh.new()
	spire.top_radius = 0.0
	spire.bottom_radius = 3.2
	spire.height = 18.0
	spire.radial_segments = 6
	_add_mesh(root, spire, ice, Vector3(gp.x, 9.0, gp.z))
	for off in [Vector3(-3.4, 0.0, 1.5), Vector3(3.0, 0.0, 2.2), Vector3(0.5, 0.0, -3.4)]:
		var shard := CylinderMesh.new()
		shard.top_radius = 0.0
		shard.bottom_radius = 1.2
		shard.height = 6.0
		shard.radial_segments = 5
		_add_mesh(root, shard, ice_deep, gp + off + Vector3(0.0, 3.0, 0.0),
				Vector3(off.x * 3.0, 0.0, off.z * 3.0))
	var spire_light := OmniLight3D.new()
	spire_light.light_color = blue
	spire_light.light_energy = 1.5
	spire_light.omni_range = 14.0
	spire_light.position = gp + Vector3(0.0, 5.0, 3.0)
	root.add_child(spire_light)
	_sign(root, "GLACIER SPIRE", gp + Vector3(0.0, 21.0, 0.0), blue)


func _build_dungeon() -> void:
	var root := Node3D.new()
	root.name = "Dungeon"
	add_child(root)
	var hx := OutpostState.DUNGEON_HALF_X
	var z0 := OutpostState.DUNGEON_MIN_Z
	var z1 := OutpostState.DUNGEON_MAX_Z
	var floor_plane := PlaneMesh.new()
	floor_plane.size = Vector2(hx * 2.0 + 4.0, z1 - z0 + 4.0)
	_add_mesh(root, floor_plane, _mat(Color(0.10, 0.09, 0.14), 0.0, 0.7), Vector3(0.0, 0.0, (z0 + z1) * 0.5))

	var wall_mat := _mat(Color(0.13, 0.12, 0.19), 0.0, 0.75)
	var side := BoxMesh.new()
	side.size = Vector3(1.2, 3.5, z1 - z0 + 3.0)
	_add_mesh(root, side, wall_mat, Vector3(-hx - 1.0, 1.75, (z0 + z1) * 0.5))
	_add_mesh(root, side, wall_mat, Vector3(hx + 1.0, 1.75, (z0 + z1) * 0.5))
	var cross := BoxMesh.new()
	cross.size = Vector3(hx * 2.0 + 3.2, 3.5, 1.2)
	_add_mesh(root, cross, wall_mat, Vector3(0.0, 1.75, z0 - 1.0))
	_add_mesh(root, cross, wall_mat, Vector3(0.0, 1.75, z1 + 1.0))

	for o in OutpostState.DUNGEON_OBSTACLES:
		if o.z >= 0.8 and o.z < 1.0:
			_column(root, Vector3(o.x, 0.0, o.y), o.z, 5.0, _mat(Color(0.17, 0.15, 0.25), 0.0, 0.7))

	# Dormant core on its plinth.
	var cp := OutpostState.DUNGEON_CORE_POS
	var plinth := CylinderMesh.new()
	plinth.top_radius = 1.0
	plinth.bottom_radius = 1.3
	plinth.height = 1.0
	plinth.radial_segments = 8
	_add_mesh(root, plinth, wall_mat, Vector3(cp.x, 0.5, cp.z - 1.5))
	var core := SphereMesh.new()
	core.radius = 0.6
	core.height = 1.2
	_add_mesh(root, core, _mat(Color(0.45, 0.25, 0.75), 0.9, 0.3), Vector3(cp.x, 2.0, cp.z - 1.5))
	var core_light := OmniLight3D.new()
	core_light.light_color = Color(0.62, 0.38, 0.95)
	core_light.light_energy = 1.5
	core_light.omni_range = 12.0
	core_light.position = Vector3(cp.x, 3.0, cp.z - 1.0)
	root.add_child(core_light)
	_sign(root, "DORMANT CORE", Vector3(cp.x, 4.6, cp.z - 1.5), Color(0.78, 0.62, 1.0))

	# Exit portal back to the frontier gate.
	var xp := OutpostState.DUNGEON_EXIT_POS
	var quad := QuadMesh.new()
	quad.size = Vector2(3.0, 3.2)
	var pm := _mat(Color(0.55, 0.30, 0.85), 2.0, 0.2)
	pm.albedo_color.a = 0.6
	pm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	pm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	_add_mesh(root, quad, pm, Vector3(xp.x, 1.6, xp.z + 0.6))
	var portal_glow := OmniLight3D.new()
	portal_glow.light_color = Color(0.62, 0.38, 0.95)
	portal_glow.light_energy = 2.0
	portal_glow.omni_range = 10.0
	portal_glow.position = Vector3(xp.x, 2.5, xp.z - 0.5)
	root.add_child(portal_glow)
	_sign(root, "EXIT PORTAL", Vector3(xp.x, 4.4, xp.z), Color(0.80, 0.68, 1.0))

	var hall_light := OmniLight3D.new()
	hall_light.light_color = Color(0.55, 0.45, 0.85)
	hall_light.light_energy = 1.0
	hall_light.omni_range = 22.0
	hall_light.position = Vector3(0.0, 6.0, -76.0)
	root.add_child(hall_light)


func _build_quest_master() -> void:
	quest_master = Node3D.new()
	quest_master.name = "QuestMaster"
	quest_master.position = OutpostState.QUEST_MASTER_POS
	quest_master.rotation_degrees.y = 40.0
	add_child(quest_master)
	var cloak := CylinderMesh.new()
	cloak.top_radius = 0.28
	cloak.bottom_radius = 0.75
	cloak.height = 1.9
	_add_mesh(quest_master, cloak, _mat(Color(0.10, 0.09, 0.15)), Vector3(0.0, 0.95, 0.0))
	var head := SphereMesh.new()
	head.radius = 0.26
	head.height = 0.52
	_add_mesh(quest_master, head, _mat(Color(0.06, 0.05, 0.09)), Vector3(0.0, 2.1, 0.0))  # face in shadow
	var lantern := SphereMesh.new()
	lantern.radius = 0.12
	lantern.height = 0.24
	_add_mesh(quest_master, lantern, _mat(Color(0.85, 0.62, 0.45), 2.0), Vector3(0.7, 1.1, 0.4))
	var l := OmniLight3D.new()
	l.light_color = Color(0.85, 0.62, 0.45)
	l.light_energy = 1.0
	l.omni_range = 6.0
	l.position = Vector3(0.7, 1.2, 0.4)
	quest_master.add_child(l)


func _build_player() -> void:
	player = Node3D.new()
	player.name = "Adventurer"
	add_child(player)
	var body := CapsuleMesh.new()
	body.radius = 0.38
	body.height = 1.5
	_add_mesh(player, body, _mat(Color(0.18, 0.36, 0.40)), Vector3(0.0, 0.85, 0.0))
	var head := SphereMesh.new()
	head.radius = 0.25
	head.height = 0.5
	_add_mesh(player, head, _mat(Color(0.62, 0.52, 0.48)), Vector3(0.0, 1.8, 0.0))
	var cape := BoxMesh.new()
	cape.size = Vector3(0.7, 1.2, 0.08)
	_add_mesh(player, cape, _mat(Color(0.30, 0.16, 0.26)), Vector3(0.0, 1.1, -0.38))
	var nose := BoxMesh.new()
	nose.size = Vector3(0.14, 0.14, 0.2)  # marks the facing (+Z local)
	_add_mesh(player, nose, _mat(Color(0.45, 0.38, 0.36)), Vector3(0.0, 1.8, 0.28))
	# One floating tag per carried survey record (green Deepwood, blue Permafrost).
	var tag := BoxMesh.new()
	tag.size = Vector3(0.35, 0.05, 0.25)
	carried_markers["deepwood"] = _add_mesh(player, tag, _mat(Color(0.45, 0.95, 0.60), 1.2),
			Vector3(-0.25, 2.3, 0.0))
	carried_markers["permafrost"] = _add_mesh(player, tag, _mat(Color(0.55, 0.85, 1.0), 1.2),
			Vector3(0.25, 2.3, 0.0))


func _build_camera() -> void:
	camera = Camera3D.new()
	camera.name = "Camera"
	camera.fov = 55.0
	camera.current = true
	add_child(camera)


# ---------------------------------------------------------------- UI

func _label(text: String, size: int, color: Color = Color(0.92, 0.90, 0.96)) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	l.add_theme_color_override("font_outline_color", Color(0.04, 0.03, 0.08))
	l.add_theme_constant_override("outline_size", 6)
	return l


func _build_ui() -> void:
	var layer := CanvasLayer.new()
	add_child(layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(root)

	objective_label = _label("", 22)
	objective_label.position = Vector2(24.0, 18.0)
	root.add_child(objective_label)

	toast_label = _label("", 22, Color(0.80, 0.72, 0.98))
	toast_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	toast_label.offset_top = -112
	toast_label.offset_bottom = -52
	toast_label.offset_left = 20
	toast_label.offset_right = -20
	toast_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(toast_label)

	hint_label = _label("", 18, Color(0.78, 0.76, 0.86))
	hint_label.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	hint_label.offset_top = -44.0
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(hint_label)

	dialogue_panel = PanelContainer.new()
	dialogue_panel.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	dialogue_panel.offset_left = 120.0
	dialogue_panel.offset_right = -120.0
	dialogue_panel.offset_top = -210.0
	dialogue_panel.offset_bottom = -60.0
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.08, 0.07, 0.13, 0.92)
	style.border_color = Color(0.45, 0.35, 0.65)
	style.set_border_width_all(2)
	style.set_corner_radius_all(6)
	style.set_content_margin_all(16)
	dialogue_panel.add_theme_stylebox_override("panel", style)
	root.add_child(dialogue_panel)
	var box := VBoxContainer.new()
	dialogue_panel.add_child(box)
	speaker_label = _label(OutpostState.INTRO_SPEAKER, 20, Color(0.75, 0.62, 0.98))
	box.add_child(speaker_label)
	line_label = _label("", 24)
	line_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	line_label.custom_minimum_size = Vector2(800.0, 0.0)
	box.add_child(line_label)
	continue_label = _label("", 16, Color(0.65, 0.63, 0.75))
	box.add_child(continue_label)

	region_label = _label("", 20, Color(0.75, 0.88, 0.80))
	region_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	region_label.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	region_label.position = Vector2(-24.0, 18.0)
	region_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	root.add_child(region_label)

	landmark_label = _label("", 16, Color(0.82, 0.80, 0.92))
	landmark_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	landmark_label.grow_horizontal = Control.GROW_DIRECTION_BEGIN
	landmark_label.position = Vector2(-24.0, 52.0)
	landmark_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	root.add_child(landmark_label)
