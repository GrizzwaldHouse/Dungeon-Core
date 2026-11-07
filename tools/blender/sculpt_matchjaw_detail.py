# sculpt_matchjaw_detail.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Refines the existing Matchjaw with contour-following armor, an expressive jaw, and layered bark relief.

import bpy
import math
import random
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/design/matchjaw-sculpt-v4'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'docs/design/matchjaw-surface-v3/matchjaw-surface-v3.blend'))
scene = bpy.context.scene
scene.frame_set(1)
root = bpy.data.objects['Matchjaw_Root']
random.seed(47)
slate = bpy.data.materials['Layered charcoal slate']
bark = bpy.data.materials['Worn bark edge']
iron = bpy.data.materials['Weathered black iron']
wood = bpy.data.materials['Scorched wooden tusks']


def ridge(name, points, radius, material):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 1
    spline = curve.splines.new('POLY')
    spline.points.add(len(points) - 1)
    for i, p in enumerate(points):
        spline.points[i].co = (*p, 1)
        spline.points[i].radius = .35 + .65 * math.sin(math.pi * (i + .5) / len(points))
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.parent = root
    obj.data.materials.append(material)
    return obj


def scale(name, center, width, length, material, rotation=(0, 0, 0)):
    outline = [(-.8, -.65), (-.3, -1), (.35, -.91), (.9, -.5), (.72, .2), (.28, 1), (-.12, .58), (-.75, .4)]
    verts = [(x * width, y * length, 0) for x, y in outline]
    verts += [(0, -.12 * length, .11), (0, -.12 * length, -.035)]
    faces = [(i, (i + 1) % 8, 8) for i in range(8)] + [((i + 1) % 8, i, 9) for i in range(8)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = center
    obj.rotation_euler = rotation
    obj.parent = root
    obj.data.materials.append(material)
    bevel = obj.modifiers.new('Chipped plate perimeter', 'BEVEL')
    bevel.width = .022
    bevel.segments = 2
    return obj


# Replace block armor within the new scene only; preserve earlier source files.
for obj in list(root.children_recursive):
    if any(key in obj.name for key in ('Layered skull crown', 'cheek guard', 'Side abdomen scale', 'Leg slate')):
        bpy.data.objects.remove(obj, do_unlink=True)

# The upper carapace follows the abdomen curvature rather than floating over it.
for row in range(7):
    y = .2 + row * .19
    for column in range(-2, 3):
        angle = column * .4
        x = math.sin(angle) * .82
        z = 1.32 + math.cos(angle) * (.67 - abs(y - .78) * .13)
        scale('Overlapping carapace shingle', (x, y, z), .19, .22, slate,
              (random.uniform(-.1, .1), angle, random.uniform(-.1, .1)))

# Brow and cheek structure frames the mouth without hiding it.
for side in (-1, 1):
    for i in range(3):
        scale('Serrated cheek bark', (side * (.29 + i * .065), -.83 + i * .08, .92 + i * .055),
              .14, .23, bark, (.45, side * .5, side * .25))
    ridge('Heavy skull brow', [(side * .04, -.98, 1.1), (side * .18, -.99, 1.16),
                             (side * .36, -.91, 1.15), (side * .46, -.76, 1.08)], .06, slate)
    ridge('Mandible cheek ridge', [(side * .13, -.98, .66), (side * .3, -.98, .72),
                                  (side * .43, -.86, .88)], .05, bark)
    for i in range(7):
        x = side * (.07 + i * .034)
        ridge('Curved jaw tooth', [(x, -1.02, .84), (x + side * .02, -1.1, .77),
                                  (x + side * .025, -1.1, .73)], .018, wood)

# Extend the bark mantle forward over the exposed continuous body.
for row in range(6):
    y = -.62 + row * .18
    for column in range(-2, 3):
        angle = column * .37
        x = math.sin(angle) * .53
        z = 1.06 + math.cos(angle) * (.41 + row * .055)
        scale('Forward skull mantle', (x, y, z), .13 + row * .012, .17, bark,
              (.12, angle, random.uniform(-.14, .14)))

for side in (-1, 1):
    for index in range(4):
        y = -.48 + index * .34
        hip = Vector((side * .37, y, .92))
        knee = Vector((side * (.94 + .07 * index), y - .11 + index * .075, .72 + .08 * (index % 2)))
        for step in range(3):
            center = hip.lerp(knee, .25 + step * .27)
            scale('Jagged leg bark armor', center + Vector((0, 0, .09)), .14, .16, slate,
                  (.1, side * .35, side * 1.1))

# Raised organic fissures provide real geometry at grazing angles.
for i in range(26):
    angle = i / 26 * math.tau
    points = []
    for step in range(9):
        t = step / 8
        y = -.48 + t * 1.9
        radius = .43 + .23 * math.sin(t * math.pi)
        a = angle + math.sin(t * 9 + i) * .05
        points.append((math.sin(a) * radius, y, 1.04 + math.cos(a) * radius))
    ridge('Layered longitudinal bark grain', points, .012 + (i % 3) * .005, bark)

for obj in list(root.children_recursive):
    if obj.type != 'CURVE':
        continue
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.convert(target='MESH')

for obj in root.children_recursive:
    if obj.type != 'MESH' or obj.data.uv_layers:
        continue
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(island_margin=.03)
    bpy.ops.object.mode_set(mode='OBJECT')

for name, position in (('angled', (4.8, -7.8, 3.8)), ('front', (0, -8.5, 2.7)), ('side', (8.5, -.2, 2.7))):
    scene.camera.location = position
    scene.camera.rotation_euler = (Vector((0, .1, 1)) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / ('matchjaw-v4-' + name + '.png'))
    bpy.ops.render.render(write_still=True)

# Save a useful camera/material viewport for headed review.
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            area.spaces.active.region_3d.view_perspective = 'CAMERA'
            area.spaces.active.shading.type = 'MATERIAL'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'matchjaw-sculpt-v4.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in [root] + list(root.children_recursive):
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'matchjaw-sculpt-v4.glb'), export_format='GLB', use_selection=True, export_apply=True, export_animations=True)
print('MATCHJAW_V4_EXPORT_COMPLETE')
