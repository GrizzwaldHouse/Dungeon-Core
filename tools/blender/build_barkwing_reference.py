# build_barkwing_reference.py
# Developer: Marcus Daley
# Date: 2026-10-31
# Why: Reconstructs the accepted Meshy screenshot silhouette as an editable local candidate while the external conversion is unavailable.

import bpy
import math
import json
import sys
from pathlib import Path
from mathutils import Vector

out = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, roughness, glow=0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = roughness
    if glow:
        bs.inputs['Emission Color'].default_value = (*color, 1)
        bs.inputs['Emission Strength'].default_value = glow
    else:
        noise = m.node_tree.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 19
        bump = m.node_tree.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = .24
        bump.inputs['Distance'].default_value = .06
        m.node_tree.links.new(noise.outputs['Fac'], bump.inputs['Height'])
        m.node_tree.links.new(bump.outputs['Normal'], bs.inputs['Normal'])
    return m

bark = mat('Weathered charcoal bark', (.075,.058,.045), .9)
ridge = mat('Ash bark ridges', (.18,.155,.11), .87)
leaf = mat('Dead moss leaf', (.14,.16,.075), .94)
leaf2 = mat('Weathered olive leaf', (.20,.21,.12), .9)
core = mat('Faint violet fissures', (.19,.055,.30), .5, 1.3)
eyes = mat('Dull amber eyes', (.5,.20,.035), .5, 1.4)

def empty(name, parent=None):
    obj=bpy.data.objects.new(name,None)
    bpy.context.collection.objects.link(obj)
    obj.parent=parent
    return obj

root=empty('Barkwing Reference Reconstruction')
body=empty('01 Bark torso and crown',root)

def segment(name,a,b,r1,r2,material,parent):
    delta=Vector(b)-Vector(a)
    bpy.ops.mesh.primitive_cone_add(vertices=7,radius1=r1,radius2=r2,depth=delta.length,location=(Vector(a)+Vector(b))/2)
    obj=bpy.context.object
    obj.name=name
    obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler()
    obj.data.materials.append(material)
    obj.parent=parent
    return obj

def joint(name,p,scale,material,parent):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p)
    obj=bpy.context.object
    obj.name=name
    obj.scale=scale
    obj.data.materials.append(material)
    obj.parent=parent
    return obj

segment('Narrow tapered torso',(0,0,1.8),(0,0,3.45),.15,.32,bark,body)
joint('Angular bark head',(0,-.07,3.48),(.24,.20,.34),bark,body)
for s in [-1,1]:
    for i in range(5):
        z=2.05+i*.24
        segment('Overlapping torso bark',(.04*s,-.11,z),(.27*s,-.03,z+.36),.085,.025,ridge,body)
    segment('Forked crown',(.12*s,0,3.6),(.52*s,.04,4.25),.09,.005,ridge,body)
    segment('Crown secondary fork',(.3*s,.02,3.92),(.59*s,.04,4.08),.045,0,bark,body)
    joint('Small amber eye',(.10*s,-.245,3.55),(.035,.025,.045),eyes,body)
    segment('Violet core seam',(.015*s,-.18,2.55),(.04*s,-.24,3.27),.018,.012,core,body)

wings=[]
for s,label in [(-1,'Left'),(1,'Right')]:
    wing=empty('02 '+label+' leaf wing',root)
    wings.append(wing)
    shoulder=(s*.22,.05,3.30)
    elbow=(s*1.32,.12,3.96)
    tip=(s*3.22,.13,4.42)
    segment('Wing shoulder spar',shoulder,elbow,.14,.095,bark,wing)
    segment('Wing leading spar',elbow,tip,.10,.008,ridge,wing)
    # Each rib owns a torn membrane strip, giving readable gaps instead of a single flat ellipse.
    for i in range(7):
        t=i/6
        a=Vector((s*(.46+2.5*t),.08,3.43+.82*t))
        b=Vector((s*(.74+2.1*t),.04,2.15+.95*t))
        segment('Branch wing rib '+str(i),a,b,.063,.009,ridge,wing)
        if i<6:
            nxt=Vector((s*(.74+2.1*(t+1/6)),.04,2.15+.95*(t+1/6)))
            top=Vector((s*(.46+2.5*(t+1/6)),.08,3.43+.82*(t+1/6)))
            middle=(b+nxt)/2+Vector((0,-.04,-.20 if i%2==0 else -.09))
            vertices=[a,top,nxt,middle,b,(a+b)/2+Vector((0,-.12,0))]
            mesh=bpy.data.meshes.new('Torn leaf panel')
            mesh.from_pydata(vertices,[],[(0,1,5),(1,2,5),(2,3,5),(3,4,5),(4,0,5)])
            mesh.update()
            obj=bpy.data.objects.new(label+' ragged membrane '+str(i),mesh)
            bpy.context.collection.objects.link(obj)
            obj.parent=wing
            obj.data.materials.append(leaf if i%2 else leaf2)
            solid=obj.modifiers.new('Thin leaf thickness','SOLIDIFY')
            solid.thickness=.015
            segment('Leaf lateral vein',a.lerp(b,.45),middle,.018,.004,ridge,wing)
    talon=empty('03 '+label+' root talon',root)
    hip=(s*.12,0,2.06)
    knee=(s*.26,-.03,1.55)
    ankle=(s*.22,-.08,1.07)
    segment('Root thigh',hip,knee,.10,.065,bark,talon)
    segment('Root shin',knee,ankle,.067,.045,ridge,talon)
    for j in range(3):
        toe=(s*.22+(j-1)*.13,-.25, .88)
        hook=(toe[0],-.38,1.0)
        segment('Root claw',ankle,toe,.038,.019,bark,talon)
        segment('Hooked claw tip',toe,hook,.02,0,ridge,talon)

# Rigid wing motion is a preview clip; skeletal deformation remains a later acceptance gate.
for wing,s in zip(wings,[-1,1]):
    wing.rotation_mode='XYZ'
    for frame,angle in [(1,-6),(7,10),(13,-6)]:
        wing.rotation_euler.y=math.radians(angle*s)
        wing.keyframe_insert(data_path='rotation_euler',frame=frame)

scene=bpy.context.scene
scene.frame_start=1
scene.frame_end=13
scene.render.fps=24
scene.frame_set(1)
world=bpy.data.worlds.new('Neutral reference studio')
scene.world=world
world.use_nodes=True
world.node_tree.nodes['Background'].inputs[0].default_value=(.16,.18,.21,1)
world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,location,energy,color,size in [
    ('Soft upper left key',(-4,-5,7),1000,(.92,.95,1),5),
    ('Low violet fill',(3,-2,2),140,(.48,.36,.65),4),
    ('Cool rim',(1,3,6),850,(.65,.73,.82),4)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    lamp=bpy.context.object
    lamp.name=name
    lamp.data.energy=energy
    lamp.data.color=color
    lamp.data.shape='DISK'
    lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,2.7))-lamp.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.2,-11,5.1))
cam=bpy.context.object
cam.name='Default downward perspective'
cam.data.lens=52
cam.rotation_euler=(Vector((0,0,2.7))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.camera=cam
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1100
scene.render.resolution_y=850
scene.render.resolution_percentage=100
scene.render.filepath=str(out/'barkwing-reference-review.png')
bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'barkwing-reference.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type in {'MESH','EMPTY'}:
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(out/'barkwing-reference.glb'),export_format='GLB',use_selection=True,export_animations=True)
print('BARKWING_REFERENCE_COMPLETE '+str(out))
