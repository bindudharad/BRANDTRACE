import sys
sys.stdout.reconfigure(encoding="utf-8")

with open(r"C:\Projects\BRANDTRACE\BRANDTRACE\src\components\BrandtraceHero\BrandtraceHero.tsx", "r", encoding="utf-8") as f:
    lines = f.readlines()

for i in range(330, 360):
    print(f"{i+1:3d}: {lines[i].rstrip()}")
