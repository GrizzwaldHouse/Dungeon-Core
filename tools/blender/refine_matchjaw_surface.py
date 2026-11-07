# refine_matchjaw_surface.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Blends intersecting body masses and embeds portable textured surfaces into the existing Matchjaw candidate.

import bpy
import math
import json
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'docs/design/matchjaw-production-v2/matchjaw-production-v2.blend'
OUT = ROOT / 'docs/design/matchjaw-surface-v3'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
scene = bpy.context.scene
scene.frame_set(1)
scene.render.engine = 'BLENDER_EEVEE'
root = bpy.data.objects['Matchjaw_Root']

# Fuse only static body volumes, retaining independent attack pivots.
body_parts = [bpy.data.objects[name] for name in ('Bark iron thorax', 'Armored furnace abdomen', 'Skull bark head')]
bpy.ops.object.select_all(action='DESELECT')
for obj in body_parts:
    obj.animation_data_clear()
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    for modifier in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.context.view_layer.objects.active = body_parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'Continuous bark carapace'
bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
remesh = body.modifiers.new('Blend intersecting body volumes', 'REMESH')
remesh.mode = 'VOXEL'
remesh.voxel_size = .045
bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth = body.modifiers.new('Relax body transitions', 'SMOOTH')
smooth.factor = 1.2
smooth.iterations = 9
bpy.ops.object.modifier_apply(modifier=smooth.name)
for polygon in body.data.polygons:
    polygon.use_smooth = True
body.data.materials.clear()
body.data.materials.append(bpy.data.materials['Soot-dark Deepwood bark'])

# Make armor edges less block-like without welding moving components.
for obj in root.children_recursive:
    if obj.type != 'MESH':
        continue
    for modifier in obj.modifiers:
        if modifier.type == 'BEVEL':
            modifier.segments = 3
            modifier.width *= 1.5


def texture_image(name, base, kind):
    size = 256
    color = bpy.data.images.new(name + ' albedo', width=size, height=size)
    rough = bpy.data.images.new(name + ' roughness', width=size, height=size)
    normal = bpy.data.images.new(name + ' normal', width=size, height=size)
    rough.colorspace_settings.name = 'Non-Color'
    normal.colorspace_settings.name = 'Non-Color'
    colors, roughness, normals = [], [], []
    for y in range(size):
        for x in range(size):
            u, v = x / size, y / size
            grain = math.sin(u * math.tau * 27 + math.sin(v * math.tau * 3) * 2)
            fine = math.sin(x * 12.9898 + y * 78.233) * 43758.5453
            noise = fine - math.floor(fine)
            groove = max(0, grain) ** 12
            factor = .62 + noise * .34 + grain * .11
            if kind == 'wood':
                factor -= groove * .32
            else:
                factor = .65 + noise * .5 - groove * .11
            colors.extend([max(0, min(1, c * factor)) for c in base] + [1])
            r = min(.98, (.72 if kind == 'wood' else .48) + noise * .2)
            roughness.extend([r, r, r, 1])
            normals.extend([.5 + grain * .12, .5 + (noise - .5) * .12, .98, 1])
    for image, pixels in ((color, colors), (rough, roughness), (normal, normals)):
        image.pixels.foreach_set(pixels)
        image.filepath_raw = str(OUT / (image.name + '.png'))
        image.file_format = 'PNG'
        image.save()
        image.pack()
    return color, rough, normal


textured = []
for name in ('Soot-dark Deepwood bark', 'Worn bark edge', 'Weathered black iron', 'Oxidized copper braces', 'Layered charcoal slate', 'Scorched wooden tusks'):
    mat = bpy.data.materials[name]
    shader = mat.node_tree.nodes.get('Principled BSDF')
    base = tuple(shader.inputs['Base Color'].default_value[:3])
    kind = 'wood' if any(word in name for word in ('bark', 'wooden')) else 'metal'
    albedo, roughness, normal = texture_image(name, base, kind)
    for label, image, socket in (('Albedo', albedo, 'Base Color'), ('Roughness', roughness, 'Roughness')):
        node = mat.node_tree.nodes.new('ShaderNodeTexImage')
        node.label = label
        node.image = image
        mat.node_tree.links.new(node.outputs['Color'], shader.inputs[socket])
    tex = mat.node_tree.nodes.new('ShaderNodeTexImage')
    tex.image = normal
    bump = mat.node_tree.nodes.new('ShaderNodeNormalMap')
    bump.inputs['Strength'].default_value = .65
    mat.node_tree.links.new(tex.outputs['Color'], bump.inputs['Color'])
    mat.node_tree.links.new(bump.outputs['Normal'], shader.inputs['Normal'])
    textured.append(name)

objects = [root] + list(root.children_recursive)
for obj in objects:
    if obj.type != 'MESH':
        continue
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=.03)
    bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'matchjaw-surface-v3.glb'), export_format='GLB', use_selection=True, export_apply=True, export_animations=True)
scene.render.resolution_x = 1000
scene.render.resolution_y = 850
scene.render.resolution_percentage = 100
for name, position in (('angled', (4.8, -7.8, 3.8)), ('front', (0, -8.5, 2.7)), ('side', (8.5, -.2, 2.7))):
    scene.camera.location = position
    scene.camera.rotation_euler = (Vector((0, .1, 1)) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(OUT / ('matchjaw-v3-' + name + '.png'))
    bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'matchjaw-surface-v3.blend'))
report = {'state': 'SURFACE_REVIEW_REQUIRED', 'source': str(SOURCE), 'bodyOperation': 'Voxel union and smoothing of three body masses', 'texturedMaterials': textured, 'textureResolution': 256, 'maps': ['albedo', 'roughness', 'normal'], 'attackAnchorsPreserved': all(bpy.data.objects.get(n) for n in ('Attack_Mouth_Pivot', 'AttackEmitter')), 'limitation': 'Reference sculpt detail and shared atlas optimization remain pending. Body expansion clip removed after body union; jaw and root animation retained.'}
(OUT / 'surface-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
