# build_runtime_character_pack.py
# Developer: Marcus Daley
# Date: 2026-11-01
# Why: Produces reproducible zero-credit 3D character candidates for visual and mobile-budget review.

import bpy
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
ROOT.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)


def material(name, color, roughness=0.9, metallic=0.0, emission=0.0):
    item = bpy.data.materials.new(name)
    item.diffuse_color = (*color, 1)
    item.use_nodes = True
    shader = item.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    if emission:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = emission
    return item


STONE = material('Wet slate', (.18, .21, .23))
BARK = material('Charcoal bark', (.105, .085, .07))
BARK_EDGE = material('Weathered bark edge', (.24, .20, .15))
MOSS = material('Dead moss', (.17, .23, .17))
LEAF = material('Olive leaf membrane', (.24, .27, .18))
LEATHER = material('Worn leather', (.26, .19, .15))
CLOTH = material('Ash cloth', (.35, .37, .39))
PURPLE = material('Muted violet cloth', (.23, .16, .30))
GREEN = material('Ranger cloth', (.16, .24, .19))
IRON = material('Worn iron', (.38, .42, .43), .72, .36)
FROST = material('Dirty frost', (.50, .58, .61))
EMBER = material('Dull ember', (.45, .19, .075), .65, 0, .65)
VIOLET = material('Violet magic', (.32, .16, .48), .52, 0, .7)


def group(name):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    return obj


def cone(name, a, b, r0, r1, mat, root, sides=7):
    a, b = Vector(a), Vector(b)
    delta = b-a
    bpy.ops.mesh.primitive_cone_add(vertices=sides, radius1=r0, radius2=r1,
                               depth=delta.length, location=(a+b)/2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = delta.to_track_quat('Z', 'Y').to_euler()
    obj.data.materials.append(mat)
    obj.parent = root
    return obj


def orb(name, location, scale, mat, root, subdivisions=1):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=subdivisions, radius=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    obj.parent = root
    return obj


def block(name, location, scale, mat, root):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    bevel = obj.modifiers.new('worn soft edges', 'BEVEL')
    bevel.width = min(scale) * .18
    bevel.segments = 2
    obj.modifiers.new('weighted face normals', 'WEIGHTED_NORMAL')
    obj.parent = root
    return obj


def leaf_panel(name, points, mat, root):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], [tuple(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj.parent = root
    thickness = obj.modifiers.new('leaf thickness', 'SOLIDIFY')
    thickness.thickness = .012
    return obj


def wayfarer(role):
    root = group('Wayfarer ' + role)
    robe = {'VANGUARD': CLOTH, 'RANGER': GREEN, 'MAGE': PURPLE, 'HEALER': FROST}[role]
    orb('Torso under worn layers', (0, 0, 1.13), (.38, .27, .55), robe, root)
    cone('Travel cloak hem', (0, .12, .52), (0, .03, 1.52), .47, .22, robe, root, 8)
    orb('Head and hood', (0, -.04, 1.78), (.27, .25, .32), robe, root)
    orb('Worn hood outer fold', (0, .09, 1.84), (.31, .25, .31), robe, root)
    cone('Hood peak', (0, -.04, 1.85), (0, .04, 2.12), .27, .015, robe, root)
    block('Face shadow', (0, -.263, 1.76), (.30, .035, .14), BARK, root)
    block('Field pack', (0, .32, 1.14), (.45, .21, .48), LEATHER, root)
    for sign in (-1, 1):
        cone('Layered cape fold', (sign*.23, .20, 1.45),
             (sign*.35, .16, .50), .16, .27, robe, root, 6)
        cone('Belt hanging kit', (sign*.31, -.14, .92),
             (sign*.38, -.16, .58), .085, .055, LEATHER, root)
    cone('Bedroll', (-.25, .36, 1.42), (.27, .36, 1.42), .13, .13, CLOTH, root)
    for sign, side in ((-1, 'left'), (1, 'right')):
        cone(side + ' arm', (sign*.30, 0, 1.44), (sign*.46, -.05, .82), .13, .09, robe, root)
        orb(side + ' glove', (sign*.46, -.06, .78), (.11, .10, .11), LEATHER, root)
        for finger in range(3):
            cone(side + ' visible fingers', (sign*.46+(finger-1)*.045, -.10, .76),
                 (sign*.47+(finger-1)*.055, -.16, .66), .024, .012, LEATHER, root, 6)
        cone(side + ' boot', (sign*.18, 0, .65), (sign*.20, -.10, .17), .16, .14, LEATHER, root)
        orb(side + ' boot toe', (sign*.20, -.17, .19), (.17, .20, .09), LEATHER, root)
        block(side + ' shoulder repair', (sign*.33, -.03, 1.46), (.29, .26, .11), LEATHER, root)
    if role == 'VANGUARD':
        block('Scratched shield', (-.63, -.18, .99), (.16, .39, .68), IRON, root)
        cone('Axe haft', (.43, -.12, .75), (.46, -.12, 1.9), .045, .045, LEATHER, root)
        block('Axe head', (.47, -.12, 1.78), (.42, .10, .33), IRON, root)
    elif role == 'RANGER':
        cone('Bow stave lower', (.42, -.15, .66), (.69, -.18, 1.26), .04, .035, BARK_EDGE, root)
        cone('Bow stave upper', (.69, -.18, 1.26), (.40, -.15, 1.86), .035, .04, BARK_EDGE, root)
        cone('Bow string', (.42, -.15, .66), (.40, -.15, 1.86), .008, .008, CLOTH, root, 5)
        block('Quiver', (-.28, .40, 1.35), (.17, .18, .60), LEATHER, root)
    elif role == 'MAGE':
        cone('Crooked staff', (.44, -.10, .26), (.54, -.12, 2.18), .055, .035, BARK_EDGE, root)
        orb('Dim spell focus', (.53, -.12, 2.21), (.12, .12, .12), VIOLET, root)
        cone('Split hat brim', (-.43, .0, 1.99), (.43, .0, 1.99), .22, .22, PURPLE, root)
    else:
        cone('Weathered lantern pole', (.44, -.10, .47), (.52, -.10, 2.08), .045, .045, BARK_EDGE, root)
        orb('Soft lantern', (.52, -.1, 2.11), (.15, .15, .18), EMBER, root)
        block('Field satchel', (-.36, -.02, .88), (.22, .28, .37), LEATHER, root)
    return root


def rootling():
    root = group('Rootling ground minion')
    orb('Low root core', (0, 0, .43), (.40, .34, .34), BARK, root)
    orb('Layered dead moss shell', (0, .05, .66), (.38, .33, .15), MOSS, root)
    for sign in (-1, 1):
        for depth in (-.22, .23):
            cone('Splayed hooked root', (sign*.25, depth, .38), (sign*.68, depth*1.5, .13), .12, .02, BARK_EDGE, root)
        cone('Crown root horn', (sign*.19, .05, .63), (sign*.33, .10, 1.02), .12, .015, BARK_EDGE, root)
        orb('Amber eye', (sign*.15, -.32, .49), (.05, .03, .06), EMBER, root)
    return root


def sentinel():
    root = group('Deepwood Sentinel boss')
    cone('Root trunk mass', (0, 0, .12), (0, 0, 3.25), .84, .54, BARK, root, 9)
    orb('Broad broken canopy', (0, .06, 3.28), (1.22, .66, .40), MOSS, root)
    orb('Hollow crown head', (0, -.29, 3.65), (.49, .35, .52), BARK, root)
    for i in range(9):
        angle = i * 2*math.pi/9
        sx, sy = math.cos(angle), math.sin(angle)
        cone('Splayed ground root', (sx*.31, sy*.28, .76),
             (sx*(1.05+.13*(i%3)), sy*(.92+.14*(i%2)), .05),
             .28, .022, BARK, root)
    for i in range(12):
        angle = i * 2*math.pi/12
        sx, sy = math.cos(angle), math.sin(angle)
        cone('Trunk bark plate', (sx*.48, sy*.44, .53+i%3*.42),
             (sx*.52, sy*.48, 1.59+i%3*.43), .19, .035,
             BARK_EDGE if i%3 else BARK, root, 5)
    for sign in (-1, 1):
        cone('Broad crown trunk', (sign*.24, .05, 3.47), (sign*1.14, .20, 4.38), .22, .09, BARK, root)
        cone('Branch antler', (sign*1.14, .20, 4.38), (sign*1.83, .28, 5.04), .12, .008, BARK_EDGE, root)
        cone('Forked crown', (sign*.91, .16, 4.16), (sign*1.68, .39, 4.18), .09, .004, BARK_EDGE, root)
        cone('Canopy fork', (sign*1.49, .24, 4.76), (sign*1.93, .18, 4.80), .06, .004, BARK_EDGE, root)
        orb('Sparse moss crown', (sign*1.02, .25, 4.37), (.48,.28,.16), MOSS, root)
        cone('Rooted arm upper', (sign*.70, 0, 2.98), (sign*1.36, -.18, 2.04), .29, .19, BARK, root)
        cone('Rooted arm lower', (sign*1.36, -.18, 2.04), (sign*1.48, -.40, 1.22), .19, .12, BARK_EDGE, root)
        for claw in range(3):
            cone('Branch claw', (sign*1.48+(claw-1)*.09, -.40, 1.23),
                 (sign*1.64+(claw-1)*.16, -.52, .76), .065, .005, BARK, root)
        cone('Splayed root leg', (sign*.31, .08, .58), (sign*.89, -.27, .06), .30, .06, BARK, root)
        orb('Deep eye', (sign*.17, -.56, 3.72), (.075, .04, .12), EMBER, root)
        for k in range(3):
            cone('Canopy root finger', (sign*(.52+k*.14), -.19, 3.21), (sign*(.65+k*.25), -.17, 3.68), .08, .01, BARK_EDGE, root)
    return root


def barkwing():
    root = group('Barkwing airborne minion')
    cone('Twisted bark thorax', (0, 0, 1.73), (0, 0, 2.72), .17, .25, BARK, root)
    orb('Split angular crown', (0, -.08, 2.8), (.31, .25, .25), BARK_EDGE, root)
    for index in range(7):
        sign = -1 if index%2 else 1
        cone('Angular bark ridge', (sign*.07, -.18, 1.82+index*.13),
             (sign*.19, -.15, 2.15+index*.12), .06, .006, BARK_EDGE, root, 5)
    for sign in (-1, 1):
        cone('Crown forks', (sign*.13, 0, 2.89), (sign*.45, .03, 3.42), .09, .005, BARK, root)
        orb('Dull eye', (sign*.12, -.29, 2.78), (.04, .025, .045), EMBER, root)
        wing = group('Wing ' + ('left' if sign < 0 else 'right'))
        wing.parent = root
        a = (sign*.17, 0, 2.62)
        b = (sign*1.20, .06, 3.09)
        c = (sign*2.63, .07, 3.28)
        cone('Wing main spar', a, b, .13, .08, BARK_EDGE, wing)
        cone('Wing outer spar', b, c, .08, .01, BARK_EDGE, wing)
        for index in range(5):
            t = index/5
            x = sign*(.40+2.05*t)
            bottom = (x+sign*.15, -.02, 1.66+.48*t-(.16 if index%2 else 0))
            top = (x, .07, 2.73+.50*t)
            cone('Visible wing rib', top, bottom, .052, .008, BARK, wing)
            nxt = sign*(.40+2.05*(t+.2))
            notch = (x+sign*.34,-.035,2.18+.47*t)
            tear = (x+sign*.24,-.08,1.79+.45*t)
            leaf_panel('Asymmetric torn leaf', [top, (nxt,.07,2.73+.50*(t+.2)),
                       (nxt+sign*.12,-.02,1.66+.48*(t+.2)),
                       (nxt-sign*.09,-.05,1.96+.50*t), notch, tear, bottom],
                       LEAF if index%2 else MOSS, wing)
            if index%2 == 0:
                orb('Sparse moss along wing', (x, .085, 2.77+.50*t),
                    (.12,.08,.035), MOSS, wing)
        for frame, angle in ((1, -8), (7, 12), (13, -8)):
            wing.rotation_euler.y = math.radians(angle*sign)
            wing.keyframe_insert(data_path='rotation_euler', frame=frame)
        cone('Hooked root leg', (sign*.13,0,1.77), (sign*.29,-.09,1.21), .09, .045, BARK, root)
        for claw in range(3):
            cone('Branch talon', (sign*.29+(claw-1)*.08,-.09,1.21),
                 (sign*.40+(claw-1)*.13,-.36,1.31), .038, .002, BARK_EDGE, root)
    orb('Faint violet core', (0,-.19,2.16), (.08,.035,.13), VIOLET, root)
    return root


def configure_camera(name, target, location, resolution):
    camera = bpy.data.objects.get('Review camera')
    if camera is None:
        bpy.ops.object.camera_add(location=location)
        camera = bpy.context.object
        camera.name = 'Review camera'
        camera.data.type = 'ORTHO'
    camera.location = location
    camera.rotation_euler = (Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale = 7.1 if 'sentinel' in name else 4.5
    bpy.context.scene.camera = camera
    bpy.context.scene.render.resolution_x, bpy.context.scene.render.resolution_y = resolution


def make_studio():
    world = bpy.data.worlds.new('Cool dusk review')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.13,.15,.20,1)
    world.node_tree.nodes['Background'].inputs[1].default_value = .7
    scene = bpy.context.scene
    scene.world = world
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = 'PNG'
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    for name, location, energy, color in (
        ('Slate key', (-4,-5,7), 650, (.83,.87,1.0)),
        ('Violet fill', (3,-1,3), 160, (.51,.41,.66)),
        ('Cold rim', (1,4,6), 470, (.68,.76,.88))):
        bpy.ops.object.light_add(type='AREA', location=location)
        lamp = bpy.context.object
        lamp.name = name
        lamp.data.energy = energy
        lamp.data.color = color
        lamp.data.size = 5
        lamp.rotation_euler = (Vector((0,0,1.7))-lamp.location).to_track_quat('-Z','Y').to_euler()


def descendants(root):
    return [root] + list(root.children_recursive)


def report_asset(name, root):
    objects = descendants(root)
    for obj in bpy.context.selected_objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    output = ROOT / (name + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(output), export_format='GLB', use_selection=True,
                              export_apply=True, export_animations=True, export_materials='EXPORT')
    triangles = sum(sum(len(poly.vertices)-2 for poly in obj.data.polygons)
                    for obj in objects if obj.type == 'MESH')
    mats = sorted({mat.name for obj in objects if obj.type == 'MESH'
                   for mat in obj.data.materials if mat})
    target = (0,0,2.4 if name == 'deepwood_sentinel' else 1.4)
    locations = {
        'front': (0,-9,target[2]+.3),
        'side': (9,0,target[2]+.3),
        'top': (0,-.01,10),
        'angled': (5,-8,target[2]+3),
        'phone_angled': (5,-8,target[2]+3),
    }
    for view, location in locations.items():
        configure_camera(name,target,location,(390,540) if view == 'phone_angled' else (720,720))
        bpy.context.scene.render.filepath = str(ROOT / (name + '_' + view + '.png'))
        bpy.ops.render.render(write_still=True)
    return {'file': output.name, 'sha256': hashlib.sha256(output.read_bytes()).hexdigest(),
            'bytes': output.stat().st_size, 'meshObjects': sum(obj.type == 'MESH' for obj in objects),
            'trianglesBeforeModifiers': triangles, 'materials': mats,
            'rig': 'none', 'animation': ['rigid wing preview frames 1-13'] if name == 'barkwing' else [],
            'views': [name + '_' + view + '.png' for view in locations]}


make_studio()
builders = {**{'wayfarer_' + role.lower(): (lambda role=role: wayfarer(role))
              for role in ('VANGUARD','RANGER','MAGE','HEALER')},
            'deepwood_sentinel': sentinel, 'rootling': rootling, 'barkwing': barkwing}
manifest = {'generator': 'tools/blender/build_runtime_character_pack.py',
            'sourceReference': 'client/title-cover-deepwood.png',
            'creditSpend': 0, 'reviewState': 'CANDIDATE_NOT_RUNTIME_APPROVED', 'assets': {}}
for name, build in builders.items():
    root = build()
    manifest['assets'][name] = report_asset(name, root)
    bpy.data.objects.remove(root, do_unlink=True)
    for obj in list(bpy.data.objects):
        if obj.type in {'MESH','EMPTY'} and obj.name != 'Review camera':
            bpy.data.objects.remove(obj, do_unlink=True)
(ROOT / 'asset-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
