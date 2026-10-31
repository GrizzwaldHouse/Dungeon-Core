# validate_glb_asset.py
# Developer: Marcus Daley
# Date: 2026-10-31
# Why: Reopens exported browser assets in a clean Blender process so broken meshes or missing animations cannot pass on export success alone.

import bpy
import json
import os
import sys


args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
if not args:
    raise SystemExit("Provide a GLB path after --")

asset_path = os.path.abspath(args[0])
if not os.path.isfile(asset_path):
    raise SystemExit(f"GLB not found: {asset_path}")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=asset_path)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
actions = list(bpy.data.actions)
result = {
    "file": asset_path,
    "bytes": os.path.getsize(asset_path),
    "meshObjects": len(mesh_objects),
    "vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
    "polygons": sum(len(obj.data.polygons) for obj in mesh_objects),
    "actions": [action.name for action in actions],
    "valid": bool(mesh_objects) and bool(actions),
}
print(json.dumps(result, indent=2))
if not result["valid"]:
    raise SystemExit("GLB validation failed: mesh or animation data is missing")
