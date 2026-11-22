"""Generates the Codex Magica icon and logo SVG masters into this folder.

Run:  python3 docs/brand/build_icons.py
Then rasterise the SVGs into public/ (see README.md in this folder). Needs only Python 3.

The mark is a pentagram drawn as a woven knot: travelling along the star, each line passes over the
first line it crosses and under the second, the way interlace is drawn in manuscripts and on seals.
Every line of a pentagram crosses the other lines at the golden-ratio points of its length (38.2% and
61.8%), so the weave is exact: a line is drawn in two pieces, with a gap around its 61.8% crossing.
"""
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))

# ── palette ──────────────────────────────────────────────────────────────────────────────────────
# Taken from the app's dark theme so the icon sits naturally next to the UI: the tile is the colour of
# the character cards, the gold is a muted version of the app's Kegy gold, and the ring is a dark,
# gold-tinted line like the cards' warm borders. Values were chosen in OKLCH (noted alongside).
TILE = "#1c2129"         # the app's card colour (`sheet`, oklch 0.247 0.016 258)
GOLD = "#b19869"         # antique gold strands (oklch 0.69 0.07 82)
RING = "#60533c"         # gold-tinted ring on dark (oklch 0.45 0.04 82)
FAV_RING = "#7a694a"     # a little lighter, so the ring survives in a 16 px tab (oklch 0.53 0.05 82)
GOLD_DEEP = "#8d6f3a"    # strands on white (oklch 0.56 0.08 80)
RING_PALE = "#d1c2a7"    # ring on white: lighter than the strands, as the dark ring is darker (oklch 0.82 0.04 82)
DEV_RED = "#d64545"

# ── geometry (512 × 512 canvas, centre 256,256) ──────────────────────────────────────────────────
C = 256
STAR_R = 176          # radius of the star's points
STRAND = 16           # strand width
GAP = 30              # extra clearance around an under-crossing (the gap is STRAND + GAP long)
RING_R, RING_W = 196, 8

# favicon: the same mark, heavier, so it survives 16–48 px; the ring stays a step behind the star
FAV_R, FAV_STRAND, FAV_GAP = 166, 30, 26
FAV_RING_R, FAV_RING_W = 206, 24

UNDER_T = (math.sqrt(5) - 1) / 2  # 0.618: where each line passes under the next one


def pt(r, deg):
    a = math.radians(deg)
    return C + r * math.cos(a), C + r * math.sin(a)


def lerp(a, b, t):
    return a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t


def knot(color, r=STAR_R, strand=STRAND, gap=GAP):
    tips = [pt(r, -90 + k * 144) for k in range(5)]  # every second vertex of a pentagon → pentagram
    out = []
    for i in range(5):
        a, b = tips[i], tips[(i + 1) % 5]
        half = (strand + gap) / 2 / math.dist(a, b)
        for p, q in ((a, lerp(a, b, UNDER_T - half)), (lerp(a, b, UNDER_T + half), b)):
            out.append(f'<line x1="{p[0]:.1f}" y1="{p[1]:.1f}" x2="{q[0]:.1f}" y2="{q[1]:.1f}" '
                       f'stroke="{color}" stroke-width="{strand}" stroke-linecap="round"/>')
    return "".join(out)


def ring(color, r=RING_R, width=RING_W):
    return f'<circle cx="{C}" cy="{C}" r="{r}" fill="none" stroke="{color}" stroke-width="{width}"/>'


def mark(strands, ring_color):
    return ring(ring_color) + knot(strands)


def favicon_mark():
    return ring(FAV_RING, FAV_RING_R, FAV_RING_W) + knot(GOLD, FAV_R, FAV_STRAND, FAV_GAP)


def doc(body, size=512):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="{size}" height="{size}">{body}</svg>\n'


def scaled(body, s):
    return f'<g transform="translate({C},{C}) scale({s}) translate({-C},{-C})">{body}</g>'


SQUARE = f'<rect width="512" height="512" fill="{TILE}"/>'          # app icons: the OS applies its own mask
ROUNDED = f'<rect width="512" height="512" rx="112" fill="{TILE}"/>'  # favicons: no OS mask, round it here
# sits below the star's lower points, over the faint ring only
DEV_PILL = (f'<rect x="156" y="414" width="200" height="74" rx="37" fill="{DEV_RED}"/>'
            f'<text x="256" y="467" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" '
            f'font-weight="700" font-size="50" fill="#fff" letter-spacing="2">DEV</text>')
DEV_DOT = f'<circle cx="420" cy="420" r="88" fill="{DEV_RED}" stroke="{TILE}" stroke-width="24"/>'

FILES = {
    "icon.svg": doc(SQUARE + mark(GOLD, RING)),
    "icon-dev.svg": doc(SQUARE + mark(GOLD, RING) + DEV_PILL),
    # Android maskable: everything inside the 80% safe-zone circle (radius 204.8), with margin
    "icon-maskable.svg": doc(SQUARE + scaled(mark(GOLD, RING), 0.92)),
    "favicon.svg": doc(ROUNDED + favicon_mark()),
    "favicon-dev.svg": doc(ROUNDED + favicon_mark() + DEV_DOT),
    # README logo: transparent; the weave's gaps need no background colour, so it works on any page
    "logo-light.svg": doc(mark(GOLD_DEEP, RING_PALE), 96),
    "logo-dark.svg": doc(mark(GOLD, RING), 96),
}

if __name__ == "__main__":
    for name, content in FILES.items():
        with open(os.path.join(HERE, name), "w") as f:
            f.write(content)
    print("wrote", ", ".join(FILES))
