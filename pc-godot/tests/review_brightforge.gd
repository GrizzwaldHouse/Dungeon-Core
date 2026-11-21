extends SceneTree
# Opens transferred BrightForge exports in an isolated Godot review scene.
# Usage: godot --path pc-godot -s res://tests/review_brightforge.gd -- <export-folder> [--check]
func _initialize() -> void:
	call_deferred("_review")

func _review() -> void:
	var args := OS.get_cmdline_user_args()
	if args.is_empty():
		push_error("Supply the extracted candidate export directory.")
		quit(1)
		return
	var stage := Node3D.new()
	root.add_child(stage)
	var index := 0
	for asset_id in ["dungeon-chest", "stone-doorway-module"]:
		var directory := args[0].path_join(asset_id)
		var manifest = JSON.parse_string(FileAccess.get_file_as_string(directory.path_join("manifest.json")))
		if not manifest is Dictionary or manifest.get("status") != "REVIEW_CANDIDATE":
			push_error("Invalid review manifest.")
			quit(1)
			return
		var file := directory.path_join("candidate.glb")
		var artifacts = manifest.get("artifacts", [])
		if not artifacts is Array or artifacts.size() != 1 or not artifacts[0] is Dictionary:
			push_error("Expected one GLB artifact.")
			quit(1)
			return
		var artifact = artifacts[0]
		if FileAccess.get_sha256(file) != artifact.get("sha256"):
			push_error("Candidate digest mismatch.")
			quit(1)
			return
		var document := GLTFDocument.new()
		var state := GLTFState.new()
		if document.append_from_file(file, state) != OK:
			push_error("GLB import failed.")
			quit(1)
			return
		var model := document.generate_scene(state)
		if model == null or model.find_children("*", "MeshInstance3D", true, false).is_empty():
			push_error("Imported candidate has no mesh.")
			quit(1)
			return
		model.rotation.x = -PI / 2.0
		model.position.x = -2.5 if index == 0 else 2.5
		stage.add_child(model)
		index += 1
	print("BRIGHTFORGE_IMPORT PASS models=", index, " hashes=verified art=pending")
	if args.has("--check"):
		stage.queue_free()
		await process_frame
		quit(0)
		return
	var camera := Camera3D.new()
	camera.position = Vector3(8, 6, 10)
	stage.add_child(camera)
	camera.look_at(Vector3(0, 1, 0))
	camera.current = true
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-55, -30, 0)
	light.light_energy = 2.0
	stage.add_child(light)
	var environment := WorldEnvironment.new()
	environment.environment = Environment.new()
	environment.environment.background_mode = Environment.BG_COLOR
	environment.environment.background_color = Color("#182126")
	environment.environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.environment.ambient_light_color = Color("#d3ddd5")
	environment.environment.ambient_light_energy = 0.7
	stage.add_child(environment)
