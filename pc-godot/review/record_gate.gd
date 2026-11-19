extends SceneTree

const State = preload("res://scripts/outpost_state.gd")
var scene
var guard
var cue := Label.new()
var failed := false

func _initialize() -> void:
	run.call_deferred()

func frames(n: int) -> void:
	for i in n:
		await physics_frame

func move(action: String, n: int) -> void:
	Input.action_press(action)
	await frames(n)
	Input.action_release(action)

func interact() -> void:
	var e := InputEventAction.new()
	e.action = "interact"
	e.pressed = true
	scene._unhandled_input(e)

func verify(ok: bool, label: String) -> void:
	print("PASS " if ok else "FAIL ",label)
	failed = failed or not ok

func run() -> void:
	scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	guard = scene.get_node("StoneWatch")
	var doc := GLTFDocument.new()
	var data := GLTFState.new()
	if doc.append_from_file("res://build/gate-review/aqueduct.glb",data) != OK:
		quit(1)
		return
	var gate = scene.get_node("Gate")
	for part in gate.get_children():
		if part is MeshInstance3D:
			part.hide()
	gate.add_child(doc.generate_scene(data))
	var layer := CanvasLayer.new()
	root.add_child(layer)
	layer.add_child(cue)
	cue.position = Vector2(24, 490)
	cue.add_theme_constant_override("outline_size", 6)
	cue.add_theme_font_size_override("font_size", 23)
	scene.state.skip_intro()
	cue.text = "Watch the arch opening as the player approaches."
	await frames(35)
	await move("move_forward",163)
	await frames(30)
	await RenderingServer.frame_post_draw
	root.get_texture().get_image().save_png("res://build/gate-review/threshold.png")
	await move("move_forward",16)
	verify(absf(scene.state.player_pos.z - State.GATE_POS.z) < 1.4,"Walk through center of gate")
	interact()
	verify(scene.state.location == State.Location.DUNGEON,"Enter dungeon")
	cue.text = "Watch for the Stone Watch to mark the floor."
	Input.action_press("move_forward")
	for tick in 210:
		await physics_frame
		if guard.warning.visible:
			break
	Input.action_release("move_forward")
	verify(guard.warning.visible,"Visible windup")
	var health: int = guard.hp
	cue.text = "Step back before the ring closes."
	await move("move_back",48)
	await frames(23)
	verify(not guard.warning.visible and guard.hp == health and guard.hp == 3,"Strike resolved with no damage")
	cue.text = "Return through the exit with full health."
	Input.action_press("move_back")
	for tick in 220:
		await physics_frame
		if scene.state.nearby_target() == "exit":
			break
	Input.action_release("move_back")
	interact()
	verify(scene.state.location == State.Location.FRONTIER,"Return to frontier")
	await frames(60)
	quit(1 if failed else 0)
