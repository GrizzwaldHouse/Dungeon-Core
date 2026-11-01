# render_asset_review.py
# Developer: Marcus Daley
# Date: 2026-10-31
# Why: Produces consistent views of the actual mesh so reference matching can be judged without confusing a generated illustration with geometry.

import bpy
import json
import math
import sys
import hashlib
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
if len(args) != 2:
    raise SystemExit('Usage: blender --background --python render_asset_review.py -- input.blend-or-glb output-folder')
source, output = Path(args[0]).resolve(), Path(args[1]).resolve()
if not source.is_file() or source.suffix.lower() not in {'.blend', '.glb'}:
    raise SystemExit('An existing .blend or .glb review source is required')
if output.exists():
    raise SystemExit('Review output exists; choose a new folder to preserve earlier evidence')
if source.suffix.lower() == '.blend':
    bpy.ops.wm.open_mainfile(filepath=str(source))
else:
    # Render the actual delivery bytes, including any material limitations of glTF.
    # This studio matches build_barkwing_reference.py, not a runtime game camera.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(source))
    studio = bpy.context.scene
    studio.render.engine = 'BLENDER_EEVEE'
    studio.world = bpy.data.worlds.new('Neutral export review studio')
    studio.world.use_nodes = True
    background = studio.world.node_tree.nodes['Background']
    background.inputs[0].default_value = (.16,.18,.21,1)
    background.inputs[1].default_value = .5
    for name, position, energy, color, size in [
        ('Soft upper left key',(-4,-5,7),1000,(.92,.95,1),5),
        ('Low violet fill',(3,-2,2),140,(.48,.36,.65),4),
        ('Cool rim',(1,3,6),850,(.65,.73,.82),4)]:
        bpy.ops.object.light_add(type='AREA', location=position)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.color = color
        light.data.shape = 'DISK'
        light.data.size = size
        light.rotation_euler = (Vector((0,0,2.7))-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add()
    studio.camera = bpy.context.object
    studio.camera.data.lens = 52
output.mkdir(parents=True)
scene = bpy.context.scene
scene.frame_set(1)
bpy.context.view_layer.update()
meshes = [o for o in scene.objects if o.type == 'MESH']
if not meshes or not scene.camera:
    raise SystemExit('Asset and review camera required')
corners = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
low = Vector(tuple(min(p[i] for p in corners) for i in range(3)))
high = Vector(tuple(max(p[i] for p in corners) for i in range(3)))
center = (low + high) / 2
radius = max((p-center).length for p in corners)
distance = radius / math.sin(scene.camera.data.angle / 2) * 1.22
views = [('front', (0,-1,.03), 900,700), ('side',(1,0,.03),900,700),
         ('angled',(.25,-1,.30),900,700), ('top',(0,-.001,1),900,700),
         ('phone-angled',(.25,-1,.30),390,844)]
outputs=[]
for name, direction, width, height in views:
    scene.render.resolution_x=width
    scene.render.resolution_y=height
    scene.render.resolution_percentage=100
    # Portrait sensor fitting narrows the horizontal view; fit against the smaller dimension.
    aspect=width/height
    half_small_angle=math.atan(scene.camera.data.sensor_width/(2*scene.camera.data.lens)*min(1,aspect))
    fitted_distance=radius/math.sin(half_small_angle)*1.15
    scene.camera.location=center+Vector(direction).normalized()*max(distance,fitted_distance)
    scene.camera.rotation_euler=(center-scene.camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(output/(name+'.png'))
    bpy.ops.render.render(write_still=True)
    outputs.append(name+'.png')
manifest={'source':str(source),'views':outputs,'renderer':scene.render.engine,
          'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),
          'blender':bpy.app.version_string,
          'sourceKind':source.suffix.lower(),
          'meshCount':len(meshes),'boundsMin':list(low),'boundsMax':list(high),
          'evidenceLimit':'Model preview only; phone-sized render does not prove physical-phone gameplay.'}
(output/'review-manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
print(json.dumps(manifest))
