import bpy, glob, os
bpy.ops.wm.read_factory_settings(use_empty=True)
src = glob.glob(os.path.join(os.environ["CAR_DIR"], "**/*.obj"), recursive=True)[0]
bpy.ops.wm.obj_import(filepath=src)
def center(o):
    vs=[o.matrix_world @ v.co for v in o.data.vertices]
    return [round(sum(v[i] for v in vs)/len(vs),2) for i in range(3)], [round(min(v[i] for v in vs),2) for i in range(3)], [round(max(v[i] for v in vs),2) for i in range(3)]
for n in ["Grille6","Grille1","Badge","Wheel_01_LF","Wheel_01_RF","Wheel_01_LR","Wheel_01_RR","Light","Glass"]:
    o=bpy.data.objects[n]; print("C", n, center(o))
m=bpy.data.materials["CSR2_Light"]; print("LIGHTMAT", [n.type for n in m.node_tree.nodes])
for mat in ["CSR2_CarPaint","GlassRed","CSR2_Light"]:
    mm=bpy.data.materials[mat]
    for n in mm.node_tree.nodes:
        if n.type=="TEX_IMAGE": print("TEX", mat, n.image.name if n.image else None)
