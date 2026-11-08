# apply_matchjaw_materials_v8.py
# Developer: Marcus Daley
# Date: 2026-11-07
# Why: Keep Matchjaw's existing PBR identity while removing the toy-like orange and flat dark surfaces.

import json
import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = ROOT / 'docs/design/matchjaw-v8-materials'

# Target values are restrained surface colors, not a universal glow pass.
PALETTE = {
    'Soot-dark Deepwood bark': ((0.12, 0.14, 0.14), 'bark', 0.0),
    'Worn bark edge': ((0.10, 0.12, 0.12), 'bark', 0.0),
    'Weathered black iron': ((0.12, 0.14, 0.15), 'metal', 0.58),
    'Oxidized copper braces': ((0.20, 0.17, 0.14), 'copper', 0.68),
    'Layered charcoal slate': ((0.12, 0.14, 0.15), 'slate', 0.08),
    'Scorched wooden tusks': ((0.34, 0.37, 0.35), 'wood', 0.0),
    'Furnace carbon soot': ((0.055, 0.058, 0.058), 'soot', 0.14),
    'Restrained forest moss': ((0.13, 0.17, 0.12), 'moss', 0.0),
}


def _find_albedo(material):
    shader = material.node_tree.nodes.get('Principled BSDF')
    if shader is None:
        return None, None
    for link in shader.inputs['Base Color'].links:
        if link.from_node.type == 'TEX_IMAGE' and link.from_node.image:
            return shader, link.from_node
    return shader, None


def _grade_image(image, target, kind, path):
    # Duplicating the embedded atlas keeps the source candidate reversible.
    copy = image.copy()
    copy.name = image.name + ' v8 graded'
    width, height = copy.size
    pixels = list(copy.pixels[:])
    colored = 0
    for y in range(height):
        for x in range(width):
            i = 4 * (y * width + x)
            r, g, b = pixels[i:i + 3]
            luminance = max(0.02, min(1.0, 0.2126 * r + 0.7152 * g + 0.0722 * b))
            # Large continuous patches read as weathering at the gameplay camera.
            patina = math.sin(x * 0.071 + math.sin(y * 0.034) * 2.4) * math.cos(y * 0.067)
            grain = math.sin(x * 0.37 + y * 0.19) * 0.028
            shade = max(0.48, min(1.22, 0.90 + (luminance - .5) * .10 + patina * 0.16 + grain))
            color = [c * shade for c in target]
            if kind == 'bark' and patina > 0.63 and y % 31 < 13:
                color = [color[0] * .80, color[1] * 1.09, color[2] * .75]
                colored += 1
            elif kind == 'copper' and patina > 0.38:
                color = [color[0] * .71, color[1] * 1.04, color[2] * .87]
                colored += 1
            elif kind == 'wood' and patina < -0.55:
                color = [c * .66 for c in color]
                colored += 1
            elif kind in ('slate', 'metal', 'soot') and patina > 0.53:
                color = [c * .72 for c in color]
                colored += 1
            pixels[i:i + 3] = [min(1, max(0, c)) for c in color]
    copy.pixels.foreach_set(pixels)
    copy.filepath_raw = str(path)
    copy.file_format = 'PNG'
    copy.save()
    copy.pack()
    return copy, colored


def apply_materials(output_dir=None):
    """Refine loaded Matchjaw material datablocks, preserving the source PBR maps."""
    output = Path(output_dir) if output_dir is not None else DEFAULT_OUT
    output.mkdir(parents=True, exist_ok=True)
    result = {'graded': [], 'missing': [], 'albedoTexturesPreserved': True}
    for name, (target, kind, metallic) in PALETTE.items():
        material = bpy.data.materials.get(name)
        if material is None or not material.use_nodes:
            result['missing'].append(name)
            continue
        shader, albedo = _find_albedo(material)
        if shader is None:
            result['missing'].append(name)
            continue
        shader.inputs['Metallic'].default_value = metallic
        for node in material.node_tree.nodes:
            if node.type == 'NORMAL_MAP':
                # The inherited normal atlas has straight repeating bands.
                # Keep the normal detail but reduce its stripe dominance.
                node.inputs['Strength'].default_value = .23 if kind in ('bark', 'wood', 'slate') else .50
        # Roughness and normal links remain untouched. A satin copper edge
        # is enough; only the existing tip and furnace glow can emit light.
        if albedo:
            old = albedo.image
            filename = name.lower().replace(' ', '-') + '-v8.png'
            new, colored = _grade_image(old, target, kind, output / filename)
            albedo.image = new
            result['graded'].append({'material': name, 'pixels': new.size[0] * new.size[1],
                                     'accentPixels': colored, 'source': old.name, 'image': filename})
        else:
            # The soot material was introduced after the prior texture pass.
            shader.inputs['Base Color'].default_value = (*target, 1)
            result['graded'].append({'material': name, 'pixels': 0,
                                     'accentPixels': 0, 'source': None, 'image': None})
    # This material is shared by the furnace window, mouth, and small heated tips.
    # Keeping it dim avoids making every appendage look like a glowing toy prop.
    ember = bpy.data.materials.get('Furnace ember')
    if ember and ember.node_tree:
        shader = ember.node_tree.nodes.get('Principled BSDF')
        if shader:
            shader.inputs['Emission Strength'].default_value = .35
            result['emberStrength'] = .35
    return result


def _test_on_v7():
    source = ROOT / 'docs/design/matchjaw-armored-v7/matchjaw-packed-gameplay.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene = bpy.context.scene
    report = apply_materials(DEFAULT_OUT)
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 800
    scene.render.resolution_percentage = 100
    if scene.camera:
        scene.camera.location = (4.8, -7.8, 3.8)
        scene.camera.rotation_euler = (Vector((0, .1, 1)) - scene.camera.location).to_track_quat('-Z', 'Y').to_euler()
    scene.frame_set(20)
    scene.render.filepath = str(DEFAULT_OUT / 'matchjaw-v8-materials-angled.png')
    bpy.ops.render.render(write_still=True)
    light_colors = [(obj, tuple(obj.data.color)) for obj in scene.objects if obj.type == 'LIGHT']
    for obj, _ in light_colors:
        obj.data.color = (1, 1, 1)
    scene.render.filepath = str(DEFAULT_OUT / 'matchjaw-v8-materials-neutral.png')
    bpy.ops.render.render(write_still=True)
    for obj, color in light_colors:
        obj.data.color = color
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(DEFAULT_OUT / 'matchjaw-v8-materials.blend'))
    (DEFAULT_OUT / 'material-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(json.dumps(report))


if __name__ == '__main__':
    _test_on_v7()
