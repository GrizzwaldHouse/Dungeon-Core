extends Node3D
## Local PC combat encounter. The guardian telegraphs a ground strike before damage.
const State = preload("res://scripts/outpost_state.gd")
const HOME := Vector3(0, 0, -83)
const RADIUS := 2.8
var hp := 3
var guard_hp := 3
var windup := -1.0
var cooldown := 0.0
var swing := 0.0
var active := false
var guardian := Node3D.new()
var warning := MeshInstance3D.new()
var blade := MeshInstance3D.new()
var status := Label.new()
var impact := Vector3.ZERO

func piece(parent: Node3D, mesh: Mesh, tint: Color, pos: Vector3, size: Vector3) -> MeshInstance3D:
	var part := MeshInstance3D.new()
	part.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = tint
	part.material_override = mat
	parent.add_child(part)
	part.position = pos
	part.scale = size
	return part

func _ready() -> void:
	add_child(guardian)
	var slate := Color("#494454")
	piece(guardian, SphereMesh.new(), slate, Vector3.UP, Vector3(1.7,1.5,1.3))
	for side in [-1,1]:
		var arm := piece(guardian, BoxMesh.new(), Color("#4e3935"), Vector3(side*0.95,1,0), Vector3(0.48,1.35,0.55))
		arm.rotation.z = side * 0.22
	piece(guardian, PrismMesh.new(), Color("#998a87"), Vector3(0,2,0), Vector3(0.85,0.72,0.65))
	var ring := TorusMesh.new()
	ring.inner_radius = RADIUS - 0.12
	ring.outer_radius = RADIUS
	warning.mesh = ring
	var amber := StandardMaterial3D.new()
	amber.albedo_color = Color("#dc8858")
	warning.material_override = amber
	add_child(warning)
	var sword := BoxMesh.new()
	sword.size = Vector3(0.12,0.16,2.1)
	blade.mesh = sword
	add_child(blade)
	var hud := CanvasLayer.new()
	add_child(hud)
	hud.add_child(status)
	status.position = Vector2(24,152)
	status.add_theme_constant_override("outline_size",5)
	reset_encounter()

func reset_encounter() -> void:
	hp = 3
	guard_hp = 3
	windup = -1
	cooldown = 0.5
	swing = 0
	guardian.position = HOME
	hide()
	status.hide()
	active = false

func _unhandled_key_input(event: InputEvent) -> void:
	if active and event is InputEventKey and event.pressed and not event.echo and event.physical_keycode == KEY_F:
		strike()

func strike() -> void:
	if not active or guard_hp <= 0 or swing > 0:
		return
	swing = 0.32
	if guardian.position.distance_to(get_parent().state.player_pos) <= 2.9:
		guard_hp -= 1
		if guard_hp == 0:
			windup = -1
			get_parent().state.set_message("The stone watch falls silent. The path to the core is clear.")

func _physics_process(dt: float) -> void:
	var s = get_parent().state
	if s.phase == State.Phase.INTRO:
		if active or guard_hp != 3:
			reset_encounter()
		return
	active = s.location == State.Location.DUNGEON
	visible = active
	status.visible = active
	if not active:
		windup = -1
		swing = 0
		return
	var p: Vector3 = s.player_pos
	swing = maxf(0,swing-dt)
	blade.visible = swing > 0.12
	blade.rotation.y = atan2(s.facing.x,s.facing.z) + (swing-0.22)*9
	blade.position = p + Vector3.UP + blade.transform.basis.z
	guardian.visible = guard_hp > 0
	if guard_hp > 0:
		if windup >= 0:
			windup -= dt
			if windup < 0:
				if p.distance_to(impact) <= RADIUS:
					hp -= 1
				cooldown = 1
		elif cooldown > 0:
			cooldown -= dt
		elif guardian.position.distance_to(p) <= 2.6:
			impact = guardian.position
			windup = 0.95
		elif guardian.position.distance_to(p) < 11:
			guardian.position = guardian.position.move_toward(p, dt*1.8)
	warning.visible = windup >= 0
	warning.position = impact + Vector3.UP*0.08
	if hp <= 0:
		s.player_pos = State.DUNGEON_ENTRY_POS
		reset_encounter()
		s.set_message("You recover at the threshold. Step outside the circle before the blow.")
		return
	status.text = "Health %d/3   |   Stone Watch %d/3   |   F: strike   |   Move clear of the ring" % [hp,guard_hp]
