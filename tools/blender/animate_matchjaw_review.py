# animate_matchjaw_review.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Refines Matchjaw's silhouette and creates an eight-leg skeletal gait plus a visible chase and attack review.

import bpy
import math
import json
from pathlib import Path
from mathutils import Vector, Matrix

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/design/matchjaw-animation-v5'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(ROOT / 'docs/design/matchjaw-sculpt-v4/matchjaw-sculpt-v4.blend'))
scene = bpy.context.scene
scene.frame_set(1)
root = bpy.data.objects['Matchjaw_Root']
root.animation_data_clear()
root.location = (0, 0, 0)
root.rotation_euler = (0, 0, 0)
bark = bpy.data.materials['Worn bark edge']
iron = bpy.data.materials['Weathered black iron']
slate = bpy.data.materials['Layered charcoal slate']
ember = bpy.data.materials['Furnace ember']

# Lower and lengthen the shell, with the jaw left at its verified origin.
for obj in root.children_recursive:
    if obj.type == 'MESH' and obj.name == 'Continuous bark carapace':
        for vertex in obj.data.vertices:
            vertex.co.z *= .87
    if obj.name.startswith(('Overlapping carapace', 'Forward skull mantle')):
        obj.location.z -= .07

# Remove obsolete leg components inside this versioned scene.
old_legs=[obj for obj in root.children_recursive if obj.name.startswith(('Leg_L_', 'Leg_R_'))]
for obj in old_legs:
    for child in list(obj.children_recursive):
        bpy.data.objects.remove(child, do_unlink=True)
    bpy.data.objects.remove(obj, do_unlink=True)
for obj in list(root.children_recursive):
    if obj.name.startswith(('Jagged leg bark armor', 'Left ragged furnace fin', 'Right ragged furnace fin', 'Furnace chimney', 'Furnace vent')):
        bpy.data.objects.remove(obj, do_unlink=True)


def cone(name, a, b, r1, r2, mat, parent=root, sides=9):
    a, b = Vector(a), Vector(b)
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r1, radius2=r2, depth=(b-a).length, location=(a+b)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = (b-a).to_track_quat('Z', 'Y').to_euler()
    obj.parent = parent
    obj.data.materials.append(mat)
    for poly in obj.data.polygons:
        poly.use_smooth = True
    return obj


# Open cage with actual gaps and dark inner flue instead of a closed cylinder.
cone('Inner furnace flue', (-.26,.58,1.68), (-.26,.58,2.42), .115,.13,iron)
for i in range(12):
    a = i*math.tau/12
    x,y = -.26+math.cos(a)*.2,.58+math.sin(a)*.2
    cone('Perforated furnace cage rib', (x,y,1.72),(x,y,2.39),.021,.017,iron)
cone('Inner furnace coal',(-.26,.58,1.8),(-.26,.58,2.18),.119,.12,ember)

# Ragged leaf membranes with uneven boundaries and branching veins.
for side in (-1,1):
    vertices=[(side*.2,1.2,1.55),(side*.53,1.36,1.89),(side*.92,1.6,2.0),
              (side*.75,1.65,1.77),(side*.96,1.84,1.75),(side*.57,1.7,1.57),
              (side*.69,1.96,1.48),(side*.36,1.78,1.47),(side*.19,1.92,1.32)]
    mesh=bpy.data.meshes.new('Torn leaf membrane')
    mesh.from_pydata(vertices,[],[(0,i,i+1) for i in range(1,len(vertices)-1)])
    obj=bpy.data.objects.new('Torn rear leaf fin',mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent=root
    obj.data.materials.append(bark)
    solid=obj.modifiers.new('Leaf thickness','SOLIDIFY');solid.thickness=.018
    for index in (2,4,6,8):
        cone('Rear fin branching vein',vertices[0],vertices[index],.025,.004,bark)

arm=bpy.data.armatures.new('Matchjaw eight-leg skeleton')
rig=bpy.data.objects.new('Matchjaw_Gait_Rig',arm)
bpy.context.collection.objects.link(rig)
rig.parent=root
bpy.context.view_layer.objects.active=rig
rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
legs=[]
for side in (-1,1):
    for i in range(4):
        y=-.5+i*.35
        hip=Vector((side*.4,y,.92))
        knee=Vector((side*(1.08+i*.07),y+(i-1.5)*.18,1.03))
        foot=Vector((side*(1.64+i*.06),y+(i-1.5)*.3,.045))
        names=[]
        for j,(a,b) in enumerate(((hip,knee),(knee,foot))):
            name=f'Leg_{side}_{i}_{j}'
            bone=arm.edit_bones.new(name);bone.head=a;bone.tail=b
            names.append(name)
        legs.append((side,i,hip,knee,foot,names))
bpy.ops.object.mode_set(mode='OBJECT')

for side,i,hip,knee,foot,names in legs:
    for j,(a,b) in enumerate(((hip,knee),(knee,foot))):
        obj=cone('Tapered bark leg segment',a,b,.105 if j==0 else .085,.061 if j==0 else .013,bark)
        bpy.context.view_layer.objects.active=obj
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
        obj.parent=rig
        for vertex in obj.data.vertices:
            # Uneven bark cross-section breaks the smooth cylinder silhouette.
            vertex.co.x += math.sin(vertex.index*2.37)*.017
            vertex.co.y += math.cos(vertex.index*1.79)*.017
        group=obj.vertex_groups.new(name=names[j]);group.add(list(range(len(obj.data.vertices))),1,'REPLACE')
        mod=obj.modifiers.new('Eight-leg skeletal deformation','ARMATURE');mod.object=rig

max_foot_penetration=0
for frame in range(1,145):
    scene.frame_set(frame)
    walking=frame<=96
    travel=min(frame-1,95)*(.43/.6/24)
    root.location.y=-travel
    root.keyframe_insert(data_path='location',frame=frame)
    for side,i,hip,knee,foot,names in legs:
        phase=((frame-1)/24+(i%2)*.5+(0 if side<0 else .5))%1
        lift=math.sin(math.pi*phase/.4)*.24 if phase<.4 and walking else 0
        stride=((phase/.4-.5)*.43 if phase<.4 else (.5-(phase-.4)/.6)*.43) if walking else 0
        target=foot+Vector((0,-stride,lift))
        # Two-bone analytic solve keeps bone lengths constant through the gait.
        l1=(knee-hip).length;l2=(foot-knee).length
        delta=target-hip;dist=min(delta.length,l1+l2-.001);direction=delta.normalized()
        projection=(l1*l1-l2*l2+dist*dist)/(2*dist)
        outward=Vector((side,0,1.8));outward=(outward-direction*outward.dot(direction)).normalized()
        joint=hip+direction*projection+outward*math.sqrt(max(0,l1*l1-projection*projection))
        for j,(a,b) in enumerate(((hip,joint),(joint,target))):
            pose=rig.pose.bones[names[j]]
            pose.matrix=Matrix.LocRotScale(a,(b-a).to_track_quat('Y','Z'),Vector((1,1,1)))
            pose.keyframe_insert(data_path='location',frame=frame)
            pose.keyframe_insert(data_path='rotation_quaternion',frame=frame)
            pose.keyframe_insert(data_path='scale',frame=frame)
        max_foot_penetration=max(max_foot_penetration,max(0,-target.z))
    for side,name in ((-1,'Left_Tusk_Pivot'),(1,'Right_Tusk_Pivot')):
        jaw=bpy.data.objects[name];jaw.animation_data_clear() if frame==1 else None
        jaw.rotation_euler.z=side*.38*max(0,math.sin((frame-97)/47*math.pi)) if frame>=97 else 0
        jaw.keyframe_insert(data_path='rotation_euler',frame=frame)

scene.frame_start=1;scene.frame_end=144;scene.render.fps=24
scene.frame_set(108)
scene.camera.location=(5,-9,4)
scene.camera.rotation_euler=(Vector((0,-1,1))-scene.camera.location).to_track_quat('-Z','Y').to_euler()
scene.render.resolution_x=960;scene.render.resolution_y=720
scene.render.filepath=str(OUT/'matchjaw-v5-attack.png')
bpy.ops.render.render(write_still=True)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'matchjaw-animation-v5.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in [root]+list(root.children_recursive):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'matchjaw-animation-v5.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=True)
(OUT/'animation-report.json').write_text(json.dumps({'frames':144,'fps':24,'walkFrames':[1,96],'attackFrames':[97,144],'skeletonBones':16,'legs':8,'maxPlannedFootPenetration':max_foot_penetration,'review':'Animation study; runtime chase and collision not yet tested'},indent=2))
print('MATCHJAW_ANIMATION_COMPLETE')
