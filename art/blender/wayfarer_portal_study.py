# wayfarer_portal_study.py
# Developer: Marcus Daley
# Date: 2026-10-30
# Why: Produce a deterministic headless blockout for one web-friendly Wayfarer and a ruined portal before any runtime asset integration.

from pathlib import Path
import bpy
from mathutils import Vector
from math import radians

ROOT = Path(__file__).resolve().parents[2]
RENDER_PATH = ROOT / "art" / "blender" / "renders" / "wayfarer_portal_study.png"
PHONE_RENDER_PATH = ROOT / "art" / "blender" / "renders" / "wayfarer_portal_study_phone.png"
EXPORT_PATH = ROOT / "art" / "blender" / "exports" / "wayfarer_portal_study.glb"


def material(name, color, metallic=0.0, roughness=0.7, emission=None):
    value = bpy.data.materials.new(name)
    value.diffuse_color = (*color, 1.0)
    value.use_nodes = True
    shader = value.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*emission, 1.0)
        shader.inputs["Emission Strength"].default_value = 3.0
    return value


def cube(name, location, scale, mat, bevel=0.0):
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        modifier = obj.modifiers.new("Softened edges", "BEVEL")
        modifier.width = bevel
        modifier.segments = 2
    obj.data.materials.append(mat)
    return obj


def uv_sphere(name, location, scale, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=8, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.ops.object.shade_smooth()
    obj.data.materials.append(mat)
    return obj


def cylinder(name, location, radius, depth, mat, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=radius, depth=depth, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    return obj


def build_wayfarer(collection, mats, origin_x=-1.35):
    parts = []
    parts.append(cylinder("Wayfarer_boot_left", (origin_x - 0.18, -0.18, 0.12), 0.16, 0.42, mats["leather"]))
    parts.append(cylinder("Wayfarer_boot_right", (origin_x + 0.17, -0.18, 0.12), 0.16, 0.42, mats["leather"]))
    parts.append(cylinder("Wayfarer_body", (origin_x, -0.18, 0.78), 0.34, 0.92, mats["cloth"]))
    parts.append(uv_sphere("Wayfarer_hood", (origin_x, -0.18, 1.38), (0.39, 0.39, 0.42), mats["hood"]))
    cloak = cube("Wayfarer_cloak", (origin_x, 0.18, 0.9), (0.48, 0.12, 0.68), mats["cloak"], 0.07)
    cloak.rotation_euler[0] = radians(-8)
    parts.append(cloak)
    pack = cube("Wayfarer_pack", (origin_x, 0.35, 0.92), (0.28, 0.16, 0.3), mats["leather"], 0.05)
    parts.append(pack)
    parts.append(cylinder("Wayfarer_staff", (origin_x + 0.54, -0.25, 0.92), 0.045, 1.95, mats["bronze"], rotation=(radians(10), 0, radians(-12))))
    shoulder = cube("Wayfarer_shoulder_mark", (origin_x + 0.34, -0.2, 1.07), (0.12, 0.16, 0.08), mats["bronze"], 0.03)
    parts.append(shoulder)
    for part in parts:
        for group in list(part.users_collection):
            group.objects.unlink(part)
        collection.objects.link(part)


def build_portal(collection, mats, origin_x=1.25):
    parts = []
    for x in (origin_x - 0.85, origin_x + 0.85):
        for z in (0.34, 0.84, 1.34):
            parts.append(cube("Portal_ruin_block", (x, 0.3, z), (0.33, 0.33, 0.24), mats["stone"], 0.05))
    for x in (origin_x - 0.5, origin_x, origin_x + 0.5):
        parts.append(cube("Portal_arch_block", (x, 0.3, 1.65 + abs(origin_x - x) * 0.45), (0.31, 0.33, 0.2), mats["stone"], 0.05))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.59, minor_radius=0.07, major_segments=20, minor_segments=8, location=(origin_x, 0.1, 1.03), rotation=(radians(90), 0, 0))
    ring = bpy.context.object
    ring.name = "Portal_active_ring"
    ring.data.materials.append(mats["portal"])
    parts.append(ring)
    for x in (origin_x - 0.4, origin_x + 0.4):
        crystal = uv_sphere("Portal_violet_mote", (x, -0.02, 0.72), (0.08, 0.08, 0.16), mats["portal"])
        parts.append(crystal)
    for part in parts:
        for group in list(part.users_collection):
            group.objects.unlink(part)
        collection.objects.link(part)


def build_floor(collection, mats):
    for row in range(5):
        for column in range(10):
            jitter = 0.08 if row % 2 else 0.0
            tile = cube("Flagstone", (-3.2 + column * 0.7 + jitter, 0.75, -0.1 + row * 0.55), (0.32, 0.25, 0.04), mats["floor"], 0.025)
            for group in list(tile.users_collection):
                group.objects.unlink(tile)
            collection.objects.link(tile)


def add_camera_and_lights(mats):
    bpy.ops.object.camera_add(location=(4.9, -8.6, 4.3), rotation=(radians(67), 0, radians(30)))
    camera = bpy.context.object
    bpy.context.scene.camera = camera
    target = Vector((0.0, 0.0, 0.8))
    direction = target - camera.location
    camera.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.object.light_add(type='AREA', location=(-2.8, -3.6, 5.2))
    bpy.context.object.data.energy = 750
    bpy.context.object.data.color = (0.48, 0.68, 0.73)
    bpy.context.object.data.shape = 'DISK'
    bpy.context.object.data.size = 5.0
    bpy.ops.object.light_add(type='AREA', location=(2.6, -1.8, 3.1))
    bpy.context.object.data.energy = 540
    bpy.context.object.data.color = (0.57, 0.38, 0.75)
    bpy.context.object.data.size = 3.0


def triangle_count(collection):
    return sum(
        max(0, len(polygon.vertices) - 2)
        for obj in collection.all_objects
        if obj.type == 'MESH'
        for polygon in obj.data.polygons
    )


def offset_collection(collection, x=0.0, y=0.0, z=0.0):
    for obj in collection.all_objects:
        obj.location.x += x
        obj.location.y += y
        obj.location.z += z


def main():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    for collection in list(bpy.data.collections):
        bpy.data.collections.remove(collection)
    scene = bpy.context.scene
    # Blender 5.1 exposes this engine as BLENDER_EEVEE in Python even though the UI
    # calls it EEVEE Next. Keep the script compatible with the installed headless build.
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = 'PNG'
    scene.world.color = (0.012, 0.018, 0.03)
    mats = {
        'cloth': material('Weathered teal cloth', (0.05, 0.28, 0.27)),
        'hood': material('Moss hood', (0.10, 0.18, 0.16)),
        'cloak': material('Dusk cloak', (0.12, 0.14, 0.22)),
        'leather': material('Worn leather', (0.22, 0.12, 0.08)),
        'bronze': material('Tarnished bronze', (0.27, 0.22, 0.16), metallic=0.65, roughness=0.38),
        'stone': material('Rain-dark stone', (0.13, 0.16, 0.19)),
        'floor': material('Wet slate', (0.10, 0.14, 0.16)),
        'portal': material('Faint violet', (0.26, 0.08, 0.38), emission=(0.44, 0.18, 0.75)),
    }
    floor_collection = bpy.data.collections.new('Environment_Blockout')
    wayfarer_collection = bpy.data.collections.new('Wayfarer_Blockout')
    portal_collection = bpy.data.collections.new('Portal_Blockout')
    scene.collection.children.link(floor_collection)
    scene.collection.children.link(wayfarer_collection)
    scene.collection.children.link(portal_collection)
    build_floor(floor_collection, mats)
    build_wayfarer(wayfarer_collection, mats)
    build_portal(portal_collection, mats)
    add_camera_and_lights(mats)
    RENDER_PATH.parent.mkdir(parents=True, exist_ok=True)
    EXPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(RENDER_PATH)
    bpy.ops.wm.save_as_mainfile(filepath=str(EXPORT_PATH.with_suffix('.blend')))
    bpy.ops.export_scene.gltf(filepath=str(EXPORT_PATH), export_format='GLB', export_materials='EXPORT', export_cameras=False, export_lights=False)
    bpy.ops.render.render(write_still=True)
    # The portrait proof is a staged interaction composition, not a screenshot of
    # the wide layout. Stack the portal behind the Wayfarer so the role tool and
    # active-ring cue remain legible at phone width.
    offset_collection(wayfarer_collection, x=0.85)
    offset_collection(portal_collection, x=-0.55, y=0.85, z=0.5)
    scene.render.resolution_x = 390
    scene.render.resolution_y = 844
    scene.camera.location = (2.8, -6.2, 3.25)
    phone_target = Vector((0.12, 0.35, 0.95))
    scene.camera.rotation_euler = (phone_target - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera.data.lens = 38
    scene.render.filepath = str(PHONE_RENDER_PATH)
    bpy.ops.render.render(write_still=True)
    print(f'WAYFARER_TRIANGLES={triangle_count(wayfarer_collection)}')
    print(f'PORTAL_TRIANGLES={triangle_count(portal_collection)}')
    print(f'ENVIRONMENT_TRIANGLES={triangle_count(floor_collection)}')
    print(f'MATERIALS={len(bpy.data.materials)}')
    print(f'RENDER={RENDER_PATH}')
    print(f'PHONE_RENDER={PHONE_RENDER_PATH}')
    print(f'EXPORT={EXPORT_PATH}')


if __name__ == '__main__':
    main()
