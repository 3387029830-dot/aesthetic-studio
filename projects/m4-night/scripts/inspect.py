import bpy, glob, os, collections
bpy.ops.wm.read_factory_settings(use_empty=True)
src = glob.glob(os.path.join(os.environ["CAR_DIR"], "**/*.obj"), recursive=True)[0]
bpy.ops.wm.obj_import(filepath=src)
objs = [o for o in bpy.data.objects if o.type == "MESH"]
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
print("FILE", os.path.basename(src), "objects", len(objs), "tris", tris)
mins = [min(min((o.matrix_world @ v.co)[i] for v in o.data.vertices) for o in objs) for i in range(3)]
maxs = [max(max((o.matrix_world @ v.co)[i] for v in o.data.vertices) for o in objs) for i in range(3)]
print("BBOX", [round(a, 2) for a in mins], [round(a, 2) for a in maxs])
for o in sorted(objs, key=lambda o: -len(o.data.polygons))[:45]:
    print("OBJ", o.name, len(o.data.polygons), [m.name for m in o.data.materials][:4])
print("MATS", sorted(m.name for m in bpy.data.materials))
