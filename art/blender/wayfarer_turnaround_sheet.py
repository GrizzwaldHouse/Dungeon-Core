# wayfarer_turnaround_sheet.py
# Developer: Marcus Daley
# Date: 2026-10-30
# Why: Render an actual, reviewable Mage Wayfarer turnaround sheet before high-detail modeling.

from pathlib import Path
from math import radians
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
RENDER_PATH = ROOT / "art" / "blender" / "renders" / "wayfarer_mage_turnaround_sheet.png"


def make_material(name, color, roughness=0.7, emission=None):
    value = bpy.data.materials.new(name)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 1.8
    return value


def add_cube(root, name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add()
    obj = bpy.context.object
    obj.name = name
    obj.parent = root
    obj.location = location
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Softened edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(mat)
    return obj


def add_cylinder(root, name, location, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth)
    obj = bpy.context.object
    obj.name = name
    obj.parent = root
    obj.location = location
    obj.rotation_euler = rotation
    obj.data.materials.append(mat)
    return obj


def add_sphere(root, name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8)
    obj = bpy.context.object
    obj.name = name
    obj.parent = root
    obj.location = location
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj


def make_wayfarer(collection, name, location, rotation_z, mats, silhouette=False, scale=1.0):
    root = bpy.data.objects.new(name, None)
    collection.objects.link(root)
    root.location = location
    root.rotation_euler[2] = radians(rotation_z)
    root.scale = (scale, scale, scale)
    palette = {key: mats["silhouette"] if silhouette else value for key, value in mats.items()}
    add_cylinder(root, f"{name}_boot_left", (-0.18, 0, 0.12), 0.16, 0.42, palette["leather"])
    add_cylinder(root, f"{name}_boot_right", (0.17, 0, 0.12), 0.16, 0.42, palette["leather"])
    add_cylinder(root, f"{name}_body", (0, 0, 0.78), 0.34, 0.92, palette["cloth"])
    add_sphere(root, f"{name}_hood", (0, -0.03, 1.38), (0.39, 0.39, 0.42), palette["hood"])
    cloak = add_cube(root, f"{name}_cloak", (0, 0.21, 0.9), (0.48, 0.12, 0.68), palette["cloak"], 0.07)
    cloak.rotation_euler[0] = radians(-8)
    add_cube(root, f"{name}_pack", (0, 0.38, 0.92), (0.28, 0.16, 0.30), palette["leather"], 0.05)
    add_cylinder(root, f"{name}_crooked_staff", (0.54, -0.18, 0.95), 0.05, 2.05, palette["bronze"], (radians(9), radians(-8), radians(-13)))
    add_cube(root, f"{name}_ward_satchel", (-0.37, -0.18, 0.72), (0.16, 0.10, 0.18), palette["bronze"], 0.03)
    add_sphere(root, f"{name}_ward_focus", (0.12, -0.38, 0.91), (0.10, 0.07, 0.10), palette["arcane"])
    return root


def add_label(text, location, size, mat):
    bpy.ops.object.text_add(location=location, rotation=(radians(90), 0, 0))
    label = bpy.context.object
    label.data.body = text
    label.data.align_x = "CENTER"
    label.data.align_y = "CENTER"
    label.data.size = size
    label.data.materials.append(mat)
    return label


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 2048
    scene.render.resolution_y = 2048
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.color = (0.008, 0.014, 0.025)
    mats = {
        "cloth": make_material("Weathered teal cloth", (0.05, 0.28, 0.27)),
        "hood": make_material("Moss hood", (0.10, 0.18, 0.16)),
        "cloak": make_material("Dusk cloak", (0.12, 0.14, 0.22)),
        "leather": make_material("Worn leather", (0.22, 0.12, 0.08)),
        "bronze": make_material("Tarnished bronze", (0.27, 0.22, 0.16), 0.38),
        "arcane": make_material("Restrained violet focus", (0.28, 0.10, 0.42), emission=(0.38, 0.14, 0.64)),
        "silhouette": make_material("Silhouette", (0.018, 0.025, 0.04)),
        "label": make_material("Sheet label", (0.62, 0.74, 0.76)),
        "panel": make_material("Sheet panel", (0.035, 0.060, 0.090)),
    }
    collection = bpy.data.collections.new("Mage_Wayfarer_Sheet")
    scene.collection.children.link(collection)
    for x in (-2.55, -0.85, 0.85, 2.55):
        panel = add_cube(None, "Panel", (x, 0.58, 0.38), (0.72, 0.06, 1.35), mats["panel"], 0.03)
        panel.parent = None
    rotations = (("FRONT", 0), ("LEFT", 90), ("BACK", 180), ("3/4", 315))
    for (label, rotation), x in zip(rotations, (-2.55, -0.85, 0.85, 2.55)):
        make_wayfarer(collection, f"Mage_{label}", (x, 0, 0), rotation, mats)
        make_wayfarer(collection, f"Mage_{label}_silhouette", (x, 0, -1.52), rotation, mats, silhouette=True, scale=0.52)
        add_label(label, (x, -0.18, 2.20), 0.24, mats["label"])
        add_label("SILHOUETTE", (x, -0.18, -2.16), 0.12, mats["label"])
    add_label("EXPEDITION COMPANY / MAGE WAYFARER", (0, -0.18, 3.05), 0.17, mats["label"])
    add_label("BLOCKOUT TURNAROUNDS / CROOKED STAFF + WARD FOCUS + ASYMMETRICAL PACK", (0, -0.18, 2.70), 0.11, mats["label"])
    bpy.ops.object.camera_add(location=(0, -15, 0.25))
    camera = bpy.context.object
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 7.2
    camera.rotation_euler = (Vector((0, 0, 0.25)) - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = camera
    bpy.ops.object.light_add(type="AREA", location=(0, -4.0, 5.5))
    bpy.context.object.data.energy = 1150
    bpy.context.object.data.color = (0.52, 0.70, 0.78)
    bpy.context.object.data.shape = "RECTANGLE"
    bpy.context.object.data.size = 8.0
    bpy.ops.object.light_add(type="AREA", location=(0, 1.5, 2.0))
    bpy.context.object.data.energy = 360
    bpy.context.object.data.color = (0.56, 0.34, 0.72)
    bpy.context.object.data.size = 5.0
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    triangles = sum(max(0, len(poly.vertices) - 2) for mesh in bpy.data.meshes for poly in mesh.polygons)
    print(f"TURNAROUND_TRIANGLES={triangles}")
    print(f"TURNAROUND_RENDER={RENDER_PATH}")


if __name__ == "__main__":
    main()
