"""Cuts the newer CoreQuest+ skins' face sheets (4x2 cells) into sprites, and makes each form's sleeping face.

The sheets in each skin's folder were drawn from crops of the six-form line-up that were cut in the wrong places, so
they are one form ahead: cara2.png shows form 3, cara3.png form 4, cara4.png form 5; cara5.png is a mix of forms 5
and 6 and is not used; cara6.png is form 6. No sheet shows form 2: its faces are put together here instead, from the
form in the line-up (pele_<skin>.png) and the eyes and symbols of the standard form-2 sprites, in the skin's eye colour.

Sprites are saved like the older skins: 320 px, lossy WebP with a lossless alpha channel. Needs Pillow and NumPy.
"""
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/core-chatgpt/peles"
DRAWABLES = ROOT / "app/src/main/res/drawable-nodpi"
SKINS = {
    "clockwork": "core_clockwork",
    "oceano_abissal": "core_oceano_abissal",
    "sakura_porcelana": "core_sakura_porcelana",
}
# Which sheet holds each form (see the note at the top); form 2 has none.
SHEET_FOR_STAGE = {1: 1, 3: 2, 4: 3, 5: 4, 6: 6}
MOODS = ["neutral", "confident", "happy", "focused", "relaxed", "excited", "tired", "frustrated", "sleeping"]
SHEET_ORDER = ("neutral", "happy", "excited", "confident", "focused", "relaxed", "tired", "frustrated")
CANVAS = 444
SIZE = 320
DEBUG = False


def clean_alpha(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    image.putalpha(image.getchannel("A").point(lambda alpha: 0 if alpha < 8 else alpha))
    return image


def pieces(solid: bytes, width: int, height: int) -> list[list[int]]:
    """The connected groups of solid pixels, each as a list of pixel indexes."""
    seen = bytearray(width * height)
    found = []
    for start in range(width * height):
        if seen[start] or not solid[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        piece = []
        while queue:
            index = queue.popleft()
            piece.append(index)
            x, y = index % width, index // width
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < width and 0 <= ny < height:
                    neighbour = ny * width + nx
                    if not seen[neighbour] and solid[neighbour]:
                        seen[neighbour] = 1
                        queue.append(neighbour)
        found.append(piece)
    return found


def without_note(relaxed: Image.Image, neutral: Image.Image) -> Image.Image:
    """
    The relaxed face hums a musical note; asleep, the Core doesn't. The note sits up and to the right of the head,
    where the neutral face has no body: whatever the relaxed sprite has in that corner beyond the neutral body's
    outline is the note (with its glow), and is erased. Some notes touch a leaf or the halo, so this compares the
    two outlines instead of looking for a loose piece. Loose leaves and sparkles the neutral face also has are
    kept, unless the note was drawn over one. The face itself is never touched.
    """
    width, height = relaxed.size
    count = width * height

    def mask(image: Image.Image) -> bytes:
        return image.getchannel("A").point(lambda alpha: 255 if alpha >= 96 else 0).tobytes()

    def grown(solid: bytes, size: int) -> bytes:
        return Image.frombytes("L", (width, height), solid).filter(ImageFilter.MaxFilter(size)).tobytes()

    solid = mask(relaxed)
    neutral_solid = mask(neutral)
    neutral_body = bytearray(count)
    for index in max(pieces(neutral_solid, width, height), key=len):
        neutral_body[index] = 255
    # Slack for the small differences between two drawings of the same thing.
    kept = grown(bytes(neutral_body), 11)
    loose = grown(bytes(255 if neutral_solid[index] and not neutral_body[index] else 0 for index in range(count)), 5)
    extra = bytes(255 if solid[index] and not kept[index] else 0 for index in range(count))
    note = bytearray(count)
    for piece in pieces(extra, width, height):
        centre_x = sum(index % width for index in piece) / len(piece)
        centre_y = sum(index // width for index in piece) / len(piece)
        shared = sum(1 for index in piece if loose[index]) / len(piece)
        if DEBUG and len(piece) >= 60:
            print(f"    piece {len(piece)}px at {centre_x / width:.2f},{centre_y / height:.2f} shared {shared:.2f}")
        if len(piece) >= 60 and centre_x > width * 0.58 and centre_y < height * 0.62 and shared < 0.8:
            for index in piece:
                note[index] = 255
    # The glow around the note goes with it; the body under it stays.
    halo = grown(bytes(note), 17)
    alpha = bytearray(relaxed.getchannel("A").tobytes())
    for index in range(count):
        if halo[index] and not kept[index]:
            alpha[index] = 0
    # Crumbs of the note left loose beside the body go too.
    near = grown(bytes(note), 41)
    for piece in pieces(bytes(255 if value >= 8 else 0 for value in alpha), width, height):
        if len(piece) < 120 and all(near[index] for index in piece) and not any(loose[index] for index in piece):
            for index in piece:
                alpha[index] = 0
    output = relaxed.copy()
    output.putalpha(Image.frombytes("L", relaxed.size, bytes(alpha)))
    return clean_alpha(output)


def save(image: Image.Image, name: str) -> None:
    image.resize((SIZE, SIZE), Image.Resampling.LANCZOS).save(DRAWABLES / f"{name}.webp", "WEBP", quality=90, method=6)


# -- Form 2, which no sheet shows ------------------------------------------------------------

def runs(flags, min_len=60, gap=8):
    out=[]; start=None; last=None
    for i,f in enumerate(flags):
        if f:
            if start is None: start=i
            elif i-last>gap: out.append((start,last+1)); start=i
            last=i
    if start is not None: out.append((start,last+1))
    return [r for r in out if r[1]-r[0]>=min_len]

def lineup_form(skin, n):
    im = Image.open(SOURCE / f"pele_{skin}.png").convert("RGBA")
    a = np.array(im.getchannel("A")) > 40
    cols = runs(a.any(0))
    x0,x1 = cols[n-1]
    rows = np.where(a[:,x0:x1].any(1))[0]
    return im.crop((x0, rows[0], x1, rows[-1]+1)), len(cols)

def base_form2(mood):
    return Image.open(DRAWABLES / f"core_s2_{mood}.webp").convert("RGBA").resize((CANVAS,CANVAS), Image.Resampling.LANCZOS)

def mask_img(m): return Image.fromarray((m*255).astype(np.uint8))
def grow(m, k): return np.array(mask_img(m).filter(ImageFilter.MaxFilter(k)))>0
def shrink(m, k): return np.array(mask_img(m).filter(ImageFilter.MinFilter(k)))>0

def largest(m):
    im = mask_img(m).convert("L"); best=None; px=im.load(); w,h=im.size; label=100
    arr=np.array(im)
    seen=np.zeros_like(arr,bool); bestmask=None; bestn=0
    ys,xs=np.where(arr>0)
    for y,x in zip(ys,xs):
        if seen[y,x]: continue
        tmp=Image.fromarray(np.where(seen,0,arr).astype(np.uint8)).copy()
        ImageDraw.floodfill(tmp,(int(x),int(y)),128)
        comp=np.array(tmp)==128
        seen|=comp
        n=comp.sum()
        if n>bestn: bestn=n; bestmask=comp
    return bestmask

def fill_holes(m):
    im=mask_img(m).convert("L"); big=Image.new("L",(im.width+2,im.height+2),0); big.paste(im.copy(),(1,1))
    ImageDraw.floodfill(big,(0,0),128)
    return np.array(big)[1:-1,1:-1]!=128

def interior(img):
    a=np.array(img); mx=a[...,:3].max(2); dark=(mx<80)&(a[...,3]>200)
    core=largest(shrink(dark,9))
    return fill_holes(grow(core,9)&(a[...,3]>200))

def bbox(m):
    ys,xs=np.where(m); return xs.min(),ys.min(),xs.max()+1,ys.max()+1

def form2(skin, resource):
    crop, _ = lineup_form(skin, 2)
    b0=base_form2("neutral"); ba=np.array(b0)
    bx0,by0,bx1,by1=bbox(ba[...,3]>96)
    s=(by1-by0)/crop.height
    crop=crop.resize((round(crop.width*s),round(crop.height*s)),Image.Resampling.LANCZOS)
    skinc=Image.new("RGBA",(CANVAS,CANVAS))
    skinc.paste(crop,(round((bx0+bx1)/2-crop.width/2), by1-crop.height),crop)
    sa=np.array(skinc).astype(float)
    sreg=interior(skinc); breg=interior(b0)
    sb=bbox(sreg); bb=bbox(breg)
    k=((sb[2]-sb[0])/(bb[2]-bb[0])+(sb[3]-sb[1])/(bb[3]-bb[1]))/2
    scx,scy=(sb[0]+sb[2])/2,(sb[1]+sb[3])/2; bcx,bcy=(bb[0]+bb[2])/2,(bb[1]+bb[3])/2
    def warp(layer):
        w=layer.resize((round(CANVAS*k),round(CANVAS*k)),Image.Resampling.LANCZOS)
        out=Image.new("RGBA",(CANVAS,CANVAS)); out.paste(w,(round(scx-bcx*k),round(scy-bcy*k)),w); return out
    smx=sa[...,:3].max(2)
    darkc=np.median(sa[sreg&(smx<50)][:,:3],axis=0)
    eyes=sa[sreg&(smx>110)][:,:3]
    lum=eyes.max(1); mid=eyes[lum>=np.percentile(lum,40)].mean(0); hot=eyes[lum>=np.percentile(lum,92)].mean(0)
    bmx0=ba[...,:3].max(2); peak=np.percentile(bmx0[breg&(bmx0>110)],97)
    # the skin with a blank hood
    blank=sa.copy(); blank[sreg,:3]=darkc; blank[sreg,3]=255
    res={}
    for mood in MOODS:
        if mood=="neutral": res[mood]=skinc; continue
        b=np.array(base_form2(mood)).astype(float); bmx=b[...,:3].max(2)
        t=np.clip((bmx-45)/(peak-45),0,1)
        rgb=np.where(t[...,None]<0.6, darkc+(mid-darkc)*(t[...,None]/0.6), mid+(hot-mid)*((t[...,None]-0.6)/0.4))
        face=np.zeros((CANVAS,CANVAS,4)); face[...,:3]=rgb; face[...,3]=np.where(breg,255,0)
        fw=np.array(warp(Image.fromarray(face.astype(np.uint8)))).astype(float)
        out=blank.copy()
        al=(fw[...,3:4]/255)*sreg[...,None]
        out[...,:3]=out[...,:3]*(1-al)+fw[...,:3]*al
        outi=Image.fromarray(out.astype(np.uint8))
        # the small symbol beside the head
        sym=(b[...,3]>96)&~grow(ba[...,3]>32,13)
        if sym.sum()>25:
            sl=b.copy(); l=(bmx/255)[...,None]; sl[...,:3]=np.clip(hot*l*1.15,0,255); sl[...,3]=np.where(grow(sym,3),b[...,3],0)
            outi.alpha_composite(warp(Image.fromarray(sl.astype(np.uint8))))
        res[mood]=outi
    return fitted(res, resource)


def fitted(res, resource):
    """Brings form 2 to the size the sheets drew its neighbours at: as tall as form 1, centred, symbols still inside."""
    first = Image.open(DRAWABLES / f"{resource}_s1_neutral.webp").convert("RGBA")
    fx0, fy0, fx1, fy1 = bbox(np.array(first)[..., 3] > 96)
    target = (fy1 - fy0) * CANVAS / first.height
    x0, y0, x1, y1 = bbox(np.array(res["neutral"])[..., 3] > 96)
    everything = np.zeros((CANVAS, CANVAS), bool)
    for sprite in res.values():
        everything |= np.array(sprite)[..., 3] > 96
    ex0, ey0, ex1, ey1 = bbox(everything)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    reach = max(cx - ex0, ex1 - cx, cy - ey0, ey1 - cy)
    zoom = min(target / (y1 - y0), CANVAS * 0.485 / reach)
    out = {}
    for mood, sprite in res.items():
        size = round(CANVAS * zoom)
        big = sprite.resize((size, size), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (CANVAS, CANVAS))
        canvas.paste(big, (round(CANVAS / 2 - cx * zoom), round(CANVAS / 2 - cy * zoom)), big)
        out[mood] = canvas
    return out



if __name__ == "__main__":
    for source_name, resource_name in SKINS.items():
        for mood, sprite in form2(source_name, resource_name).items():
            save(sprite, f"{resource_name}_s2_{mood}")
        for stage, sheet_number in SHEET_FOR_STAGE.items():
            sheet = Image.open(SOURCE / source_name / f"cara{sheet_number}.png").convert("RGBA")
            cells = {}
            for index, mood in enumerate(SHEET_ORDER):
                column, row = index % 4, index // 4
                box = (
                    round(column * sheet.width / 4),
                    round(row * sheet.height / 2),
                    round((column + 1) * sheet.width / 4),
                    round((row + 1) * sheet.height / 2),
                )
                cell = clean_alpha(sheet.crop(box))
                canvas = Image.new("RGBA", (CANVAS, CANVAS))
                canvas.paste(cell, ((CANVAS - cell.width) // 2, (CANVAS - cell.height) // 2), cell)
                cells[mood] = canvas
                save(canvas, f"{resource_name}_s{stage}_{mood}")
            save(without_note(cells["relaxed"], cells["neutral"]), f"{resource_name}_s{stage}_sleeping")
