# refine_matchjaw_geometry_v8.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Give the existing Matchjaw a readable skull, recessed mouth, and joint-following bark armor without changing its rig or attack anchor.

import bpy
import json
import math
import tempfile
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/design/matchjaw-armored-v7/matchjaw-armored-v7.blend'
OUT = ROOT / 'docs/design/matchjaw-v8-geometry'
OUT.mkdir(parents=True, exist_ok=True)
tempfile.tempdir = str(OUT)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))

root = bpy.data.objects['Matchjaw_Root']
rig = bpy.data.objects['Matchjaw_Gait_Rig']
bark = bpy.data.materials['Worn bark edge']
slate = bpy.data.materials['Layered charcoal slate']
soot = bpy.data.materials['Furnace carbon soot']
dark = bpy.data.materials['Natural black eyes']


def mesh_object(name, vertices, faces, material, parent=root):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    mesh.materials.append(material)
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    return obj


# The v7 face remains intact. Two earlier broad skull sheets failed the
# independent reference comparison and are intentionally omitted.

# A dark setback and broken bark lip makes the attack source read as a mouth.
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=.145, depth=.06,
                                    location=(0, -1.116, .765), rotation=(math.pi / 2, 0, 0))
recess = bpy.context.object
recess.name = 'V8 recessed throat'
recess.parent = root
recess.data.materials.append(soot)
bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6,
                                 location=(0, -1.17, .765), rotation=(math.pi / 2, 0, 0),
                                 major_radius=.145, minor_radius=.027)
lip = bpy.context.object
lip.name = 'V8 serrated mouth rim'
lip.parent = root
lip.data.materials.append(bark)
for polygon in lip.data.polygons:
    polygon.use_smooth = True

# The stock body already has enough topology. Smooth normals and layered armor
# keep the silhouette organic while the texture pass adds its bark microdetail.
carapace = bpy.data.objects['Continuous bark carapace']
for polygon in carapace.data.polygons:
    polygon.use_smooth = True
for obj in root.children_recursive:
    if obj.name.startswith('Abdomen rib'):
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
        bevel = obj.modifiers.new('Rounded weathered rib edge', 'BEVEL')
        bevel.width = .016
        bevel.segments = 2

# The first v8 rear fan was a wall-like sail, farther from the approved image.
# Keep the v7 ragged fins while a sculpted rear shell is developed separately.
fan_plates = 0

# Bound plates keep their named bone weights. Narrow bevels remove box edges
# without changing the eight-legged gait skeleton.
plates = 0
for obj in rig.children_recursive:
    if obj.name.startswith('Tapered bark leg segment'):
        bevel = obj.modifiers.new('Worn limb contour', 'BEVEL')
        bevel.width = .027
        bevel.segments = 2
        while list(obj.modifiers).index(bevel) > 0:
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_move_up(modifier=bevel.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True
    elif obj.name.startswith('BarkPlate_'):
        plates += 1
        solid = obj.modifiers.new('Bark plate thickness', 'SOLIDIFY')
        solid.thickness = .017
        while list(obj.modifiers).index(solid) > 0:
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.modifier_move_up(modifier=solid.name)
        for polygon in obj.data.polygons:
            polygon.use_smooth = True

# Preserve the original combat and animation anchors for the downstream pack.
assert plates == 48, f'Expected 48 bone-bound plates, found {plates}'
assert len(rig.data.bones) == 16
assert bpy.data.objects['AttackEmitter'].parent.name == 'Attack_Mouth_Pivot'

scene = bpy.context.scene
scene.render.resolution_x = 960
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
camera = bpy.data.objects['Review camera']
scene.camera = camera
target = Vector((0, .22, 1.4))
views = {
    'angled': (6.5, -10.0, 4.1),
    'front': (0.0, -9.0, 2.6),
    'side': (9.0, -.5, 3.0),
    'gameplay': (6.0, -10.0, 7.5),
}
scene.frame_set(20)
for label, position in views.items():
    camera.location = position
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / f'matchjaw-v8-{label}.png')
    bpy.ops.render.render(write_still=True)

scene.frame_set(1)
camera.location = views['angled']
camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'matchjaw-v8-geometry.blend'))
print(json.dumps({'source': str(SOURCE), 'plates': plates, 'bones': len(rig.data.bones),
                  'fanPlates': fan_plates,
                  'emitterWorld': list(bpy.data.objects['AttackEmitter'].matrix_world.translation),
                  'views': list(views)}))
