"""Refine the existing prepared Barkwing's wing depth without rebuilding it.

Usage: blender --background --python-exit-code 1 --python this.py --
       prepared-review.blend fresh-output-directory
Outputs are review evidence only. Runtime promotion remains a separate gate.
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

sys.path.insert(0, str(Path(__file__).resolve().parent))
from prepare_barkwing_review import digest, inventory


PREPARED_SOURCE_SHA256 = "f55810fea23cb15e4928b969142c916f6b90d6291c7f76831985114e73c8985b"


def mesh_signature(obj, include_coordinates=False):
    mesh = obj.data
    payload = {
        "vertices": len(mesh.vertices),
        "faces": [list(face.vertices) for face in mesh.polygons],
        "materials": [slot.material.name for slot in obj.material_slots],
        "uvs": [[list(loop.uv) for loop in layer.data] for layer in mesh.uv_layers],
    }
    if include_coordinates:
        payload["coordinates"] = [list(vertex.co) for vertex in mesh.vertices]
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def projected_area(meshes, axis):
    area = 0.0
    for obj in meshes:
        obj.data.calc_loop_triangles()
        for triangle in obj.data.loop_triangles:
            a, b, c = [obj.matrix_world @ obj.data.vertices[i].co for i in triangle.vertices]
            area += abs((b - a).cross(c - a)[axis]) * 0.5
    return area


def refine(source, output):
    if output.exists():
        raise SystemExit("Output exists; use a fresh directory to preserve prior evidence")
    if not source.is_file() or digest(source) != PREPARED_SOURCE_SHA256:
        raise SystemExit("Expected the exact preserved run-01 prepared blend; inspect provenance")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    scene.frame_set(1)
    bpy.context.view_layer.update()
    meshes = sorted((obj for obj in scene.objects if obj.type == "MESH"), key=lambda obj: obj.name)
    root = scene.objects.get("Barkwing Reference Reconstruction")
    if root is None or len(meshes) != 78 or any(obj.modifiers for obj in meshes):
        raise SystemExit("Unexpected candidate hierarchy, mesh count, or unapplied modifiers")
    wings = [obj for obj in meshes if obj.parent and obj.parent.name in
             {"02 Left leaf wing", "02 Right leaf wing"}]
    if len(wings) != 42:
        raise SystemExit(f"Expected 42 existing wing meshes, found {len(wings)}")
    signatures = {obj.name: mesh_signature(obj, obj not in wings) for obj in meshes}
    actions_before = sorted(action.name for action in bpy.data.actions)
    before = inventory(meshes)
    area_before = projected_area(wings, 2)
    angle = math.radians(55)
    for obj in wings:
        inverse = obj.matrix_world.inverted()
        for vertex in obj.data.vertices:
            point = obj.matrix_world @ vertex.co
            # Rotate the existing curtain-like span toward a flight plane, then
            # bow its ribs and membrane together so their attachments coincide.
            span = max(0.0, min(1.0, (abs(point.x) - 0.22) / 3.0))
            bow = math.sin(math.pi * span)
            depth, height = point.y - 0.05, point.z - 3.30
            point.y = 0.05 + math.cos(angle) * depth - math.sin(angle) * height + 0.14 * bow
            point.z = 3.30 + math.sin(angle) * depth + math.cos(angle) * height + 0.08 * bow
            vertex.co = inverse @ point
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()
    bpy.context.view_layer.update()
    after = inventory(meshes)
    for obj in meshes:
        if mesh_signature(obj, obj not in wings) != signatures[obj.name]:
            raise SystemExit(f"Unexpected topology, UV, material, or non-wing change: {obj.name}")
        if any(not math.isfinite(c) for v in obj.data.vertices for c in v.co):
            raise SystemExit(f"Nonfinite vertex: {obj.name}")
    if after["triangles"] != before["triangles"] or after["uvMeshes"] != 78:
        raise SystemExit("Triangle or UV preservation failed")
    if sorted(action.name for action in bpy.data.actions) != actions_before:
        raise SystemExit("Existing preview actions changed")
    area_after = projected_area(wings, 2)
    if area_after < area_before * 3:
        raise SystemExit(f"Inspect projected top-plane wing area: before={area_before:.6f}, after={area_after:.6f}")
    for material in bpy.data.materials:
        if material.users and (not material.use_nodes or not material.node_tree.nodes.get("Principled BSDF")):
            raise SystemExit(f"Missing existing PBR material: {material.name}")
    output.mkdir(parents=True)
    blend = output / "barkwing-camber.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    bpy.ops.object.select_all(action="DESELECT")
    for obj in scene.objects:
        if obj.type in {"MESH", "EMPTY"}:
            obj.select_set(True)
    glb = output / "barkwing-camber.glb"
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True,
                              export_animations=True, export_cameras=False, export_lights=False)
    if digest(source) != PREPARED_SOURCE_SHA256:
        raise SystemExit("Source unexpectedly changed")
    receipt = {
        "candidate": "existing Barkwing Reference Reconstruction, wing camber refinement",
        "blender": bpy.app.version_string,
        "source": str(source), "sourceSha256": PREPARED_SOURCE_SHA256,
        "scriptSha256": digest(Path(__file__)),
        "before": before, "after": after,
        "modifiedMeshes": [obj.name for obj in wings],
        "preserved": ["topology", "UVs", "six PBR materials", "non-wing vertices", "two preview actions"],
        "wingPitchDegrees": 55,
        "topProjectedTriangleAreaBefore": area_before,
        "topProjectedTriangleAreaAfter": area_after,
        "projectionLimit": "Sum of absolute triangle areas, including overlaps and both leaf faces; not screen coverage or a visual score.",
        "blendSha256": digest(blend), "glbSha256": digest(glb), "glbBytes": glb.stat().st_size,
        "promotion": "HOLD",
        "remaining": ["live Spline reference unavailable in final scheduled run", "independent 95-point jury and owner silhouette approval",
                      "1200-triangle and one-material minion caps", "baked surface fidelity and LODs",
                      "skeletal rig and full clips", "loader and fallback validation", "desktop and physical-phone performance"],
        "evidenceLimit": "Offline candidate refinement only; no runtime, visual acceptance, or physical-device claim.",
    }
    (output / "camber-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    refine(args.source.resolve(), args.output.resolve())
