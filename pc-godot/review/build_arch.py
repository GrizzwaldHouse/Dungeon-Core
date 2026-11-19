"""Run in Blender background factory-startup with the review directory after --."""
import math
from pathlib import Path
import random
import sys
import bpy
from mathutils import Vector

out = Path(sys.argv[-1])
rng = random.Random(103)
bpy.ops.wm.read_factory_settings(use_empty=True)

def material(name, color):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    mat.node_tree.nodes.get("Principled BSDF").inputs["Base Color"].default_value = (*color, 1)
    return mat

stone = material("Weathered basalt", (.23, .24, .26))
tex = stone.node_tree.nodes.new("ShaderNodeTexImage")
tex.image = bpy.data.images.load(str(out / "basalt.jpg"))
# Bake the dusk grade into a derived texture so glTF imports it consistently.
from array import array
pixels = array("f", [0]) * len(tex.image.pixels)
tex.image.pixels.foreach_get(pixels)
for i in range(0, len(pixels), 4):
    for channel, factor in enumerate((.19, .23, .24)):
        pixels[i+channel] *= factor
tex.image.pixels.foreach_set(pixels)
tex.image.filepath_raw = str(out/"basalt-dusk.png")
tex.image.file_format = "PNG"
tex.image.save()
stone.node_tree.links.new(tex.outputs["Color"], stone.node_tree.nodes.get("Principled BSDF").inputs["Base Color"])
bark = material("Exposed heartwood", (.16, .079, .041))
moss = material("Wet lichen", (.105, .15, .095))

def block(name, pos, size, angle=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.rotation_euler.y = angle
    obj.data.materials.append(stone)
    bevel = obj.modifiers.new("Spalled edge", "BEVEL")
    bevel.width = .065
    bevel.segments = 2
    obj.modifiers.new("Face normals", "WEIGHTED_NORMAL")

def tendril(points, radius, mat):
    curve = bpy.data.curves.new("Root", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points)-1)
    for i,(p,xyz) in enumerate(zip(spline.bezier_points, points)):
        p.co = xyz
        p.handle_left_type = p.handle_right_type = "AUTO"
        p.radius = 1.1 - i/(len(points)-1)
    obj = bpy.data.objects.new("Climbing root",curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj.select_set(False)

for side in (-1, 1):
    for i in range(6):
        block("Jamb course", (side*2.6, 0, .28+i*.56), (1.65+rng.uniform(-.12,.12),1.55,.55))
    for i in range(9):
        t = (i+.5)/9
        a = t*math.acos(1-2.6/4.2)
        x = side*(2.6-4.2*(1-math.cos(a)))
        z = 3.35+4.2*math.sin(a)
        block("Crown voussoir",(x,0,z),(.85,1.5,.59),-side*a)
        block("Stepped archivolt",(x+side*.46*math.cos(a),-.2,z+.46*math.sin(a)),
              (.24,1.14,.64),-side*a)
    for k in range(4):
        points=[(side*(3.8-.23*k),-1.9+.16*k,.08),
                (side*(2.8+.22*math.sin(k)), -.87,.85+k*.18),
                (side*(2.6+.3*math.cos(k)), -.84,2.9),
                (side*(2.5-.16*k),-.79,4.1+k*.13),
                (side*(1.65-.29*k),-.77,5.8+.22*k)]
        tendril(points,.15-.018*k,bark if k!=2 else moss)
block("Split keystone",(.035,0,7.13),(.62,1.64,.83),.09)
bpy.ops.export_scene.gltf(filepath=str(out/"aqueduct.glb"),export_format="GLB",export_apply=True)
