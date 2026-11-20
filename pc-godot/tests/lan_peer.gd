extends SceneTree
## Two independent instances use production ENet for all game state.
## The test runner uses a fresh directory only for barriers between assertions.
var game
var lan
var role: String
var folder: String
var peer_role: String
var failed := false
const State = preload("res://scripts/outpost_state.gd")

func _initialize() -> void:
	run.call_deferred()

func marker(name_: String, side: String) -> String:
	return folder.path_join(side + "-" + name_)

func mark(name_: String) -> void:
	var f := FileAccess.open(marker(name_, role), FileAccess.WRITE)
	f.store_string("ok")

func expect(test: Callable, label: String, seconds := 8.0) -> bool:
	var deadline := Time.get_ticks_msec() + int(seconds * 1000)
	while not test.call():
		if Time.get_ticks_msec() >= deadline:
			printerr("FAIL ", role, " ", label)
			failed = true
			return false
		await physics_frame
	print("PASS ", role, " ", label)
	return true

func barrier(label: String) -> bool:
	mark(label)
	return await expect(func(): return FileAccess.file_exists(marker(label,peer_role)),label)

func action(name_: String) -> void:
	var event := InputEventAction.new()
	event.action = name_
	event.pressed = true
	game._unhandled_input(event)

func strike() -> void:
	var event := InputEventKey.new()
	event.physical_keycode = KEY_F
	event.pressed = true
	Input.parse_input_event(event)

func stop() -> void:
	for name_ in ["move_forward","move_back","move_left","move_right"]:
		Input.action_release(name_)

func walk(target: Vector2) -> bool:
	var deadline := Time.get_ticks_msec() + 12000
	while Time.get_ticks_msec() < deadline:
		var pos: Vector3 = game.state.player_pos
		var delta := target - Vector2(pos.x,pos.z)
		stop()
		if delta.length() < 0.45:
			return true
		var axis := delta.normalized()
		Input.action_press("move_right" if axis.x > 0 else "move_left",absf(axis.x))
		Input.action_press("move_back" if axis.y > 0 else "move_forward",absf(axis.y))
		await physics_frame
	stop()
	printerr("FAIL ",role," walking toward ",target," at ",game.state.player_pos)
	return false

func exercise() -> bool:
	if not await expect(func(): return lan.connected and is_instance_valid(lan.remote_player),"connected remote avatar"):
		return false
	action("skip_intro")
	if not await expect(func(): return game.state.can_move(),"intro released"):
		return false
	var pos: Vector3 = game.state.player_pos
	var other: Vector3 = lan.remote_player.position
	if not await barrier("start_positions"):
		return false
	var side := -1 if role == "host" else 1
	if not await walk(Vector2(pos.x+side*2,pos.z)):
		return false
	if not await expect(func(): return (lan.remote_player.position.x-other.x)*-side > 1.1,"observed peer lateral movement"):
		return false
	if not await barrier("movement"):
		return false
	# Both walk the east route. Only the guest interacts with the marker.
	var x := State.PERMAFROST_MARKER_POS.x + side * 0.45
	for target in [Vector2(game.state.player_pos.x,12), Vector2(x,12), Vector2(x,-7.0)]:
		if not await walk(target):
			return false
	if not await barrier("at_survey_marker"):
		return false
	if role == "guest":
		action("interact")
	if not await expect(func(): return game.state.collected.has("permafrost") and not game.marker_nodes["permafrost"].visible and game.objective_label.text.contains("[x] Permafrost"),"guest pickup removed and objective checked"):
		return false
	if not await barrier("shared_pickup"):
		return false
	for target in [Vector2(x,12),Vector2(0,12),Vector2(0,-8)]:
		if not await walk(target):
			return false
	if not game.state.collected.has("permafrost"):
		return false
	if not await barrier("at_gate"):
		return false
	if role == "host":
		action("interact")
	if not await expect(func(): return game.state.location == State.Location.DUNGEON,"shared dungeon transition"):
		return false
	var guard = game.get_node("StoneWatch")
	for target in [Vector2(side*0.6,-75), Vector2(side*0.6,-81)]:
		if not await walk(target):
			return false
	if not await barrier("in_melee"):
		return false
	if role == "guest":
		strike()
	if not await expect(func(): return guard.guard_hp == 2,"guest hit synchronized"):
		return false
	if DisplayServer.get_name() != "headless":
		await RenderingServer.frame_post_draw
		var objective: Label = game.objective_label
		if objective.get_visible_line_count() < objective.get_line_count() or not objective.text.contains("[x] Permafrost"):
			printerr("FAIL ", role, " clipped or missing survey progress")
			return false
		if root.get_texture().get_image().save_png(folder.path_join(role + "-combat.png")) != OK:
			return false
	if not await barrier("first_hit"):
		return false
	if role == "host":
		strike()
	if not await expect(func(): return guard.guard_hp == 1,"host hit synchronized"):
		return false
	if not await barrier("second_hit"):
		return false
	await create_timer(0.5).timeout
	if role == "guest":
		strike()
	if not await expect(func(): return guard.guard_hp == 0,"shared guardian defeat"):
		return false
	if not await barrier("guardian_down"):
		return false
	if role == "host":
		if not await expect(func(): return not lan.connected,"peer disconnect observed"):
			return false
	return true

func run() -> void:
	var args := OS.get_cmdline_user_args()
	role = args[0]
	folder = args[1]
	peer_role = "guest" if role == "host" else "host"
	game = load("res://scenes/main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	lan = game.get_node("LAN")
	if role == "host":
		lan.host_game(int(args[2]))
		mark("listening")
	else:
		lan.join_game("127.0.0.1",int(args[2]))
	var ok: bool = await exercise()
	print("LAN_RESULT ",role," ", "PASS" if ok else "FAIL")
	quit(0 if ok else 1)
