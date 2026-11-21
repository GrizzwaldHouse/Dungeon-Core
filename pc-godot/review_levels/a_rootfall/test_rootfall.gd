extends SceneTree
## Focused headless checks for the Rootfall Aqueduct review level.
## Run: godot --headless --path pc-godot -s res://review_levels/a_rootfall/test_rootfall.gd

const State := preload("res://review_levels/a_rootfall/rootfall_state.gd")
const Audio := preload("res://review_levels/a_rootfall/rootfall_audio.gd")
const MAX_TICKS := 60 * 60

var failures := 0


func check(ok: bool, label: String) -> void:
	if ok:
		print("PASS ", label)
	else:
		failures += 1
		printerr("FAIL ", label)


func _initialize() -> void:
	run.call_deferred()


func autoplay_run():
	var s := State.new()
	s.autoplay = true
	for i in MAX_TICKS:
		s.step()
		if s.phase == State.Phase.VICTORY or s.phase == State.Phase.DEFEAT:
			break
	return s


func run() -> void:
	# ---------------- full deterministic autoplay
	var s = autoplay_run()
	check(s.phase == State.Phase.VICTORY, "Autoplay reaches victory (tick %d)" % s.tick)
	check(s.tick < 60 * 40, "Autoplay finishes inside 40 seconds of game time")
	var start := State.new()
	check(start.members.warden.pos.y > 6.0 and start.members.thornbow.pos.y > 6.0,
			"Party starts high on the aqueduct deck")
	check(s.first_tick("encounter_started") > 60 * 4, "Descent takes several seconds before the encounter")
	check(s.members.warden.pos.y < 0.01, "Party ends in the basin floor")
	check(not s.members.warden.downed and not s.members.thornbow.downed, "Both party members stay active")
	check(s.count("axe_swing") > 0 and _hit_count(s, "axe") > 0, "Axe strikes land")
	check(s.count("arrow_hit") > 0, "Arrows land")
	check(s.count("spell_hit") >= 1, "Violet hush spell lands")
	check(_hit_count(s, "arrow", "barkwing") > 0, "Arrows hit the airborne barkwing")
	var tele: int = s.first_tick("root_telegraph")
	var strike: int = s.first_tick("root_strike")
	check(tele > 0 and strike - tele == int(round(State.ROOT_WINDUP * 60)), "Root strike follows a full telegraph windup")
	check(_member_hits(s, "roots") == 1, "First root strike hits and later telegraphs are dodged")
	check(s.count("root_telegraph") >= 2, "Guardian telegraphs more than one root attack")
	check(_member_hits(s, "barkwing") >= 1, "Barkwing dive damages the Thornbow")
	check(s.members.warden.hp < s.members.warden.max_hp and s.members.thornbow.hp < s.members.thornbow.max_hp,
			"Both party health bars change")
	check(s.guardian.hp == 0 and s.wing.hp == 0, "Both enemies reach zero health")
	check(s.count("reward_dropped") == 2 and s.drops.size() == 2, "Each enemy drops a reward")
	check(s.inventory.get("Heartwood sap", 0) == 1 and s.inventory.get("Barkwing quill", 0) == 1,
			"Inventory gains both rewards")
	check(s.first_tick("item_picked") > s.first_tick("reward_dropped"), "Pickup follows the drop")

	# ---------------- determinism
	var again = autoplay_run()
	check(again.snapshot() == s.snapshot(), "Two autoplay runs produce identical snapshots")
	check(JSON.stringify(_types(again)) == JSON.stringify(_types(s)), "Two autoplay runs produce identical event order")

	# ---------------- rules in isolation
	var u := State.new()
	u.phase = State.Phase.ENCOUNTER
	u.members.warden.pos = State.clamp_walkable(u.wing.pos)
	check(not u.wing_low(), "Barkwing starts airborne")
	u.swing_axe()
	check(u.wing.hp == State.WING_HP, "Axe cannot reach the barkwing in flight")
	var d := State.new()
	d.phase = State.Phase.ENCOUNTER
	d.guardian.awake = true
	d.members.warden.pos = State.clamp_walkable(Vector3(0, 0, 2))
	d.members.thornbow.pos = State.clamp_walkable(Vector3(6, 0, 0))
	d.guardian.root_cd = 0.0
	d.step()
	check(d.guardian.windup > 0.0 and d.count("root_telegraph") == 1, "Root telegraph locks onto the leader")
	for i in 45:
		d.step(Vector2(1, 0))
	for i in 80:
		d.step()
	check(d.count("root_strike") == 1 and d.members.warden.hp == d.members.warden.max_hp,
			"Stepping out of the telegraph avoids root damage")
	var w := State.new()
	check(State.clamp_walkable(Vector3(9, 0, -20)).x <= State.AQUEDUCT_HALF_WIDTH, "Deck edge clamps the party")
	check(State.clamp_walkable(Vector3(0, 0, 40)).distance_to(State.BASIN_CENTER) <= State.BASIN_RADIUS + 0.01,
			"Basin rim clamps the party")
	check(w.loose_arrow() == false, "No attacks before the encounter starts")

	# ---------------- procedural audio
	var cues := ["axe", "arrow", "spell", "root_telegraph", "root_strike", "member_hit", "shriek", "drop", "pickup"]
	var ok := true
	for cue in cues:
		var a := Audio.render_cue(cue)
		var b := Audio.render_cue(cue)
		var peak := 0.0
		for v in a:
			peak = maxf(peak, absf(v))
		ok = ok and a == b and peak > 0.05 and peak <= 1.0
	check(ok, "Each event cue renders non-silent, bounded and repeatable")
	for e in ["axe_swing", "arrow_loosed", "spell_loosed", "root_telegraph", "root_strike", "member_hit",
			"enemy_hit", "reward_dropped", "item_picked"]:
		if not Audio.EVENT_CUES.has(e):
			check(false, "Event %s has an audio cue" % e)

	# ---------------- scene, HUD and audio wiring
	var scene = load("res://review_levels/a_rootfall/rootfall.tscn").instantiate()
	scene.state.autoplay = true
	root.add_child(scene)
	await process_frame
	check(scene.get_node_or_null("BarkGuardian") != null and scene.get_node_or_null("Barkwing") != null,
			"Scene builds the guardian and barkwing")
	check(scene.get_node_or_null("Warden") != null and scene.get_node_or_null("Thornbow") != null,
			"Scene builds both party members")
	var before: Dictionary = scene.hud_text()
	var saw_telegraph := false
	var saw_projectile := false
	for i in MAX_TICKS:
		scene._physics_process(State.STEP)
		saw_telegraph = saw_telegraph or scene.telegraph.visible
		saw_projectile = saw_projectile or not scene.projectile_nodes.is_empty()
		if scene.state.phase == State.Phase.VICTORY:
			break
	var after: Dictionary = scene.hud_text()
	check(scene.state.snapshot() == s.snapshot(), "Scene autoplay matches the pure model run")
	check(saw_telegraph, "Root telegraph becomes visible in the scene")
	check(saw_projectile, "Projectiles render in flight")
	check(before.party != after.party and before.enemies != after.enemies, "HUD health text changes for party and enemies")
	check(after.inventory.contains("Heartwood sap") and not before.inventory.contains("Heartwood sap"),
			"HUD inventory shows the new reward")
	var cue_names: Array = scene.audio.played
	check(cue_names.has("axe") and cue_names.has("arrow") and cue_names.has("spell") and cue_names.has("root_strike")
			and cue_names.has("pickup"), "Scene plays procedural cues for combat and pickup events")
	scene.restart()
	check(scene.state.phase == State.Phase.DESCENT and scene.state.inventory.size() == 2, "Restart returns to the aqueduct top")
	scene.audio.shutdown()
	await process_frame
	scene.queue_free()
	await process_frame
	await process_frame
	print("ROOTFALL_RESULT ", "PASS" if failures == 0 else "FAIL (%d)" % failures)
	quit(1 if failures > 0 else 0)


func _hit_count(s: RefCounted, source: String, target: String = "") -> int:
	var n := 0
	for e in s.history:
		if e.type == "enemy_hit" and e.source == source and (target == "" or e.target == target):
			n += 1
	return n


func _member_hits(s: RefCounted, source: String) -> int:
	var n := 0
	for e in s.history:
		if e.type == "member_hit" and e.source == source:
			n += 1
	return n


func _types(s: RefCounted) -> Array:
	return s.history.map(func(e): return [e.tick, e.type])
