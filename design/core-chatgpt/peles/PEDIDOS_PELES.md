# Peles do LifUp+ (ChatGPT)

Uma conversa nova **por pele**. Em cada uma anexas **só** `base_6_formas.png` (nesta pasta) e colas o pedido dessa pele. Ele devolve as 6 formas com a pele; as 8 caras de cada forma faço eu a partir das que já temos.

Guarda cada resultado nesta pasta com o nome indicado.

## Regras comuns (já estão dentro de cada pedido)

As silhuetas, as poses, os tamanhos e as posições das 6 formas ficam **exatamente** iguais; só mudam o material, as cores e os efeitos. Fundo transparente a sério (não o xadrez desenhado), sem texto e sem sombra no chão.

---

## 1. Aurora → `pele_aurora.png`

```
Edit the attached image, don't redraw it: keep the 6 characters EXACTLY as they are (same silhouettes, hood, petals, cape, wings, halo, poses, sizes and positions in the row, same dark face with two oval eyes). Change only their material and colours into an "Aurora" skin: leaves in a smooth northern-lights gradient (teal to violet to pink), a soft shimmering sheen, eyes and chest gem glowing white-teal. REAL transparent background (alpha channel, not a checkerboard), no text, no ground shadow, no glow fog around the figures.
```

## 2. Sombra → `pele_sombra.png`

```
Edit the attached image, don't redraw it: keep the 6 characters EXACTLY as they are (same silhouettes, hood, petals, cape, wings, halo, poses, sizes and positions in the row, same dark face with two oval eyes). Change only their material and colours into a "Shadow" skin: matte charcoal-black leaves with thin cyan edges, a few wisps of dark smoke trailing from the lower leaves, eyes and chest gem glowing bright cyan. REAL transparent background (alpha channel, not a checkerboard), no text, no ground shadow, no fog around the figures.
```

## 3. Cristal → `pele_cristal.png`

```
Edit the attached image, don't redraw it: keep the 6 characters EXACTLY as they are (same silhouettes, hood, petals, cape, wings, halo, poses, sizes and positions in the row, same dark face with two oval eyes). Change only their material and colours into a "Crystal" skin: leaves made of translucent ice-blue glass with facets and small sparkles, light passing through them, eyes and chest gem glowing pale blue. REAL transparent background (alpha channel, not a checkerboard), no text, no ground shadow, no glow fog around the figures.
```

## 4. Fantasma → `pele_fantasma.png`

```
Edit the attached image, don't redraw it: keep the 6 characters EXACTLY as they are (same silhouettes, hood, petals, cape, wings, halo, poses, sizes and positions in the row, same dark face with two oval eyes). Change only their material and colours into a "Ghost" skin: pale, softly see-through lavender-white leaves that fade out at the tips, a faint ghostly outline, eyes and chest gem glowing soft violet. REAL transparent background (alpha channel, not a checkerboard), no text, no ground shadow, no fog around the figures.
```

## 5. Lava → `pele_lava.png`

```
Edit the attached image, don't redraw it: keep the 6 characters EXACTLY as they are (same silhouettes, hood, petals, cape, wings, halo, poses, sizes and positions in the row, same dark face with two oval eyes). Change only their material and colours into a "Lava" skin: dark basalt-grey leaves with glowing orange-red cracks running through them, tiny embers at the tips, eyes and chest gem glowing molten orange. REAL transparent background (alpha channel, not a checkerboard), no text, no ground shadow, no smoke or fog around the figures.
```

## 6. Galáxia → `pele_galaxia.png`

```
Edit the attached image, don't redraw it: keep the 6 characters EXACTLY as they are (same silhouettes, hood, petals, cape, wings, halo, poses, sizes and positions in the row, same dark face with two oval eyes). Change only their material and colours into a "Galaxy" skin: deep navy-to-purple leaves filled with a starry night sky (tiny stars and a soft nebula), eyes and chest gem glowing star-white. REAL transparent background (alpha channel, not a checkerboard), no text, no ground shadow, no glow fog around the figures.
```

---

**Se ele mexer nas silhuetas ou nas poses:** responde na mesma conversa *"The silhouettes changed. Keep them pixel-identical to the attached image; change only colours and material."* e volta a anexar `base_6_formas.png`.

---

# Caras de cada pele (8 expressões por forma)

Cada pele tem uma pasta (`aurora/`, `sombra/`, `cristal/`, `fantasma/`, `lava/`, `galaxia/`) com as 6 formas já separadas (`forma1.png` … `forma6.png`).

Faz **uma conversa por pele** e, dentro dela, as 6 formas por ordem. Em cada pedido anexas duas imagens:
1. `peles/<pele>/formaN.png` (a forma com a pele);
2. `caras_formaN.png` da pasta `design/core-chatgpt/` (as 8 caras dessa forma na versão normal).

```
Image 1 is my mascot in a special skin. Image 2 is the SAME character in its normal colours with its 8 expressions. Make a sprite sheet of image 1 with exactly those 8 expressions.

Sheet: ONE image, as large as you can (ideally 2048×1024), a 4×2 grid of 8 equal square cells, REAL transparent background (alpha channel, not a checkerboard), no text, no borders, generous space between cells.

In every cell the character is identical to image 1: same skin, colours, effects, body, pose, size and position, centered. ONLY the eyes change (and the small symbol next to the head), copied from image 2 in the same order, with the eyes glowing in image 1's eye colour:
1 neutral, 2 happy, 3 excited, 4 confident, 5 focused, 6 relaxed, 7 tired, 8 frustrated.
```

Para as formas seguintes, na mesma conversa: *"Same sheet, same rules, now for this stage"* e anexas as duas imagens dessa forma.

Guarda cada folha como `peles/<pele>/caras_formaN.png`. Eu corto as células, alinho tudo e integro na app.
