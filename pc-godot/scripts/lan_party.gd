extends Node

const State = preload("res://scripts/outpost_state.gd")
const PORT := 43819
var connected := false
var role := "solo"
var guest = State.new()
var peer_id := 0
var remote_player: Node3D
var host_target := Vector3.ZERO
var first_snapshot := true
var guest_axis := Vector2.ZERO
var axis_age := 0.0
var guest_hp := 3
var guest_swing := 0.0
var elapsed := 0.0
var menu := VBoxContainer.new()
var address := LineEdit.new()
var notice := Label.new()
var toggle := Button.new()
var other_blade: MeshInstance3D
var host_button := Button.new()
var join_button := Button.new()
var leave_button := Button.new()
var last_action_frame := -1
@onready var game = get_parent()
@onready var guard = get_parent().get_node("StoneWatch")

func _ready() -> void:
	multiplayer.peer_connected.connect(_joined)
	multiplayer.peer_disconnected.connect(_lost_peer)
	multiplayer.connected_to_server.connect(_joined_server)
	multiplayer.connection_failed.connect(_failed)
	multiplayer.server_disconnected.connect(_failed)
	menu.hide()
	setup.call_deferred()

func setup() -> void:
	remote_player = game.player.duplicate()
	game.add_child(remote_player)
	remote_player.hide()
	for id in game.carried_markers:
		var original: Node3D = game.carried_markers[id]
		var copy := remote_player.get_node_or_null(game.player.get_path_to(original))
		if copy:
			copy.hide()
	var badge := Label3D.new()
	badge.text = "Party member"
	badge.position.y = 2.7
	badge.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	remote_player.add_child(badge)
	other_blade = guard.blade.duplicate()
	game.add_child(other_blade)
	other_blade.hide()
	var hud := CanvasLayer.new()
	add_child(hud)
	hud.add_child(toggle)
	toggle.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_RIGHT)
	toggle.offset_left = -140
	toggle.offset_top = -42
	toggle.offset_right = -10
	toggle.text = "LAN party"
	toggle.focus_mode = Control.FOCUS_NONE
	toggle.pressed.connect(func(): menu.visible = not menu.visible)


	menu.add_theme_constant_override("separation", 5)
	hud.add_child(menu)
	menu.set_anchors_and_offsets_preset(Control.PRESET_CENTER)
	menu.offset_left = -140
	menu.offset_top = -94
	menu.custom_minimum_size.x = 280
	address.placeholder_text = "Host PC's LAN IPv4 address"
	menu.add_child(address)
	for button in [host_button,join_button,leave_button]:
		menu.add_child(button)
	host_button.text = "Host LAN game"
	host_button.pressed.connect(func(): host_game())
	join_button.text = "Join host"
	join_button.pressed.connect(func(): join_game(address.text.strip_edges()))
	leave_button.text = "Leave LAN game"
	leave_button.pressed.connect(func(): leave("Solo play"))
	menu.add_child(notice)
	menu.hide()
	update_buttons()
	var args := OS.get_cmdline_user_args()
	var port := PORT
	for arg in args:
		if arg.begins_with("--port="):
			port = arg.trim_prefix("--port=").to_int()
	for arg in args:
		if role != "solo":
			break
		if arg == "--host":
			host_game(port)
		if arg.begins_with("--join="):
			join_game(arg.trim_prefix("--join="),port)

func update_buttons() -> void:
	host_button.disabled = role != "solo"
	join_button.disabled = role != "solo"
	leave_button.disabled = role == "solo"
	address.editable = role == "solo"

func host_game(port: int = PORT) -> Error:
	if role != "solo":
		return ERR_ALREADY_IN_USE
	var net := ENetMultiplayerPeer.new()
	var err := net.create_server(port,1)
	if err != OK:
		notice.text = "Could not open UDP port %d" % port
		return err
	role = "host"
	multiplayer.multiplayer_peer = net
	notice.text = "Waiting on UDP %d" % port
	toggle.text = "Hosting (1/2)"
	menu.hide()
	update_buttons()
	return OK

func join_game(ip: String, port: int = PORT) -> Error:
	if role != "solo" or not ip.is_valid_ip_address():
		notice.text = "Enter the host PC's LAN address."
		return ERR_INVALID_PARAMETER
	var net := ENetMultiplayerPeer.new()
	var err := net.create_client(ip,port)
	if err != OK:
		notice.text = "Could not start connection."
		return err
	role = "guest"
	first_snapshot = true
	game.clear_patrols()
	multiplayer.multiplayer_peer = net
	toggle.text = "Connecting..."
	menu.hide()
	update_buttons()
	return OK

func _joined(id: int) -> void:
	if role != "host":
		return
	peer_id = id
	guest = State.new()
	guest.region_entered.connect(game.spawn_patrol)
	copy_progress(game.state,guest)
	guest.player_pos = game.state._resolve(game.state.player_pos + Vector3(1,0,0))
	guest_axis = Vector2.ZERO
	guest_hp = 3
	guest_swing = 0
	connected = true
	toggle.text = "LAN party (2/2)"
	notice.text = "Party member joined."

func _joined_server() -> void:
	connected = true
	toggle.text = "LAN party (2/2)"
	notice.text = "Connected to host."

func _lost_peer(_id: int) -> void:
	if role == "host":
		connected = false
		peer_id = 0
		guest_axis = Vector2.ZERO
		remote_player.hide()
		other_blade.hide()
		toggle.text = "Hosting (1/2)"
		notice.text = "Party member left."

func _failed() -> void:
	leave("Connection ended. Check the host address and UDP port.")
	menu.show()

func leave(reason: String) -> void:
	var was_guest := role == "guest"
	role = "solo"
	connected = false
	peer_id = 0
	guest_axis = Vector2.ZERO
	multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	if remote_player:
		remote_player.hide()
		other_blade.hide()
	if was_guest:
		game.clear_patrols()
		game.state.reset()
		guard.reset_encounter()
	toggle.text = "LAN party"
	notice.text = reason
	update_buttons()

func copy_progress(a, b) -> void:
	b.collected = a.collected.duplicate()
	b.delivered = a.delivered
	b.phase = a.phase
	b.line_index = a.line_index
	b.location = a.location

func local_action(action: String) -> void:
	if role == "guest":
		if connected:
			request_action.rpc_id(1,action)
	elif action == "strike":
		if game.state.location == State.Location.FRONTIER:
			game.strike_patrol(game.state.player_pos)
		else:
			guard.strike()
	else:
		act(game.state,action)

func act(actor, action: String) -> void:
	var previous: int = actor.location
	match action:
		"interact":
			actor.interact()
		"skip_intro":
			if actor != game.state:
				return
			actor.skip_intro()
		"restart":
			if actor != game.state:
				return
			game.clear_patrols()
			actor.reset()
			guest.reset()
			guest.player_pos += Vector3.RIGHT
			guest_hp = 3
			guest_swing = 0
			guard.reset_encounter()
		_:
			return
	var other = guest if actor == game.state else game.state
	copy_progress(actor,other)
	if previous != actor.location:
		other.player_pos = actor.player_pos + Vector3.RIGHT
		other.region = actor.region
	if actor.message != "":
		other.set_message(actor.message)

@rpc("any_peer","call_remote","unreliable_ordered",1)
func steering(axis: Vector2) -> void:
	if role == "host" and multiplayer.get_remote_sender_id() == peer_id and axis.is_finite():
		guest_axis = axis.limit_length()
		axis_age = 0

@rpc("any_peer","call_remote","reliable",2)
func request_action(action: String) -> void:
	if role != "host" or multiplayer.get_remote_sender_id() != peer_id or last_action_frame == Engine.get_physics_frames():
		return
	last_action_frame = Engine.get_physics_frames()
	if action == "interact" and guest.phase != State.Phase.INTRO:
		act(guest,action)
	if action == "strike" and guest.location == State.Location.FRONTIER and guest_swing <= 0:
		guest_swing = 0.32
		game.strike_patrol(guest.player_pos)
	if action == "strike" and guest.location == State.Location.DUNGEON and guest_swing <= 0 and guard.guard_hp > 0:
		guest_swing = 0.32
		guard.hit_from(guest.player_pos)

func _physics_process(dt: float) -> void:
	if not connected or not remote_player:
		return
	elapsed += dt
	if role == "guest":
		if elapsed >= 0.033:
			elapsed = 0
			var axis := Input.get_vector("move_left","move_right","move_forward","move_back")
			steering.rpc_id(1,Vector2.ZERO if menu.visible else axis)
		return
	axis_age += dt
	guest_swing = maxf(0, guest_swing-dt)
	guest.move(guest_axis if axis_age < 0.35 else Vector2.ZERO,dt)
	guest.region = State.region_at(guest.player_pos)
	pose_remote(guest.player_pos,guest.facing,guest_swing)
	if elapsed >= 0.05:
		elapsed = 0
		var s = game.state
		var packs := {}
		for zone in game.patrols:
			packs[zone] = game.patrols[zone].position
		snapshot.rpc_id(peer_id,{"packs":packs,"p":guest.player_pos,"f":guest.facing,"host":s.player_pos,"hf":s.facing,
			"phase":s.phase,"line":s.line_index,"loc":s.location,"col":s.collected,"del":s.delivered,
			"visit":guest.visited,"msg":s.message,"hp":guest_hp,"gh":guard.guard_hp,"g":guard.guardian.position,
			"ring":guard.windup,"impact":guard.impact,"swing":guest_swing,"hs":guard.swing})

func pose_remote(p: Vector3, f: Vector3, swing: float) -> void:
	remote_player.show()
	remote_player.position = p
	remote_player.rotation.y = atan2(f.x,f.z)
	other_blade.visible = swing > 0.12
	other_blade.rotation.y = remote_player.rotation.y + (swing-0.22)*9
	other_blade.position = p + Vector3.UP + other_blade.transform.basis.z

@rpc("authority","call_remote","unreliable_ordered",3)
func snapshot(d: Dictionary) -> void:
	if role != "guest":
		return
	var s = game.state
	s.player_pos = d.p
	s.facing = d.f
	s.phase = d.phase
	s.line_index = d.line
	s.location = d.loc
	s.region = State.region_at(d.p)
	s.collected = d.col
	s.delivered = d.del
	s.visited = d.visit
	s.message = d.msg
	for zone in game.patrols.keys():
		if not d.packs.has(zone):
			game.patrols[zone].queue_free()
			game.patrols.erase(zone)
	for zone in d.packs:
		if not game.patrols.has(zone):
			game.spawn_patrol(zone,d.packs[zone])
		game.patrols[zone].position = d.packs[zone]
	host_target = d.host
	if first_snapshot or game.player.position.distance_to(d.p) > 5:
		game.player.position = d.p
	if first_snapshot or remote_player.position.distance_to(d.host) > 5:
		remote_player.position = d.host
	first_snapshot = false
	pose_remote(remote_player.position,d.hf,d.hs)
	guard.hp = d.hp
	guard.guard_hp = d.gh
	guard.guardian.position = d.g
	guard.impact = d.impact
	guard.windup = d.ring
	guard.swing = d.swing
	guard.active = s.location == State.Location.DUNGEON
	guard.visible = guard.active
	guard.status.visible = guard.active
	guard.guardian.visible = d.gh > 0
	guard.warning.visible = d.ring >= 0
	guard.warning.position = d.impact + Vector3.UP*0.08
	guard.blade.visible = d.swing > 0.12
	guard.blade.rotation.y = atan2(s.facing.x,s.facing.z) + (d.swing-0.22)*9
	guard.blade.position = s.player_pos + Vector3.UP + guard.blade.transform.basis.z
	guard.refresh_status()
