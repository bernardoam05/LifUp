# Ícone da app

**Atual: a Core.** A cabeça da Core (a forma 1) sobre verde escuro, com um brilho por trás.

- `core/icon-preview.png`: o ícone completo; `core/sprites.png`: as 5 formas × 8 caras usadas na app.
- Em Android:
  - `mipmap-*/ic_launcher_foreground.webp` e `ic_launcher_monochrome.webp` (108 dp, a cabeça dentro da zona segura de 66 dp).
  - `drawable/ic_launcher_background.xml`: o degradé verde escuro.
  - `drawable/ic_stat_lifup.xml` (notificações): o losango do peito da Core.
  - A splash e o onboarding usam a Core, por isso mudam sozinhas.
  - As caras na app estão em `drawable-nodpi/core_s<forma>_<cara>.webp`.

## Voltar a um ícone anterior

Os vetores dos ícones anteriores ficam guardados:

- `quest-mark/`: o "!" dourado (2.0.10 e 2.0.11).
- `legacy/`: o hexágono com chevrons.

Para repor um deles, apaga os `ic_launcher_foreground.webp` e `ic_launcher_monochrome.webp` de `mipmap-*`, copia os `.xml` dessa pasta para `app/src/main/res/drawable/` e, em `mipmap-anydpi-v26/ic_launcher*.xml` e em `drawable/background_splash.xml`, troca `@mipmap/ic_launcher_…` por `@drawable/ic_launcher_…`.
