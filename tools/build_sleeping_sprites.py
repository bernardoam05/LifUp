from pathlib import Path
from collections import deque
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DRAWABLES = ROOT / "app/src/main/res/drawable-nodpi"
LAVA_SLEEPING = Image.open(ROOT / "design/core-chatgpt/peles/pele_lava_sleeping.png").convert("RGBA")
# The generated strip uses progressive, non-uniform spacing. Boundaries are the
# transparent midpoints between its six principal character components.
LAVA_STAGE_BOUNDS = (0, 238, 503, 843, 1199, 1624, 2169)


def remove_cut_neighbors(image: Image.Image) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = image.size
    visited = bytearray(width * height)
    components = []
    for start_y in range(height):
        for start_x in range(width):
            start = start_y * width + start_x
            if visited[start] or alpha.getpixel((start_x, start_y)) < 8:
                continue
            visited[start] = 1
            queue = deque([(start_x, start_y)])
            pixels = []
            touches_edge = False
            while queue:
                x, y = queue.popleft()
                pixels.append(y * width + x)
                touches_edge = touches_edge or x == 0 or x == width - 1
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < width and 0 <= ny < height:
                        index = ny * width + nx
                        if not visited[index] and alpha.getpixel((nx, ny)) >= 8:
                            visited[index] = 1
                            queue.append((nx, ny))
            components.append((pixels, touches_edge))
    largest = max(range(len(components)), key=lambda index: len(components[index][0]))
    output = image.copy()
    output_pixels = list(output.get_flattened_data())
    for index, (pixels, touches_edge) in enumerate(components):
        if touches_edge and index != largest:
            for pixel in pixels:
                output_pixels[pixel] = (0, 0, 0, 0)
    output.putdata(output_pixels)
    return output
PREFIXES = ("core", "core_aurora", "core_sombra", "core_cristal", "core_fantasma", "core_lava", "core_galaxia")
NOTE_BOXES = (
    (0.630, 0.286, 0.763, 0.438),
    (0.653, 0.260, 0.794, 0.409),
    (0.690, 0.258, 0.821, 0.406),
    (0.674, 0.268, 0.799, 0.409),
    (0.674, 0.286, 0.784, 0.404),
    (0.635, 0.299, 0.758, 0.430),
)

for prefix in PREFIXES:
    for stage in range(1, 7):
        neutral_path = DRAWABLES / f"{prefix}_s{stage}_neutral.webp"
        relaxed_path = DRAWABLES / f"{prefix}_s{stage}_relaxed.webp"
        neutral = Image.open(neutral_path).convert("RGBA")
        relaxed = Image.open(relaxed_path).convert("RGBA")
        if neutral.size != relaxed.size:
            raise ValueError(f"Size mismatch: {neutral_path} / {relaxed_path}")
        width, height = relaxed.size
        left, top, right, bottom = NOTE_BOXES[stage - 1]
        note_box = (
            round(width * left),
            round(height * top),
            round(width * right),
            round(height * bottom),
        )
        # Preserve the complete relaxed sprite and restore only the tight musical-note
        # rectangle from neutral. This keeps both closed eyes and the original silhouette.
        sleeping = relaxed.copy()
        sleeping.paste(neutral.crop(note_box), note_box)

        if prefix == "core_lava":
            # The original Lava face files contain baked checkerboard fragments around
            # the note. Use the clean dedicated sleeping strip and align it to the
            # neutral sprite's occupied bounds instead of compositing contaminated pixels.
            source_left = LAVA_STAGE_BOUNDS[stage - 1]
            source_right = LAVA_STAGE_BOUNDS[stage]
            source = LAVA_SLEEPING.crop((source_left, 0, source_right, LAVA_SLEEPING.height))
            source = remove_cut_neighbors(source)
            source_alpha = source.getchannel("A").point(lambda alpha: 0 if alpha < 8 else alpha)
            source.putalpha(source_alpha)
            source_bounds = source_alpha.getbbox()
            target_bounds = neutral.getchannel("A").point(lambda alpha: 0 if alpha < 16 else alpha).getbbox()
            if source_bounds is None or target_bounds is None:
                raise ValueError(f"Empty Lava sleeping source at stage {stage}")
            source = source.crop(source_bounds)
            target_width = target_bounds[2] - target_bounds[0]
            target_height = target_bounds[3] - target_bounds[1]
            scale = min(target_width / source.width, target_height / source.height)
            source = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
            sleeping = Image.new("RGBA", neutral.size)
            target_center_x = (target_bounds[0] + target_bounds[2]) // 2
            target_center_y = (target_bounds[1] + target_bounds[3]) // 2
            sleeping.alpha_composite(source, (target_center_x - source.width // 2, target_center_y - source.height // 2))
        # Lossy with a lossless alpha channel, like every other sprite.
        sleeping.save(DRAWABLES / f"{prefix}_s{stage}_sleeping.webp", "WEBP", quality=90, method=6)
