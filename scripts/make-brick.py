"""
Draws the brick wall behind the app: client/src/assets/brick.svg

Run it again after changing anything below:   python3 scripts/make-brick.py

How a real wall is laid ("running bond"):
  - every brick is the same size, separated by mortar
  - each row is shifted half a brick, so joints never line up
  - no two bricks are quite the same color, and the clay is gritty

The SVG is one TILE that repeats across the page. To make the repeat
invisible, a brick hanging off the right edge is drawn again on the left
(same color), and the grain uses stitchTiles so its edges match too.
"""
import random
from pathlib import Path

SEED = 19            # change for a different (but repeatable) wall
BRICK_W, BRICK_H = 64, 24   # brick + mortar, in CSS pixels
MORTAR = 3
COLS, ROWS = 5, 8    # tile = 5 bricks wide, 8 rows tall (320 x 192)

# Night-time oxblood: dark, warm, a little uneven. Weighted so most bricks
# are the middle tones and a few are scorched or sun-faded.
PALETTE = [
    ("#4b1d17", 5), ("#56221a", 5), ("#43191a", 4), ("#5e2a1e", 3),
    ("#3a1613", 3), ("#663020", 2), ("#2e1210", 1), ("#6e3524", 1),
]
MORTAR_COLOR = "#211311"

random.seed(SEED)
colors = [c for c, w in PALETTE for _ in range(w)]
W, H = COLS * BRICK_W, ROWS * BRICK_H
bw, bh = BRICK_W - MORTAR, BRICK_H - MORTAR

bricks = []
for row in range(ROWS):
    offset = 0 if row % 2 == 0 else -BRICK_W // 2   # the half-brick shift
    y = row * BRICK_H + MORTAR / 2
    for col in range(COLS + 1):
        x = offset + col * BRICK_W + MORTAR / 2
        if x >= W:
            continue
        color = random.choice(colors)
        r = round(random.uniform(1, 2.5), 1)   # slightly worn corners
        xs = [x]
        if x < 0:                # hangs off the left edge: draw its other half on the right
            xs.append(x + W)
        for xx in xs:
            bricks.append(
                f'<rect x="{xx:g}" y="{y:g}" width="{bw}" height="{bh}" rx="{r}" fill="{color}"/>'
                # light catches the top edge, the bottom edge sits in shadow
                f'<rect x="{xx + 1:g}" y="{y:g}" width="{bw - 2}" height="1.5" fill="#fff" opacity=".07"/>'
                f'<rect x="{xx + 1:g}" y="{y + bh - 2:g}" width="{bw - 2}" height="2" fill="#000" opacity=".28"/>'
            )
        # a few bricks get a chipped, darker patch
        if random.random() < 0.18:
            cx = x + random.uniform(8, bw - 18)
            cy = y + random.uniform(4, bh - 9)
            bricks.append(f'<ellipse cx="{cx:.1f}" cy="{cy:.1f}" rx="{random.uniform(4, 9):.1f}" ry="{random.uniform(2, 4):.1f}" fill="#000" opacity=".16"/>')

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">
<defs>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch" seed="{SEED}"/>
    <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/>
  </filter>
</defs>
<rect width="{W}" height="{H}" fill="{MORTAR_COLOR}"/>
{"".join(bricks)}
<rect width="{W}" height="{H}" filter="url(#grain)" opacity=".5"/>
</svg>
'''

out = Path(__file__).resolve().parent.parent / "client" / "src" / "assets" / "brick.svg"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(svg)
print(f"wrote {out}  ({W}x{H}, {len(svg) // 1024} KB)")
