# Headless Blender studies

This folder holds reproducible Blender source scripts for approval studies. It does not contain production-approved runtime models.

Run the first study from the repository root:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python art/blender/wayfarer_portal_study.py

& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python art/blender/wayfarer_turnaround_sheet.py

& 'C:\Program Files\Blender Foundation\Blender 5.1\blender.exe' --background --python art/blender/tree_sentinel_turnaround_sheet.py
```

The scripts create local, ignored evidence under `art/blender/renders/`: a 1280x720 layout study, a 390x844 interaction-focused phone study, and `wayfarer_mage_turnaround_sheet.png`. The layout script also produces a local candidate GLB under `art/blender/exports/`. Review all render views before promoting any mesh. Runtime integration requires a separate milestone covering loader support, collision proxy agreement, animation, LOD budgets, material count, mobile performance, accessibility contrast, and visual QA.
