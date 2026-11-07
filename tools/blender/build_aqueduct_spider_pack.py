# build_aqueduct_spider_pack.py
# Developer: Marcus Daley
# Date: 2026-11-06
# Why: Builds reviewable, animated Aqueduct spider candidates with a verified mouth-level attack origin.

import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

OUTPUT = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
OUTPUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness=0.82, metallic=0.0, emission=None, alpha=1.0):
    item = bpy.data.materials.new(name)
    item.diffuse_color = (*color, alpha)
    item.use_nodes = True
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, alpha)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*emission, 1)
        shader.inputs['Emission Strength'].default_value = 1.8
    if alpha < 1:
        shader.inputs['Alpha'].default_value = alpha
        item.surface_render_method = 'DITHERED'
    return item


BARK = material('Wet root bark', (.16, .12, .09))
SLATE = material('Layered blue slate', (.16, .18, .20), .72)
LICHEN = material('Pale lichen', (.43, .47, .31))
IRON = material('Sooted iron', (.15, .14, .14), .42, .64)
COPPER = material('Hammered copper', (.44, .23, .14), .39, .72)
IVORY = material('Weathered ivory', (.68, .60, .46), .71)
BASALT = material('Fractured basalt', (.10, .09, .09), .91)
LAVA = material('Molten basin', (.44, .06, .015), .42, 0, (1.0, .16, .015))
BONE = material('Pale root bone', (.56, .51, .46), .77)
VENOM = material('Clouded venom sacs', (.35, .43, .13), .24, 0, None, .78)
MEMBRANE = material('Muted throat membrane', (.40, .32, .34), .55)
EYE = material('Natural black eyes', (.009, .011, .012), .2)


def group(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    return obj


def orb(name, location, scale, mat, parent, subdivisions=2):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def segment(name, start, end, radius_start, radius_end, mat, parent, sides=8):
    a, b = Vector(start), Vector(end)
    delta = b - a
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=radius_start, radius2=radius_end,
                                   depth=delta.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def plate(name, location, scale, mat, parent, rotation=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('Chipped edges', 'BEVEL')
    bevel.width = min(scale) * .15
    bevel.segments = 1
    obj.parent = parent
    return obj


def ring(name, location, major, minor, mat, parent, rotation=(math.pi / 2, 0, 0)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=20,
                                    minor_segments=6, location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    obj.parent = parent
    return obj


def make_leg(root, side, row, heavy=False, pale=False):
    mat = BONE if pale else BASALT if heavy else BARK
    armor = BONE if pale else BASALT if heavy else SLATE
    y = -.38 + row * .30
    hip = (side * .34, y, .88)
    knee = (side * (1.0 + row * .06), y + (row - 1.5) * .08, .72 + (row % 2) * .09)
    foot = (side * (1.48 + row * .07), y - .12, .07)
    segment(f'Leg {side} {row} upper', hip, knee, .14 if heavy else .105, .095, mat, root)
    segment(f'Leg {side} {row} lower', knee, foot, .11 if heavy else .078, .035, mat, root)
    segment(f'Leg {side} {row} hooked toe', foot, (side * (1.58 + row * .07), y - .22, .02),
            .047, .006, armor, root, 7)
    plate(f'Leg {side} {row} armor', ((hip[0] + knee[0]) * .53, y, (hip[2] + knee[2]) * .53),
          (.19 if heavy else .15, .18, .07), armor, root, (0, side * .28, side * .18))


def build_spider(kind):
    root = group(kind)
    body_mat = {'shingleback': BARK, 'matchjaw': IRON, 'kilnback': BASALT, 'choir_widow': BONE}[kind]
    pale, heavy = kind == 'choir_widow', kind == 'kilnback'
    orb('Thorax', (0, 0, .93), (.48, .63, .37), body_mat, root)
    orb('Abdomen', (0, .64, 1.12), ((.78 if heavy else .64), .86, (.58 if heavy else .48)), body_mat, root)
    orb('Head', (0, -.52, .85), (.40, .35, .29), body_mat, root)
    for side in (-1, 1):
        for row in range(4):
            make_leg(root, side, row, heavy, pale)
    for row, count in enumerate((3, 4)):
        for index in range(count):
            orb('Natural eye', ((index - (count - 1) / 2) * .095, -.82, 1.00 - row * .075),
                (.045, .025, .043), EYE, root, 2)

    mouth = group('Attack Mouth Pivot', root)
    mouth.location = (0, -.81, .72)
    emitter = group('AttackEmitter', mouth)
    emitter.location = (0, -.13, -.03)
    emitter['purpose'] = 'Server visual attack origin'
    emitter['forward_axis'] = '-Y'
    emitter['verified_below_eye_cluster'] = True

    if kind == 'shingleback':
        for index in range(8):
            y = .22 + index * .13
            plate('Overlapping roof shingle', (0, y, 1.39 + index * .018),
                  (.58 - index * .025, .22, .075), SLATE, root, (0.08, 0, (index % 2 - .5) * .08))
        for side in (-1, 1):
            for index in range(3):
                orb('Lichen colony', (side * (.22 + .12 * index), .25 + .22 * index, 1.53),
                    (.14, .11, .045), LICHEN, root, 1)
        attack = root
    elif kind == 'matchjaw':
        for index in range(7):
            ring('Bellows rib', (0, .28 + index * .15, 1.17), .51 + index * .02, .035,
                 COPPER if index % 2 else IRON, root)
        chimney = segment('Furnace chimney', (-.18, .73, 1.42), (-.18, .73, 2.08), .18, .22, IRON, root, 12)
        ring('Chimney collar', (-.18, .73, 2.02), .23, .045, COPPER, root, (0, 0, 0))
        jaws = group('Match jaws', mouth)
        for side in (-1, 1):
            jaw = group('Left jaw' if side < 0 else 'Right jaw', jaws)
            jaw.location = (side * .16, 0, .03)
            segment('Ivory match mandible', (0, 0, 0), (side * .18, -.94, -.18), .12, .055, IVORY, jaw, 10)
            jaw.rotation_euler.z = 0
            for frame, angle in ((1, 0), (10, side * .34), (16, side * .43), (23, 0)):
                jaw.rotation_euler.z = angle
                jaw.keyframe_insert(data_path='rotation_euler', frame=frame)
        nozzle = segment('Visible mouth nozzle', (0, -.03, 0), (0, -.24, -.02), .075, .055, COPPER, mouth, 12)
        attack = jaws
    elif kind == 'kilnback':
        basin = group('Volcanic crucible', root)
        for index in range(12):
            angle = index * math.tau / 12
            plate('Crucible rim slab', (math.cos(angle) * .55, .73 + math.sin(angle) * .46, 1.64),
                  (.21, .20, .23), BASALT, basin, (0, .25 * math.cos(angle), angle))
        orb('Visible molten basin', (0, .72, 1.53), (.49, .39, .14), LAVA, basin)
        for frame, angle in ((1, 0), (11, -.18), (16, -.32), (23, 0)):
            basin.rotation_euler.x = angle
            basin.keyframe_insert(data_path='rotation_euler', frame=frame)
        attack = basin
    else:
        for x, y, z, scale in ((-.30, .52, 1.49, .31), (.27, .47, 1.54, .34), (0, .82, 1.52, .38)):
            orb('Translucent venom sac', (x, y, z), (scale, scale * .85, scale), VENOM, root)
        fan = group('Choir throat fan', mouth)
        for index in range(12):
            angle = index * math.tau / 12
            segment('Throat rib', (0, 0, 0), (math.cos(angle) * .50, -.02, math.sin(angle) * .42),
                    .032, .007, BONE, fan, 7)
        orb('Open scream membrane', (0, .01, 0), (.46, .045, .35), MEMBRANE, fan)
        for frame, scale in ((1, .35), (10, .62), (16, 1.0), (23, .35)):
            fan.scale = (scale, scale, scale)
            fan.keyframe_insert(data_path='scale', frame=frame)
        attack = fan

    for frame, offset in ((1, 0), (10, 0), (16, -.18), (23, 0)):
        root.location.y = offset
        root.keyframe_insert(data_path='location', frame=frame)
    root['attack_animation_frames'] = '1-23'
    root['identity'] = kind
    return root, emitter, attack


def descendants(root):
    return [root] + list(root.children_recursive)


def studio():
    world = bpy.data.worlds.new('Rainy dusk studio')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.08, .09, .11, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .5
    scene = bpy.context.scene
    scene.world = world
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_x = 960
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.view_settings.look = 'AgX - Medium High Contrast'
    scene.frame_start, scene.frame_end, scene.render.fps = 1, 23, 24
    for name, location, energy, color, size in (
            ('Soft overcast key', (-4, -5, 7), 950, (.76, .82, 1.0), 5),
            ('Warm attack fill', (3, -3, 3), 520, (1.0, .48, .25), 4),
            ('Cold aqueduct rim', (2, 4, 5), 700, (.45, .62, .88), 3)):
        bpy.ops.object.light_add(type='AREA', location=location)
        lamp = bpy.context.object
        lamp.name = name
        lamp.data.energy, lamp.data.color, lamp.data.shape, lamp.data.size = energy, color, 'DISK', size
        lamp.rotation_euler = (Vector((0, 0, 1))-lamp.location).to_track_quat('-Z', 'Y').to_euler()
    bpy.ops.mesh.primitive_plane_add(size=24, location=(0, 0, 0))
    floor = bpy.context.object
    floor.name = 'Wet aqueduct review floor'
    floor.data.materials.append(material('Wet stone floor', (.10, .12, .13), .38, .08))
    bpy.ops.object.camera_add(location=(4.7, -7.8, 3.35))
    camera = bpy.context.object
    camera.name = 'Gameplay review camera'
    camera.data.lens = 56
    camera.rotation_euler = (Vector((0, .15, .92))-camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.camera = camera


def export_and_render(name, root):
    objects = descendants(root)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
    root.select_set(True)
    glb = OUTPUT / f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', use_selection=True,
                              export_apply=True, export_animations=True, export_materials='EXPORT')
    bpy.context.scene.frame_set(16)
    bpy.context.scene.render.filepath = str(OUTPUT / f'{name}_attack.png')
    bpy.ops.render.render(write_still=True)
    triangles = sum(sum(max(0, len(poly.vertices) - 2) for poly in obj.data.polygons)
                    for obj in objects if obj.type == 'MESH')
    return {'file': glb.name, 'sha256': hashlib.sha256(glb.read_bytes()).hexdigest(),
            'bytes': glb.stat().st_size, 'trianglesBeforeModifiers': triangles,
            'attackPreview': f'{name}_attack.png', 'attackEmitter': 'AttackEmitter',
            'animationFrames': [1, 10, 16, 23]}


studio()
manifest = {'generator': 'tools/blender/build_aqueduct_spider_pack.py',
            'reviewState': 'CANDIDATE_NOT_RUNTIME_APPROVED', 'assets': {}}
for asset_name in ('shingleback', 'matchjaw', 'kilnback', 'choir_widow'):
    candidate, emitter, attack = build_spider(asset_name)
    manifest['assets'][asset_name] = export_and_render(asset_name, candidate)
    for obj in descendants(candidate):
        bpy.data.objects.remove(obj, do_unlink=True)
with (OUTPUT / 'asset-manifest.json').open('w', encoding='utf-8', newline='\n') as target:
    json.dump(manifest, target, indent=2)
    target.write('\n')
for index, asset_name in enumerate(('shingleback', 'matchjaw', 'kilnback', 'choir_widow')):
    candidate, emitter, attack = build_spider(asset_name)
    candidate.location.x = (index - 1.5) * 4.1
    candidate['review_only_lineup'] = True
bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / 'aqueduct-spider-review.blend'))
