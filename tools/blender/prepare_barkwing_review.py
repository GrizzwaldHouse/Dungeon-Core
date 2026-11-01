"""Prepare the existing Barkwing reconstruction without overwriting its source.

Usage: blender --background --python tools/blender/prepare_barkwing_review.py --
       source.blend new-output-directory
This is a review candidate, never a runtime-promotion command.
"""

import argparse
import bmesh
import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def bounds(meshes):
    points = [obj.matrix_world @ Vector(corner) for obj in meshes for corner in obj.bound_box]
    return {
        "min": [min(point[axis] for point in points) for axis in range(3)],
        "max": [max(point[axis] for point in points) for axis in range(3)],
    }


def inventory(meshes):
    triangles = 0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        triangles += len(obj.data.loop_triangles)
    return {
        "meshes": len(meshes),
        "vertices": sum(len(obj.data.vertices) for obj in meshes),
        "triangles": triangles,
        "uvMeshes": sum(bool(obj.data.uv_layers) for obj in meshes),
        "materials": len({slot.material.name for obj in meshes for slot in obj.material_slots if slot.material}),
        "bounds": bounds(meshes),
    }


def prepare(source, output):
    if output.exists():
        raise SystemExit("Output already exists; choose a new review directory to preserve prior work")
    if not source.is_file() or source.suffix.lower() != ".blend":
        raise SystemExit("An existing .blend source is required")
    source_hash = digest(source)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    scene.frame_set(1)
    bpy.context.view_layer.update()
    meshes = sorted((obj for obj in scene.objects if obj.type == "MESH"), key=lambda obj: obj.name)
    roots = [obj for obj in scene.objects if obj.name == "Barkwing Reference Reconstruction"]
    if len(roots) != 1 or len(meshes) != 78:
        raise SystemExit("Unexpected candidate identity or mesh count; inspect source before editing")
    before = inventory(meshes)
    repaired_uvs = []
    smoothed = []
    removed_vertices = 0
    applied_modifiers = []
    # Keep the broad torso and leaf planes faceted; smooth only narrow woody branches.
    smooth_stems = ("Wing shoulder spar", "Wing leading spar", "Branch wing rib", "Leaf lateral vein",
                    "Forked crown", "Crown secondary fork", "Root thigh", "Root shin", "Root claw", "Hooked claw tip")
    for obj in meshes:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            if modifier.type != "SOLIDIFY":
                raise SystemExit(f"Unreviewed modifier on {obj.name}")
            applied_modifiers.append(f"{obj.name}: {modifier.name}")
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        initial = len(bm.verts)
        bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
        removed_vertices += initial - len(bm.verts)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()
        if obj.name.startswith(smooth_stems):
            for face in obj.data.polygons:
                # Cone/cylinder side quads only; flat end caps keep a readable edge.
                face.use_smooth = len(face.vertices) == 4
            smoothed.append(obj.name)
        if not obj.data.uv_layers:
            bpy.ops.object.mode_set(mode="EDIT")
            bpy.ops.mesh.select_all(action="SELECT")
            bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.03)
            bpy.ops.object.mode_set(mode="OBJECT")
            repaired_uvs.append(obj.name)
        if any(not math.isfinite(component) for vertex in obj.data.vertices for component in vertex.co):
            raise SystemExit(f"Nonfinite vertex in {obj.name}")
        if any(not math.isfinite(component) for loop in obj.data.uv_layers.active.data for component in loop.uv):
            raise SystemExit(f"Nonfinite UV in {obj.name}")
    bpy.context.view_layer.update()
    after = inventory(meshes)
    if any(abs(before["bounds"][side][i] - after["bounds"][side][i]) > 0.02
           for side in ("min", "max") for i in range(3)):
        raise SystemExit("Cleanup moved the silhouette bounds beyond leaf-thickness tolerance")
    materials = sorted({slot.material for obj in meshes for slot in obj.material_slots if slot.material}, key=lambda m: m.name)
    pbr = []
    for material in materials:
        bsdf = material.node_tree.nodes.get("Principled BSDF") if material.use_nodes else None
        if bsdf is None:
            raise SystemExit(f"Missing PBR node material: {material.name}")
        pbr.append({"name": material.name, "baseColor": list(bsdf.inputs["Base Color"].default_value),
                    "roughness": bsdf.inputs["Roughness"].default_value,
                    "proceduralBumpNeedsBake": bool(bsdf.inputs["Normal"].is_linked)})
    output.mkdir(parents=True)
    destination = output / "barkwing-review.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(destination))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type in {"MESH", "EMPTY"}:
            obj.select_set(True)
    glb = output / "barkwing-review.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
                              export_animations=True, export_cameras=False, export_lights=False)
    if digest(source) != source_hash:
        raise SystemExit("Source hash changed unexpectedly")
    receipt = {
        "candidate": "existing Barkwing Reference Reconstruction",
        "blender": bpy.app.version_string,
        "source": str(source), "sourceSha256": source_hash,
        "scriptSha256": digest(Path(__file__)),
        "before": before, "after": after,
        "appliedSolidifyModifiers": applied_modifiers,
        "removedDuplicateVertices": removed_vertices,
        "generatedUVs": repaired_uvs, "smoothedBranches": smoothed,
        "pbrMaterials": pbr,
        "blendSha256": digest(destination), "glbSha256": digest(glb), "glbBytes": glb.stat().st_size,
        "promotion": "HOLD",
        "remaining": ["silhouette and independent jury approval", "procedural bump baking and atlas budget",
                      "skeletal rig and full combat clips", "Three.js loader and fallback tests",
                      "desktop performance and Marcus physical-phone review"],
        "evidenceLimit": "Offline cleanup and UV preparation only; no runtime or physical-device claim.",
    }
    (output / "preparation.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    prepare(args.source.resolve(), args.output.resolve())
