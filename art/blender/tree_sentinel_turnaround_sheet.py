# tree_sentinel_turnaround_sheet.py
# Developer: Marcus Daley
# Date: 2026-10-30
# Why: Render review-only Tree Sentinel blockout poses before any runtime integration.

from pathlib import Path
from math import radians
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
RENDER_PATH = ROOT / "art" / "blender" / "renders" / "tree_sentinel_blockout_sheet.png"


def material(name, color, roughness=0.72, emission=None):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 2.5
    return value


def attach(obj, root, location, mat, name):
    obj.name = name
    obj.parent = root
    obj.location = location
    obj.data.materials.append(mat)
    return obj


def cylinder(root, name, location, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=radius, depth=depth)
    obj = attach(bpy.context.object, root, location, mat, name)
    obj.rotation_euler = rotation
    return obj


def cone(root, name, location, radius1, radius2, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=8, radius1=radius1, radius2=radius2, depth=depth)
    obj = attach(bpy.context.object, root, location, mat, name)
    obj.rotation_euler = rotation
    return obj


def cube(root, name, location, scale, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add()
    obj = attach(bpy.context.object, root, location, mat, name)
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler = rotation
    bevel = obj.modifiers.new("Bark-softened edge", "BEVEL")
    bevel.width = 0.06
    bevel.segments = 2
    return obj


def sphere(root, name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6)
    obj = attach(bpy.context.object, root, location, mat, name)
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    return obj


def torus(root, name, location, major_radius, minor_radius, mat):
    bpy.ops.mesh.primitive_torus_add(major_radius=major_radius, minor_radius=minor_radius, major_segments=16, minor_segments=6)
    return attach(bpy.context.object, root, location, mat, name)


def make_sentinel(collection, name, location, pose, mats, silhouette=False, scale=1.0):
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    root.location = location
    root.scale = (scale, scale, scale)
    palette = {key: mats["silhouette"] if silhouette else value for key, value in mats.items()}
    cylinder(root, f"{name}_trunk", (0, 0, 1.45), 0.55, 2.65, palette["bark"])
    cone(root, f"{name}_crown", (0, 0, 3.08), 0.65, 0.35, 0.88, palette["bark"])
    cube(root, f"{name}_chest_plate", (0, -0.48, 1.88), (0.48, 0.10, 0.42), palette["plate"])
    sphere(root, f"{name}_core", (0, -0.61, 1.90), (0.23, 0.10, 0.26), palette["core"])
    sphere(root, f"{name}_eye_left", (-0.15, -0.49, 3.14), (0.06, 0.04, 0.08), palette["core"])
    sphere(root, f"{name}_eye_right", (0.15, -0.49, 3.14), (0.06, 0.04, 0.08), palette["core"])
    for side in (-1, 1):
        cylinder(root, f"{name}_root_arm_{side}", (side * 0.72, 0, 2.05), 0.17, 1.90, palette["bark"], (0, radians(-side * 58), radians(side * 9)))
        cylinder(root, f"{name}_antler_main_{side}", (side * 0.30, 0, 3.62), 0.10, 1.36, palette["branch"], (0, radians(-side * 43), radians(side * 9)))
        cylinder(root, f"{name}_antler_tine_{side}", (side * 0.70, 0, 3.97), 0.065, 0.72, palette["branch"], (0, radians(-side * 76), radians(side * 10)))
    for angle in (20, 110, 200, 290):
        cylinder(root, f"{name}_ground_root_{angle}", (0, 0, 0.18), 0.15, 1.65, palette["root"], (radians(90), 0, radians(angle)))
    for x, z in ((-0.48, 2.35), (0.48, 2.35), (-0.25, 1.10), (0.25, 1.10)):
        cube(root, f"{name}_moss_{x}_{z}", (x, 0.06, z), (0.18, 0.09, 0.12), palette["moss"])
    if pose == "ROOT TELEGRAPH":
        torus(root, f"{name}_telegraph_inner", (0, 0, 0.08), 1.08, 0.055, palette["telegraph"])
        torus(root, f"{name}_telegraph_outer", (0, 0, 0.12), 1.42, 0.040, palette["telegraph"])
        cylinder(root, f"{name}_raised_root", (0.98, -0.18, 0.86), 0.13, 1.55, palette["telegraph"], (radians(5), radians(67), radians(-18)))
    elif pose == "EXPOSED CORE":
        cube(root, f"{name}_opened_plate_left", (-0.47, -0.56, 1.92), (0.14, 0.06, 0.34), palette["plate"], (0, radians(-25), radians(-18)))
        cube(root, f"{name}_opened_plate_right", (0.47, -0.56, 1.92), (0.14, 0.06, 0.34), palette["plate"], (0, radians(25), radians(18)))
        sphere(root, f"{name}_exposed_core", (0, -0.70, 1.90), (0.36, 0.13, 0.40), palette["exposed"])
        for x in (-0.34, 0.34):
            cone(root, f"{name}_core_shard_{x}", (x, -0.66, 1.92), 0.10, 0.02, 0.58, palette["exposed"], (0, radians(x * 45), 0))
    return root


def label(text, location, size, mat):
    bpy.ops.object.text_add(location=location, rotation=(radians(90), 0, 0))
    obj = bpy.context.object
    obj.data.body = text
    obj.data.align_x = "CENTER"
    obj.data.align_y = "CENTER"
    obj.data.size = size
    obj.data.materials.append(mat)
    return obj


def named_triangles(prefix):
    return sum(
        max(0, len(poly.vertices) - 2)
        for obj in bpy.data.objects
        if obj.type == "MESH" and obj.name.startswith(prefix) and "Silhouette" not in obj.name
        for poly in obj.data.polygons
    )


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 2048
    scene.render.resolution_y = 2048
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.008, 0.014, 0.024)
    mats = {
        "bark": material("Twisted rain-dark bark", (0.15, 0.10, 0.065)),
        "branch": material("Weathered branch", (0.22, 0.15, 0.09)),
        "root": material("Wet root", (0.12, 0.08, 0.055)),
        "plate": material("Bark plate", (0.18, 0.14, 0.09)),
        "moss": material("Muted moss", (0.11, 0.22, 0.13)),
        "core": material("Amber core", (0.48, 0.20, 0.035), emission=(0.80, 0.30, 0.045)),
        "exposed": material("Exposed violet amber core", (0.38, 0.11, 0.24), emission=(0.72, 0.18, 0.42)),
        "telegraph": material("Root telegraph", (0.46, 0.12, 0.035), emission=(0.78, 0.20, 0.045)),
        "silhouette": material("Sentinel silhouette", (0.015, 0.025, 0.030)),
        "label": material("Sheet label", (0.64, 0.74, 0.71)),
        "panel": material("Deepwood panel", (0.028, 0.055, 0.052)),
    }
    collection = bpy.data.collections.new("Tree_Sentinel_Sheet")
    scene.collection.children.link(collection)
    poses = (("IDLE", -2.40), ("ROOT TELEGRAPH", 0.0), ("EXPOSED CORE", 2.40))
    for pose, x in poses:
        panel_root = bpy.data.objects.new(f"{pose}_panel", None)
        bpy.context.collection.objects.link(panel_root)
        cube(panel_root, "Panel", (x, 0.62, 0.78), (1.04, 0.06, 2.38), mats["panel"])
        make_sentinel(collection, f"TreeSentinel_{pose}", (x, 0, 0), pose, mats)
        make_sentinel(collection, f"TreeSentinel_{pose}_Silhouette", (x, 0, -2.25), pose, mats, silhouette=True, scale=0.45)
        label(pose, (x, -0.20, 4.25), 0.22, mats["label"])
        label("SILHOUETTE", (x, -0.20, -3.28), 0.12, mats["label"])
    label("DEEPWOOD TREE SENTINEL / BLOCKOUT POSE STUDY", (0, -0.20, 5.10), 0.17, mats["label"])
    label("ROOT LIMBS + ANTLER CROWN + READABLE CORE / TELEGRAPH IS GEOMETRY, NOT COLOUR ALONE", (0, -0.20, 4.72), 0.09, mats["label"])
    bpy.ops.object.camera_add(location=(0, -17, 0.95))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 10.8
    camera.rotation_euler = (Vector((0, 0, 0.95)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(0, -4.5, 7.0))
    bpy.context.object.data.energy = 1300
    bpy.context.object.data.color = (0.48, 0.64, 0.57)
    bpy.context.object.data.size = 9.0
    bpy.ops.object.light_add(type="AREA", location=(0, 1.5, 4.0))
    bpy.context.object.data.energy = 430
    bpy.context.object.data.color = (0.54, 0.30, 0.72)
    bpy.context.object.data.size = 5.0
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    triangles = sum(max(0, len(poly.vertices) - 2) for mesh in bpy.data.meshes for poly in mesh.polygons)
    print(f"TREE_SENTINEL_SHEET_TRIANGLES={triangles}")
    print(f"TREE_SENTINEL_IDLE_TRIANGLES={named_triangles('TreeSentinel_IDLE_')}")
    print(f"TREE_SENTINEL_ROOT_TELEGRAPH_TRIANGLES={named_triangles('TreeSentinel_ROOT TELEGRAPH_')}")
    print(f"TREE_SENTINEL_EXPOSED_CORE_TRIANGLES={named_triangles('TreeSentinel_EXPOSED CORE_')}")
    print(f"TREE_SENTINEL_SHEET_MATERIALS={len(bpy.data.materials)}")
    print(f"TREE_SENTINEL_SHEET_RENDER={RENDER_PATH}")


if __name__ == "__main__":
    main()
