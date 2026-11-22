import bpy, os
s = bpy.context.scene
s.render.resolution_percentage = 100
s.cycles.samples = 96
s.render.image_settings.file_format = "PNG"
s.render.image_settings.color_depth = "16"
s.render.use_overwrite = False      # 已渲染的帧跳过，可断点续渲
s.render.use_placeholder = True
s.render.filepath = os.environ["FRAMES_DIR"] + "/f_####"
bpy.ops.render.render(animation=True)
