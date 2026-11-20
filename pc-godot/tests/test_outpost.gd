extends SceneTree

const State = preload("res://scripts/outpost_state.gd")
var scene
var failures := 0

func check(value: bool, label: String) -> void:
	if not value:
		failures += 1
		printerr("FAIL ", label)
	else:
		print("PASS ", label)

func _initialize() -> void:
	run.call_deferred()

func press(action: String) -> void:
	var event := InputEventAction.new()
	event.action = action
	event.pressed = true
	scene._unhandled_input(event)

func walk(x: float, z: float) -> void:
	var goal := Vector2(x, z)
	for frame in 1200:
		var pos: Vector3 = scene.state.player_pos
		var delta := goal - Vector2(pos.x, pos.z)
		if delta.length() < 0.15:
			return
		var axis := delta.normalized()
		for action in ["move_left","move_right","move_forward","move_back"]:
			Input.action_release(action)
		Input.action_press("move_left" if axis.x < 0 else "move_right", absf(axis.x))
		Input.action_press("move_forward" if axis.y < 0 else "move_back", absf(axis.y))
		scene._physics_process(1.0 / 30)
	check(false, "Walk to " + str(goal))

func run() -> void:
	scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	var s = scene.state
	scene._apply_hud_layout(Vector2(800, 450))
	check(scene.compact_hud, "Compact HUD activates at 800x450")
	check(scene.objective_label.size.x <= 320 and scene.landmark_label.size.x <= 300, "Compact HUD reserves separate objective and landmark columns")
	check(scene._landmark_text(true).split("\n").size() <= 4, "Compact HUD limits landmark rows")
	scene._apply_hud_layout(Vector2(1280, 720))
	check(not scene.compact_hud, "Full HUD restores at 1280x720")
	for side in [-1, 1]:
		press("restart")
		check(s.phase == State.Phase.INTRO and s.collected.is_empty(), "Fresh charter")
		press("skip_intro")
		for sign_x in [side, -side]:
			var dest: Vector3 = State.DEEPWOOD_MARKER_POS if sign_x < 0 else State.PERMAFROST_MARKER_POS
			walk(s.player_pos.x, 12)
			walk(dest.x, 12)
			walk(dest.x, dest.z + 2)
			press("interact")
			var count: int = s.collected.size()
			press("interact")
			check(s.collected.size() == count and s.collected.has("deepwood" if sign_x < 0 else "permafrost"), "Survey pickup once")
		walk(s.player_pos.x, 12)
		walk(-4, 12)
		walk(-4, 6)
		press("interact")
		check(s.delivered and s.can_move(), "Delivery permits continued exploration")
		walk(0, 6)
		walk(0, -8)
		press("interact")
		check(s.location == State.Location.DUNGEON, "Enter the northern dungeon")
		walk(0, -84)
		check(s.nearby_target() == "core", "Reach dungeon core")
		var guard = scene.get_node("StoneWatch")
		guard.reset_encounter()
		for frame in 60:
			guard._physics_process(1.0 / 60)
		check(guard.warning.visible and guard.hp == 3, "Attack telegraphed before damage")
		for frame in 64:
			guard._physics_process(1.0 / 60)
		check(guard.hp == 2, "Standing in strike loses one health")
		for hit in 3:
			guard.strike()
			for frame in 21:
				guard._physics_process(1.0 / 60)
		check(guard.guard_hp == 0 and not guard.guardian.visible, "Three timed strikes defeat Stone Watch")
		press("interact")
		walk(0, -67)
		press("interact")
		check(s.location == State.Location.FRONTIER and s.delivered, "Return with charter progress")
	press("restart")
	press("skip_intro")
	walk(0,12)
	walk(-15,12)
	check(scene.patrols.keys() == ["deepwood"], "Only woodland patrol on western entry")
	var pack = scene.patrols["deepwood"]
	scene.spawn_patrol("deepwood", s.player_pos)
	check(scene.patrols["deepwood"] == pack, "Reentry preserves the same patrol")
	check(not scene.strike_patrol(State.START_POS), "Out-of-range strike misses the patrol")
	check(scene.strike_patrol(pack.position), "In-range strike clears the patrol")
	scene.spawn_patrol("deepwood", s.player_pos)
	check(scene.patrols.is_empty(), "Cleared patrol stays cleared this expedition")
	press("restart")
	check(scene.cleared.is_empty(), "Restart rearms frontier encounters")
	var solid = State.new()
	solid.skip_intro()
	solid.player_pos = Vector3(-2.6, 0, -7)
	solid.move(Vector2.UP, 2)
	check(solid.player_pos.z >= -8.51, "Long step cannot tunnel through gate pillar")
	print("Frontier route failures = ", failures)
	quit(1 if failures else 0)
