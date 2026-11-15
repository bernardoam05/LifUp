"""Cuts the newer CoreQuest+ skins' face sheets (4x2 cells) into sprites, and makes each form's sleeping face.

Sprites are saved like the older skins: 320 px, lossy WebP with a lossless alpha channel. Needs only Pillow.
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "design/core-chatgpt/peles"
DRAWABLES = ROOT / "app/src/main/res/drawable-nodpi"
SKINS = {
    "clockwork": "core_clockwork",
    "oceano_abissal": "core_oceano_abissal",
    "sakura_porcelana": "core_sakura_porcelana",
}
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


if __name__ == "__main__":
    for source_name, resource_name in SKINS.items():
        for stage in range(1, 7):
            sheet = Image.open(SOURCE / source_name / f"cara{stage}.png").convert("RGBA")
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
