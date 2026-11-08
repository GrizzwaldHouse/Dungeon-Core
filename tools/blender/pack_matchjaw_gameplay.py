# pack_matchjaw_gameplay.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Reduce per-creature draw calls while retaining weighted armor, jaw animation and the mouth emitter.
import bpy
import json
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'docs/design/matchjaw-armored-v7'
tempfile.tempdir=str(OUT)
bpy.ops.wm.open_mainfile(filepath=str(OUT/'matchjaw-armored-v7.blend'))
bpy.context.scene.frame_set(1)
root=bpy.data.objects['Matchjaw_Root']
rig=bpy.data.objects['Matchjaw_Gait_Rig']
rig.data.pose_position='REST'
groups={}
for obj in list(root.children_recursive):
    if obj.type!='MESH':continue
    parent=obj.parent
    while parent and parent!=root and parent!=rig and not parent.animation_data:
        parent=parent.parent
    key=rig.name if obj.find_armature() else parent.name if parent else root.name
    groups.setdefault(key,[]).append(obj)

for key,objects in groups.items():
    for obj in objects:
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        # Apply only surface modifiers in rest space, never the armature.
        for modifier in list(obj.modifiers):
            if modifier.type!='ARMATURE':bpy.ops.object.modifier_apply(modifier=modifier.name)
        if not obj.data.uv_layers:
            bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT')
            bpy.ops.uv.smart_project(island_margin=.02);bpy.ops.object.mode_set(mode='OBJECT')
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name='Packed_'+key
    if len(obj.data.polygons)>2000:
        modifier=obj.modifiers.new('Gameplay triangle reduction','DECIMATE');modifier.ratio=.28
        while list(obj.modifiers).index(modifier)>0:
            bpy.ops.object.modifier_move_up(modifier=modifier.name)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
rig.data.pose_position='POSE'
bpy.ops.object.select_all(action='DESELECT')
for obj in [root]+list(root.children_recursive):obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'matchjaw-packed-gameplay.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'matchjaw-packed-gameplay.blend'))
print('PACKED_GROUPS',list(groups))
