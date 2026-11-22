"""雨夜高架 · M4 样片场景
用法：blender -b --python scripts/build.py  （需要 CAR_DIR 与 OUT_BLEND 环境变量）
车模：BMW M4 CS G82 2021 by eldaaar（Sketchfab, CC BY 4.0）
"""
import bpy, glob, os, math, random
from mathutils import Vector

FPS, SECONDS = 24, 10
FRAMES = FPS * SECONDS
SPEED = 12.0            # 米/秒
SCALE = 0.105           # 模型单位 → 米
WHEEL_R = 3.4 * SCALE
LAMP_GAP = 25.0
rnd = random.Random(7)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, FRAMES


def mat(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    for k, v in kw.items():
        b.inputs[k].default_value = v
    return m, b


def link(m, a, b):
    m.node_tree.links.new(a, b)


def key_linear(obj):
    if obj.animation_data and obj.animation_data.action:
        for fc in getattr(obj.animation_data.action, "fcurves", []):
            for kp in fc.keyframe_points:
                kp.interpolation = "LINEAR"


# ───────── 车 ─────────
src = glob.glob(os.path.join(os.environ["CAR_DIR"], "**/*.obj"), recursive=True)[0]
bpy.ops.wm.obj_import(filepath=src)
car_objs = [o for o in bpy.data.objects if o.type == "MESH"]
rig = bpy.data.objects.new("CarRig", None)
scene.collection.objects.link(rig)

for o in car_objs:
    if o.name.startswith("Wheel_02") or o.name == "_CSB":
        bpy.data.objects.remove(o, do_unlink=True)
car_objs = [o for o in bpy.data.objects if o.type == "MESH"]

for o in car_objs:
    o.select_set(True)
bpy.context.view_layer.objects.active = car_objs[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in car_objs:
    o.select_set(False)
    o.parent = rig
    o.scale = (SCALE, SCALE, SCALE)
    o.location = (0, 0, 0)

# 车轮与卡钳：原点移到几何中心，方便绕轴转动
wheels = []
for o in car_objs:
    if o.name.startswith("Wheel_01"):
        vs = [v.co for v in o.data.vertices]
        c = Vector((sum(v.x for v in vs) / len(vs), sum(v.y for v in vs) / len(vs), sum(v.z for v in vs) / len(vs)))
        o.data.transform(__import__("mathutils").Matrix.Translation(-c))
        o.location = c * SCALE
        wheels.append(o)

for o in car_objs:
    bpy.context.view_layer.objects.active = o
    o.select_set(True)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
for o in car_objs:
    o.select_set(False)

# 车漆：蓝宝石黑金属 + 清漆
paint = bpy.data.materials["CSR2_CarPaint"]
paint.use_nodes = True
nt = paint.node_tree
for n in list(nt.nodes):
    nt.nodes.remove(n)
out = nt.nodes.new("ShaderNodeOutputMaterial")
pb = nt.nodes.new("ShaderNodeBsdfPrincipled")
pb.inputs["Base Color"].default_value = (0.006, 0.009, 0.02, 1)
pb.inputs["Metallic"].default_value = 0.85
pb.inputs["Roughness"].default_value = 0.32
pb.inputs["Coat Weight"].default_value = 1.0
pb.inputs["Coat Roughness"].default_value = 0.025
flake = nt.nodes.new("ShaderNodeTexVoronoi")
flake.inputs["Scale"].default_value = 2600
fr = nt.nodes.new("ShaderNodeMapRange")
fr.inputs["To Min"].default_value = 0.22
fr.inputs["To Max"].default_value = 0.42
link(paint, flake.outputs["Distance"], fr.inputs["Value"])
link(paint, fr.outputs["Result"], pb.inputs["Roughness"])
link(paint, pb.outputs["BSDF"], out.inputs["Surface"])

# 灯：发光，强度做成可动画的值
head_strength = []
lm = bpy.data.materials["CSR2_Light"]
b = lm.node_tree.nodes["Principled BSDF"]
tex = next((n for n in lm.node_tree.nodes if n.type == "TEX_IMAGE"), None)
if tex:
    link(lm, tex.outputs["Color"], b.inputs["Emission Color"])
else:
    b.inputs["Emission Color"].default_value = (1, 1, 1, 1)
b.inputs["Emission Strength"].default_value = 0.0
head_strength.append(b.inputs["Emission Strength"])

gr = bpy.data.materials["GlassRed"]
gb = gr.node_tree.nodes["Principled BSDF"]
gb.inputs["Base Color"].default_value = (0.5, 0.0, 0.01, 1)
gb.inputs["Emission Color"].default_value = (1.0, 0.02, 0.03, 1)
gb.inputs["Emission Strength"].default_value = 6.0

for wn in ["Window", "WindowDark", "GlassClear"]:
    if wn in bpy.data.materials:
        wm = bpy.data.materials[wn]
        wb = wm.node_tree.nodes["Principled BSDF"]
        wb.inputs["Transmission Weight"].default_value = 1.0
        wb.inputs["Roughness"].default_value = 0.0
        wb.inputs["IOR"].default_value = 1.5
        wb.inputs["Base Color"].default_value = (0.05, 0.06, 0.07, 1) if wn != "GlassClear" else (1, 1, 1, 1)
        wb.inputs["Alpha"].default_value = 1.0

# 大灯照明
for sx in (-0.72, 0.72):
    ld = bpy.data.lights.new(f"Headlight{sx}", "SPOT")
    ld.energy = 0
    ld.color = (0.85, 0.92, 1.0)
    ld.spot_size = math.radians(55)
    ld.spot_blend = 0.6
    ld.shadow_soft_size = 0.05
    lo = bpy.data.objects.new(ld.name, ld)
    scene.collection.objects.link(lo)
    lo.parent = rig
    lo.location = (sx, -2.15, 0.68)
    lo.rotation_euler = (math.radians(-84), 0, 0)  # 聚光灯默认朝 -Z，绕 X 转到朝 -Y、略向下
    head_strength.append(ld)

# 冷色轮廓光：勾出车身线条
rim = bpy.data.lights.new("Rim", "AREA"); rim.energy = 650; rim.size = 4.0; rim.color = (0.55, 0.7, 1.0)
rim_o = bpy.data.objects.new("Rim", rim); scene.collection.objects.link(rim_o)
rim_o.parent = rig; rim_o.location = (3.5, 4.5, 3.2)
rt = rim_o.constraints.new("TRACK_TO"); rt.track_axis = "TRACK_NEGATIVE_Z"; rt.up_axis = "UP_Y"
rim_t = bpy.data.objects.new("RimTarget", None); scene.collection.objects.link(rim_t); rim_t.parent = rig; rim_t.location = (0, 0, 0.8)
rt.target = rim_t

# 车的运动
rig.location = (1.9, 0, 0)
rig.keyframe_insert("location", frame=1)
rig.location = (1.9, -SPEED * SECONDS, 0)
rig.keyframe_insert("location", frame=FRAMES + 1)
key_linear(rig)
spin = SPEED * SECONDS / WHEEL_R
for w in wheels:
    w.rotation_euler = (0, 0, 0)
    w.keyframe_insert("rotation_euler", frame=1)
    w.rotation_euler = (spin, 0, 0)
    w.keyframe_insert("rotation_euler", frame=FRAMES + 1)
    key_linear(w)

# 大灯 1.5 秒点亮
on0, on1 = int(1.5 * FPS), int(1.5 * FPS) + 8
for h in head_strength:
    if hasattr(h, "default_value"):
        h.default_value = 0.0; h.keyframe_insert("default_value", frame=on0)
        h.default_value = 14.0; h.keyframe_insert("default_value", frame=on1)
    else:
        h.energy = 0; h.keyframe_insert("energy", frame=on0)
        h.energy = 900; h.keyframe_insert("energy", frame=on1)

# ───────── 高架 ─────────
Y0, Y1 = 60.0, -SPEED * SECONDS - 120.0
LEN = Y0 - Y1
YC = (Y0 + Y1) / 2

road_m = bpy.data.materials.new("WetAsphalt"); road_m.use_nodes = True
rn = road_m.node_tree.nodes; rb = rn["Principled BSDF"]
rb.inputs["Base Color"].default_value = (0.018, 0.018, 0.02, 1)
tc = rn.new("ShaderNodeTexCoord")
puddle = rn.new("ShaderNodeTexNoise"); puddle.inputs["Scale"].default_value = 0.09; puddle.inputs["Detail"].default_value = 6
link(road_m, tc.outputs["Object"], puddle.inputs["Vector"])
pr = rn.new("ShaderNodeMapRange")
pr.inputs["From Min"].default_value = 0.42; pr.inputs["From Max"].default_value = 0.62
pr.inputs["To Min"].default_value = 0.03; pr.inputs["To Max"].default_value = 0.42
link(road_m, puddle.outputs["Fac"], pr.inputs["Value"])
link(road_m, pr.outputs["Result"], rb.inputs["Roughness"])
grit = rn.new("ShaderNodeTexNoise"); grit.inputs["Scale"].default_value = 900
link(road_m, tc.outputs["Object"], grit.inputs["Vector"])
bump = rn.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.08
link(road_m, grit.outputs["Fac"], bump.inputs["Height"])
link(road_m, bump.outputs["Normal"], rb.inputs["Normal"])

bpy.ops.mesh.primitive_plane_add(size=1, location=(0, YC, 0))
road = bpy.context.object; road.name = "Road"
road.scale = (17.0, LEN, 1); road.data.materials.append(road_m)

line_m, lb = mat("LaneLine", **{"Base Color": (0.75, 0.75, 0.72, 1), "Roughness": 0.35})
for lx in (-4.2, 0.0, 4.2):
    y = Y0
    while y > Y1:
        bpy.ops.mesh.primitive_plane_add(size=1, location=(lx, y - 1.5, 0.004))
        o = bpy.context.object; o.scale = (0.14, 3.0, 1); o.data.materials.append(line_m)
        y -= 9.0

conc_m, cb = mat("Concrete", **{"Base Color": (0.11, 0.105, 0.1, 1), "Roughness": 0.85})
for sx in (-8.7, 8.7):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, YC, 0.45))
    o = bpy.context.object; o.scale = (0.5, LEN, 0.9); o.data.materials.append(conc_m)
    bev = o.modifiers.new("bev", "BEVEL"); bev.width = 0.12; bev.segments = 3

# 路灯
pole_m, _ = mat("Pole", **{"Base Color": (0.06, 0.06, 0.065, 1), "Metallic": 0.6, "Roughness": 0.5})
lamp_m = bpy.data.materials.new("SodiumLamp"); lamp_m.use_nodes = True
lmb = lamp_m.node_tree.nodes["Principled BSDF"]
lmb.inputs["Emission Color"].default_value = (1.0, 0.5, 0.16, 1)
lmb.inputs["Emission Strength"].default_value = 40.0
SODIUM = (1.0, 0.52, 0.18)
y, side = Y0, 1
while y > Y1:
    for sx in (-9.3, 9.3):
        bpy.ops.mesh.primitive_cylinder_add(radius=0.09, depth=9.5, location=(sx, y, 4.75))
        bpy.context.object.data.materials.append(pole_m)
        arm_x = sx - math.copysign(1.4, sx)
        bpy.ops.mesh.primitive_cube_add(size=1, location=((sx + arm_x) / 2, y, 9.45))
        o = bpy.context.object; o.scale = (abs(sx - arm_x), 0.12, 0.1); o.data.materials.append(pole_m)
        bpy.ops.mesh.primitive_cube_add(size=1, location=(arm_x, y, 9.35))
        o = bpy.context.object; o.scale = (0.7, 0.28, 0.08); o.data.materials.append(lamp_m)
        ld = bpy.data.lights.new("Sodium", "SPOT")
        ld.energy = 2600; ld.color = SODIUM; ld.spot_size = math.radians(130); ld.spot_blend = 0.5; ld.shadow_soft_size = 0.35
        lo = bpy.data.objects.new("Sodium", ld); scene.collection.objects.link(lo)
        lo.location = (arm_x, y, 9.2)
    y -= LAMP_GAP

# 远景楼群：窗户发光
bld_m = bpy.data.materials.new("Building"); bld_m.use_nodes = True
bn = bld_m.node_tree.nodes; bbsdf = bn["Principled BSDF"]
bbsdf.inputs["Base Color"].default_value = (0.01, 0.01, 0.012, 1)
bbsdf.inputs["Roughness"].default_value = 0.6
brick = bn.new("ShaderNodeTexBrick")
brick.inputs["Scale"].default_value = 0.55
brick.inputs["Mortar Size"].default_value = 0.45
brick.inputs["Color1"].default_value = (1.0, 0.62, 0.3, 1)
brick.inputs["Color2"].default_value = (0.0, 0.0, 0.0, 1)
brick.inputs["Mortar"].default_value = (0, 0, 0, 1)
brick.inputs["Brick Width"].default_value = 1.6
brick.inputs["Row Height"].default_value = 1.4
brick.offset = 0.0
bgeo = bn.new("ShaderNodeNewGeometry")
sep = bn.new("ShaderNodeSeparateXYZ"); comb = bn.new("ShaderNodeCombineXYZ")
addxy = bn.new("ShaderNodeMath"); addxy.operation = "ADD"
link(bld_m, bgeo.outputs["Position"], sep.inputs["Vector"])
link(bld_m, sep.outputs["X"], addxy.inputs[0]); link(bld_m, sep.outputs["Y"], addxy.inputs[1])
link(bld_m, addxy.outputs["Value"], comb.inputs["X"]); link(bld_m, sep.outputs["Z"], comb.inputs["Y"])
link(bld_m, comb.outputs["Vector"], brick.inputs["Vector"])
brick.inputs["Bias"].default_value = 0.7
link(bld_m, brick.outputs["Color"], bbsdf.inputs["Emission Color"])
bbsdf.inputs["Emission Strength"].default_value = 1.1
for i in range(140):
    sx = rnd.choice((-1, 1)) * rnd.uniform(130, 340)
    by = rnd.uniform(Y1, Y0 + 80)
    h = rnd.uniform(18, 110) * (0.6 if abs(sx) < 80 else 1)
    w = rnd.uniform(12, 30)
    bpy.ops.mesh.primitive_cube_add(size=1, location=(sx, by, h / 2 - 25))
    o = bpy.context.object; o.scale = (w, rnd.uniform(12, 30), h); o.data.materials.append(bld_m)

# ───────── 世界：夜空 + 薄雾 ─────────
world = bpy.data.worlds.new("Night"); scene.world = world; world.use_nodes = True
wn = world.node_tree.nodes
bg = wn["Background"]
bg.inputs["Color"].default_value = (0.006, 0.008, 0.016, 1)
bg.inputs["Strength"].default_value = 1.0
vol = wn.new("ShaderNodeVolumePrincipled")
vol.inputs["Density"].default_value = 0.0018
vol.inputs["Anisotropy"].default_value = 0.35
vol.inputs["Color"].default_value = (0.7, 0.78, 0.95, 1)
world.node_tree.links.new(vol.outputs["Volume"], wn["World Output"].inputs["Volume"])

# ───────── 摄像机：跟车，侧前方绕到车头并推近 ─────────
target = bpy.data.objects.new("CamTarget", None); scene.collection.objects.link(target)
target.parent = rig; target.location = (0, -1.6, 0.62)
cam_d = bpy.data.cameras.new("Cam"); cam_d.lens = 40
cam_d.dof.use_dof = True; cam_d.dof.focus_object = target; cam_d.dof.aperture_fstop = 2.2
cam_d.sensor_width = 36
cam = bpy.data.objects.new("Cam", cam_d); scene.collection.objects.link(cam)
cam.parent = rig; scene.camera = cam
tr = cam.constraints.new("TRACK_TO"); tr.target = target; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
for f, loc in [(1, (-4.6, -6.8, 0.42)), (int(5 * FPS), (-3.0, -6.2, 0.5)), (FRAMES, (-0.9, -5.0, 0.58))]:
    cam.location = loc; cam.keyframe_insert("location", frame=f)

# ───────── 渲染设置 ─────────
r = scene.render
r.engine = "CYCLES"
r.resolution_x, r.resolution_y = 1920, 1080
r.use_motion_blur = True
r.motion_blur_shutter = 0.5
cy = scene.cycles
cy.device = "GPU"
prefs = bpy.context.preferences.addons["cycles"].preferences
prefs.compute_device_type = "METAL"; prefs.get_devices()
for d in prefs.devices:
    d.use = True
cy.samples = 256
cy.use_adaptive_sampling = True
cy.adaptive_threshold = 0.02
cy.use_denoising = True
cy.max_bounces = 8
cy.volume_step_rate = 4.0
cy.volume_max_steps = 256
try:
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Punchy"
except Exception:
    pass
scene.view_settings.exposure = 0.3

bpy.ops.wm.save_as_mainfile(filepath=os.environ["OUT_BLEND"])
print("BUILD_OK", len(bpy.data.objects), "objects")
