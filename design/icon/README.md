# Ícone da app

**Atual: Quest Mark.** É o "!" que nos RPGs marca uma missão nova, a dourado (`#FFD866` → `#FF8A4C`, o `gold` do tema) sobre o fundo escuro de sempre.

- `quest-mark-icon.svg`: o ícone completo, recortado como o launcher o mostra (os 72 dp centrais).
- `quest-mark-black.svg`: a marca a uma cor.
- Em Android:
  - `drawable/ic_launcher_foreground.xml` e `ic_launcher_monochrome.xml` (108 dp, marca dentro da zona segura de 66 dp).
  - `drawable/ic_stat_lifup.xml` (notificações).
  - O fundo continua a ser `ic_launcher_background.xml`.
  - A splash (Android ≤11 e 12+) e o onboarding usam o primeiro plano, por isso mudam sozinhos.

## Voltar ao ícone antigo

O hexágono com chevrons está em `legacy/`, com uma pré-visualização em `legacy/icon-preview.svg`. Para o repor:

```bash
cp design/icon/legacy/ic_launcher_foreground.xml \
   design/icon/legacy/ic_launcher_monochrome.xml \
   design/icon/legacy/ic_stat_lifup.xml \
   app/src/main/res/drawable/
```
