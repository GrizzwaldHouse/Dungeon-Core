# build_barkwing_prototype.py
# Developer: Marcus Daley
# Date: 2026-10-31
# Why: Produces a bounded, inspectable Barkwing asset prototype without spending generation credits or modifying runtime game state.

import bpy
import json
import math
import os
import sys
from mathutils import Vector


def output_directory():
    args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    target = args[0] if args else os.path.join(os.getcwd(), "barkwing-output")
    os.makedirs(target, exist_ok=True)
    return os.path.abspath(target)


def hex_color(value):
    value = value.lstrip("#")
    rgb = tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4))
    return (*rgb, 1.0)


def material(name, color, metallic=0.0, roughness=0.7, emission=None, emission_strength=0.0):
    result = bpy.data.materials.new(name)
    result.diffuse_color = hex_color(color)
    result.use_nodes = True
    principled = result.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = hex_color(color)
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Roughness"].default_value = roughness
    if emission:
        principled.inputs["Emission Color"].default_value = hex_color(emission)
        principled.inputs["Emission Strength"].default_value = emission_strength
    return result


def apply_material(obj, value):
    obj.data.materials.append(value)


def add_uv_sphere(name, location, scale, value, segments=16, rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_material(obj, value)
    return obj


def add_cylinder_between(name, start, end, radius, value, vertices=8):
    start_vector = Vector(start)
    end_vector = Vector(end)
    direction = end_vector - start_vector
    midpoint = (start_vector + end_vector) * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    apply_material(obj, value)
    return obj


def add_wing(name, side, value, vein_material):
    outline = [
        (0.0, 0.0, 0.0),
        (0.8, -0.25, 0.08),
        (1.8, -0.1, 0.16),
        (2.55, 0.45, 0.02),
        (2.0, 0.9, -0.08),
        (0.9, 0.7, -0.03),
    ]
    vertices = [(x * side, y, z) for x, y, z in outline]
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], [tuple(range(len(vertices)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = (0.38 * side, 0.0, 2.1)
    apply_material(obj, value)
    solidify = obj.modifiers.new("Wing Thickness", "SOLIDIFY")
    solidify.thickness = 0.055
    bevel = obj.modifiers.new("Wing Edge", "BEVEL")
    bevel.width = 0.035
    bevel.segments = 2

    for index, point in enumerate(((1.4, 0.25, 2.15), (1.75, 0.58, 2.12)), start=1):
        end = (point[0] * side, point[1], point[2])
        add_cylinder_between(
            f"{name} Vein {index}",
            (0.45 * side, 0.05, 2.1),
            end,
            0.035,
            vein_material,
            6,
        )
    return obj


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


target = output_directory()
bpy.ops.wm.read_factory_settings(use_empty=True)

bark = material("Bark", "#3b302d", roughness=0.86)
dark_bark = material("Dark Bark", "#292527", roughness=0.9)
moss = material("Moss Wing", "#657064", roughness=0.82)
vein = material("Wing Vein", "#3b2d27", roughness=0.88)
amber = material("Amber Eye", "#d88745", roughness=0.35, emission="#d88745", emission_strength=3.2)
violet = material("Restrained Magic", "#8062a8", roughness=0.4, emission="#8062a8", emission_strength=1.8)
ground = material("Ground", "#1d232d", roughness=0.95)

root = bpy.data.objects.new("Barkwing Flying Minion Prototype", None)
bpy.context.collection.objects.link(root)

parts = [
    add_uv_sphere("Thorax", (0, 0, 1.75), (0.55, 0.75, 0.48), bark),
    add_uv_sphere("Head", (0, -0.72, 1.82), (0.43, 0.42, 0.39), dark_bark),
    add_uv_sphere("Abdomen", (0, 0.92, 1.68), (0.42, 0.85, 0.36), bark),
    add_uv_sphere("Left Eye", (-0.19, -1.08, 1.94), (0.1, 0.08, 0.1), amber, 12, 6),
    add_uv_sphere("Right Eye", (0.19, -1.08, 1.94), (0.1, 0.08, 0.1), amber, 12, 6),
    add_uv_sphere("Magic Core", (0, -0.4, 1.62), (0.15, 0.1, 0.15), violet, 12, 6),
]

left_wing = add_wing("Left Leaf Wing", -1, moss, vein)
right_wing = add_wing("Right Leaf Wing", 1, moss, vein)
parts.extend((left_wing, right_wing))

leg_targets = [
    (-0.95, -0.45, 1.0),
    (0.95, -0.45, 1.0),
    (-1.05, 0.25, 0.92),
    (1.05, 0.25, 0.92),
    (-0.82, 0.85, 1.0),
    (0.82, 0.85, 1.0),
]
for index, endpoint in enumerate(leg_targets, start=1):
    start = (-0.32 if endpoint[0] < 0 else 0.32, endpoint[1] * 0.25, 1.68)
    parts.append(add_cylinder_between(f"Branch Leg {index}", start, endpoint, 0.065, vein, 7))

parts.append(add_cylinder_between("Left Antenna", (-0.18, -0.96, 2.05), (-0.46, -1.5, 2.34), 0.035, vein, 6))
parts.append(add_cylinder_between("Right Antenna", (0.18, -0.96, 2.05), (0.46, -1.5, 2.34), 0.035, vein, 6))

for obj in parts:
    obj.parent = root

for wing, side in ((left_wing, -1), (right_wing, 1)):
    wing.rotation_mode = "XYZ"
    wing.keyframe_insert(data_path="rotation_euler", frame=1)
    wing.rotation_euler.y = math.radians(18 * side)
    wing.keyframe_insert(data_path="rotation_euler", frame=5)
    wing.rotation_euler.y = 0
    wing.keyframe_insert(data_path="rotation_euler", frame=9)

bpy.context.scene.frame_start = 1
bpy.context.scene.frame_end = 9
bpy.context.scene.render.fps = 24

bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=1.0, depth=0.04, location=(0, 0.2, 0.03))
shadow = bpy.context.object
shadow.name = "Flight Shadow"
shadow.scale = (1.35, 0.65, 1.0)
apply_material(shadow, dark_bark)

bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 0, 0))
floor = bpy.context.object
floor.name = "Review Ground"
apply_material(floor, ground)

bpy.ops.object.light_add(type="AREA", location=(4.0, -4.0, 6.0))
key = bpy.context.object
key.name = "Cool Key"
key.data.energy = 1050
key.data.shape = "DISK"
key.data.size = 5.0
key.data.color = (0.62, 0.72, 0.86)

bpy.ops.object.light_add(type="AREA", location=(-3.0, 1.5, 3.5))
fill = bpy.context.object
fill.name = "Amber Fill"
fill.data.energy = 650
fill.data.size = 3.0
fill.data.color = (0.9, 0.52, 0.28)

bpy.ops.object.camera_add(location=(5.8, -8.5, 4.5))
camera = bpy.context.object
camera.name = "Review Camera"
camera.data.lens = 58
look_at(camera, (0, 0.0, 1.45))
bpy.context.scene.camera = camera

world = bpy.context.scene.world or bpy.data.worlds.new("Dungeon World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = hex_color("#242936")
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.38

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 1024
scene.render.resolution_y = 768
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = os.path.join(target, "barkwing-blender-review.png")
scene.render.film_transparent = False
scene.view_settings.look = "AgX - Medium High Contrast"
scene.frame_set(5)
bpy.ops.render.render(write_still=True)

blend_path = os.path.join(target, "barkwing-prototype.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path)

glb_path = os.path.join(target, "barkwing-prototype.glb")
bpy.ops.export_scene.gltf(
    filepath=glb_path,
    export_format="GLB",
    export_animations=True,
    export_apply=True,
    export_yup=True,
)

mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
stats = {
    "asset": "Barkwing Flying Minion Prototype",
    "meshObjects": len(mesh_objects),
    "vertices": sum(len(obj.data.vertices) for obj in mesh_objects),
    "polygons": sum(len(obj.data.polygons) for obj in mesh_objects),
    "materials": sorted({slot.material.name for obj in mesh_objects for slot in obj.material_slots if slot.material}),
    "animationFrames": [scene.frame_start, scene.frame_end],
    "creditSpend": 0,
    "outputs": {
        "blend": os.path.basename(blend_path),
        "glb": os.path.basename(glb_path),
        "preview": os.path.basename(scene.render.filepath),
    },
}
with open(os.path.join(target, "barkwing-prototype-stats.json"), "w", encoding="utf-8", newline="\n") as handle:
    json.dump(stats, handle, indent=2)

print(json.dumps(stats, indent=2))
