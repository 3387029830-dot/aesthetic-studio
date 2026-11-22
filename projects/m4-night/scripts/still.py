import bpy, os, sys
s = bpy.context.scene
s.frame_set(int(os.environ.get("FRAME", "120")))
pct = int(os.environ.get("PCT", "50"))
s.render.resolution_percentage = pct
s.cycles.samples = int(os.environ.get("SAMPLES", "64"))
s.render.filepath = os.environ["OUT_PNG"]
bpy.ops.render.render(write_still=True)
