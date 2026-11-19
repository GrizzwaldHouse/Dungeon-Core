extends SceneTree

func _initialize() -> void:
	capture.call_deferred()

func capture() -> void:
	var scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(scene)
	scene.state.skip_intro()
	var places := {"guild": Vector3(0,0,5), "deepwood": Vector3(-30,0,-2), "permafrost": Vector3(30,0,-5), "dungeon": Vector3(1.5,0,-79)}
	for place in places:
		if place == "dungeon":
			scene.state.player_pos = scene.state.GATE_POS
			scene.state.interact()
		scene.state.player_pos = places[place]
		scene.state.move(Vector2.RIGHT, 0.01)
		scene.sync_view()
		await RenderingServer.frame_post_draw
		var output := "res://build/" + str(place) + ".png"
		if root.get_texture().get_image().save_png(output) != OK:
			quit(1)
			return
	quit(0)
