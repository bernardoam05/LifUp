# Novas formas da Core (ChatGPT)

O que correu mal antes: quando lhe pedimos para "desenhar as 5 formas", ele inventou outra personagem (com capuz). Agora pedimos para **editar a Core atual**, uma forma de cada vez e mudando só o corpo. A cabeça, a cara, a folha grande do topo e o estilo brilhante ficam iguais.

Faz tudo na **mesma conversa**, por esta ordem, para ele manter a coerência entre formas.

## Pedido 1: a forma 1 (anexar `pedido1_A_core_atual.png` e `pedido1_C_evolucao_referencia.png`)

```
Edit image 1, don't redraw the character. Image 1 is my app mascot "Core". Image 2 is ONLY a reference for how the body should evolve across 5 stages (sprout, petal collar, open bloom, leaf cape, halo): do NOT copy its hood, its face, its muted colors or its style. Keep EXACTLY: the round dark face, the glowing mint eyes, the crown of pointed leaves around the face, the big curled leaf on top, the glossy vibrant mint-green style, the outline and the lighting. There is no hood: the face is framed by leaves.

Change only the size and the body: make it a small, young "sprout" version like stage 1 of image 2: a slightly smaller crown (fewer leaves around the face), a short simple body of 3 leaves, a small chest diamond. Keep the figure compact: the face must stay about as big, relative to the whole figure, as in image 1.

Output: the character alone, centered, 1024×1024, REAL transparent background (alpha channel, not a checkerboard pattern), no text, no shadow.
```

## Pedidos 2 a 5: as outras formas (na mesma conversa)

Depois de aprovares a anterior, cola o texto e troca o que está entre [ ]:

```
Now edit the ORIGINAL image 1 again (not the sprout), same rules: same face, eyes, leaf crown, top curled leaf, glossy mint style, no hood. Change only the body to stage [N], following stage [N] of image 2 for the body only: [BODY]. Keep the figure compact, not tall: the face must stay about as big, relative to the whole figure, as in image 1. Same output: centered, 1024×1024, real transparent background, no text, no shadow.
```

Os [BODY] de cada forma:
- **2:** `a collar of small pale petals under the face, a leafy body slightly bigger than the original`
- **3:** `open pale petals spreading around the lower body like a blooming flower, visible small shoulders`
- **4:** `a cape of leaves over the shoulders and back, reaching just below the body, a bigger glowing chest crystal`
- **5:** `elegant flowing leaf robes that stay compact, a thin glowing mint ring floating above the head, a few small light particles, no fog or haze`

Guarda-as nesta pasta como `forma1.png` … `forma5.png`.

## Pedido 6: as 8 emoções (uma folha por forma, de 1 a 6, na mesma conversa)

**Anexar:** `formaN.png` (e, só na primeira vez, `pedido2_B_caras_atuais.png` como referência das 8 expressões)

```
Image 1 is my mascot at stage N. Make a sprite sheet of it with 8 expressions.

Sheet: ONE image, as large as you can (ideally 2048×1024), a 4×2 grid of 8 equal square cells, REAL transparent background (alpha, not a checkerboard), no text, no borders, no grid lines, generous empty space between cells so nothing touches a neighbour.

In every cell the character is identical to image 1: same body, pose, colors, size and position, centered. ONLY the eyes change, plus at most one small symbol next to the head. The face has no mouth: expressions come from the glowing eyes (shape, lids, tilt).

Order, left to right, top to bottom:
1 neutral (as in image 1)
2 happy (eyes closed in upward arcs)
3 excited (> < eyes, two small sparkles)
4 confident (eyes narrowed into a self-assured squint, a small shine)
5 focused (determined, slightly narrowed eyes, a small target icon)
6 relaxed (half-closed calm eyes, a small music note)
7 tired (drooping heavy lids, a sweat drop)
8 frustrated (eyes slanted down toward the center, a small anger vein mark)

"Tired" and "frustrated" must be unmistakable from each other, and "neutral" from "confident".
```

Para as formas seguintes, na mesma conversa: *"Same sheet, same rules and same expressions, now for this stage"* e anexa a `formaN.png` seguinte.

Guarda cada folha nesta pasta como `caras_formaN.png`. Eu corto as células, limpo o fundo, alinho todas pela forma original e integro na app.
