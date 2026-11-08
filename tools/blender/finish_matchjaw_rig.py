# finish_matchjaw_rig.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Binds layered bark armor to the existing gait skeleton and measures evaluated animation before gameplay admission.

import bpy
import math
import json
import tempfile
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/design/matchjaw-armored-v7'
OUT.mkdir(parents=True,exist_ok=True)
tempfile.tempdir=str(OUT)
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'docs/design/matchjaw-animation-v5/matchjaw-animation-v5.blend'))
scene=bpy.context.scene
scene.frame_set(1)
root=bpy.data.objects['Matchjaw_Root']
rig=bpy.data.objects['Matchjaw_Gait_Rig']
bark=bpy.data.materials['Worn bark edge']
slate=bpy.data.materials['Layered charcoal slate']
iron=bpy.data.materials['Weathered black iron']

# Plates are authored in rest space and rigidly weighted to exactly one bone.
armor=[]
for bone in rig.data.bones:
    direction=(bone.tail_local-bone.head_local).normalized()
    normal=Vector((0,0,1))
    across=direction.cross(normal).normalized()
    normal=across.cross(direction).normalized()
    for layer in range(3):
        center=bone.head_local.lerp(bone.tail_local,.18+layer*.26)+normal*.075
        width=(.13 if bone.name.endswith('_0') else .1)*(1+.09*math.sin(layer*2.8))
        length=bone.length*.18
        outline=[(-.83,-.82),(-.32,-1),(.4,-.89),(.91,-.5),(1,.11),(.73,.47),(.21,.92),(-.14,1),(-.51,.55),(-1,.06)]
        verts=[center+across*(x*width)+direction*(y*length) for x,y in outline]
        verts += [center+normal*.065,center-normal*.025]
        faces=[(i,(i+1)%10,10) for i in range(10)]+[((i+1)%10,i,11) for i in range(10)]
        mesh=bpy.data.meshes.new('Bone bound bark plate');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new('BarkPlate_'+bone.name+'_'+str(layer),mesh)
        bpy.context.collection.objects.link(obj);obj.parent=rig
        mesh.materials.append(slate if layer%2==0 else bark)
        weights=obj.vertex_groups.new(name=bone.name);weights.add(list(range(len(verts))),1,'REPLACE')
        mod=obj.modifiers.new('Skeletal plate binding','ARMATURE');mod.object=rig
        armor.append(obj)

# Curve and shorten the existing tusks so the mouth reads as hooked anatomy.
for side in (-1,1):
    name='Scorched match tusk' if side<0 else 'Scorched match tusk.001'
    obj=bpy.data.objects[name]
    tip=bpy.data.objects['Heated tusk tip' if side<0 else 'Heated tusk tip.001']
    rings=[(-.634,.11),(-.47,.105),(-.3,.09),(-.12,.075),(.06,.048),(.28,.018)]
    verts=[];faces=[]
    for ring,(z,radius) in enumerate(rings):
        t=ring/(len(rings)-1)
        for index in range(12):
            angle=2*math.pi*index/12
            shift_x=side*(.055*math.sin(t*math.pi)+.035*t*t)
            shift_y=.09*t*t
            ridge=1+.08*math.sin(index*3+ring*2)
            verts.append((shift_x+math.cos(angle)*radius*ridge,
                          shift_y+math.sin(angle)*radius*.8*ridge,z))
    for ring in range(len(rings)-1):
        for index in range(12):
            a=ring*12+index;b=ring*12+(index+1)%12
            faces.append((a,b,b+12,a+12))
    faces.extend((tuple(reversed(tuple(range(12)))),tuple((len(rings)-1)*12+i for i in range(12))))
    mesh=bpy.data.meshes.new('Hooked scorched tusk')
    mesh.from_pydata(verts,[],faces);mesh.update()
    mesh.materials.append(bpy.data.materials['Scorched wooden tusks'])
    obj.data=mesh
    tip.location=obj.matrix_local@Vector((side*.035+.055*.0,.09,.28))
    tip.scale=(.55,.55,.68)

# Vary old-leaf material, thickness and add smaller layered tears to the existing fins.
fin_tears=[]
for obj in list(root.children_recursive):
    if not obj.name.startswith('Torn rear leaf fin'):
        continue
    for vertex in obj.data.vertices:
        vertex.co.z += math.sin(vertex.index*4.3)*.035
    obj.data.materials.append(slate)
    for polygon in obj.data.polygons:
        polygon.material_index=polygon.index%2
    for modifier in obj.modifiers:
        if modifier.type=='SOLIDIFY':modifier.thickness=.012
    points=[obj.data.vertices[index].co.copy() for index in (2,4,6,8)]
    for index in range(3):
        a,b=points[index:index+2]
        middle=a.lerp(b,.5)
        inward=middle.lerp(obj.data.vertices[0].co,.35)
        jag=Vector((.02*(-1 if index%2 else 1),.04,.025))
        mesh=bpy.data.meshes.new('Rear fin frayed edge')
        mesh.from_pydata([a,middle+jag,b,inward],[],[(0,1,3),(1,2,3)])
        mesh.materials.append(bark if index%2==0 else slate);mesh.update()
        strip=bpy.data.objects.new('Rear fin fray_'+obj.name+'_'+str(index),mesh)
        bpy.context.collection.objects.link(strip);strip.parent=root
        fin_tears.append(strip)

# Deep soot lip above the actual open cage, with a restrained carbon surface.
soot=iron.copy();soot.name='Furnace carbon soot'
shader=soot.node_tree.nodes.get('Principled BSDF')
for link in list(soot.node_tree.links):
    if link.to_socket==shader.inputs['Base Color']:soot.node_tree.links.remove(link)
shader.inputs['Base Color'].default_value=(.008,.009,.01,1)
shader.inputs['Roughness'].default_value=.98
for obj in root.children_recursive:
    if obj.name.startswith(('Chimney copper collar','Perforated furnace cage rib')):
        obj.data.materials.clear();obj.data.materials.append(soot if obj.location.z>2.1 else iron)

# Dark cutout slits and restrained ember seams make the furnace cage readable.
for row,z in enumerate((1.91,2.13)):
    for index in range(8):
        angle=2*math.pi*index/8
        x=-.26+math.cos(angle)*.205
        y=.58+math.sin(angle)*.205
        mesh=bpy.data.meshes.new('Furnace soot vent')
        r=.034
        mesh.from_pydata([(x-r,y-r,z-.07),(x+r,y-r,z-.07),
                          (x+r,y+r,z+.07),(x-r,y+r,z+.07)],[],[(0,1,2,3)])
        mesh.materials.append(soot if (row+index)%3 else bark);mesh.update()
        vent=bpy.data.objects.new('Furnace soot vent_'+str(row)+'_'+str(index),mesh)
        bpy.context.collection.objects.link(vent);vent.parent=root

# Measure evaluated bone tails in world space during each planted interval.
history={};slips=[];gaps=[];min_height=100
for frame in range(1,97):
    scene.frame_set(frame)
    bpy.context.view_layer.update()
    evaluated=rig.evaluated_get(bpy.context.evaluated_depsgraph_get())
    knees=[]
    for side in (-1,1):
        for i in range(4):
            name=f'Leg_{side}_{i}_1'
            bone=evaluated.pose.bones[name]
            foot=evaluated.matrix_world@bone.tail
            knee=evaluated.matrix_world@bone.head
            min_height=min(min_height,foot.z)
            phase=((frame-1)/24+(i%2)*.5+(0 if side<0 else .5))%1
            previous=history.get(name)
            if phase>=.4 and previous and previous[0]>=.4:
                slips.append((foot-previous[1]).length)
            history[name]=(phase,foot.copy())
            knees.append((side,i,knee))
    for a in knees:
        for b in knees:
            if a[:2]<b[:2]:gaps.append((a[2]-b[2]).length-.21)
report={'armorPlates':len(armor),'finEdgeTears':len(fin_tears),
        'sculptedTusks':2,'furnaceSootVents':16,'rigBones':len(rig.data.bones),
        'maxEvaluatedStanceFootSlipPerFrame':max(slips,default=0),
        'minEvaluatedFootHeight':min_height,'minKneeSphereClearance':min(gaps,default=0),
        'slipPass':max(slips,default=0)<.01,'kneeProxyPass':min(gaps,default=0)>0,
        'limits':'Knee sphere proxies and bone-tail motion only; full mesh intersection and physical phone acceptance remain separate.'}

scene.frame_set(20)
scene.render.filepath=str(OUT/'matchjaw-v7-walk.png')
bpy.ops.render.render(write_still=True)
scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'matchjaw-armored-v7.blend'))
bpy.ops.object.select_all(action='DESELECT')
for obj in [root]+list(root.children_recursive):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'matchjaw-armored-v7.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=True)
(OUT/'rig-measurements.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
