# LifUp (Android nativo)

Produtividade gamificada: missões diárias, penalizações reais, foco com bloqueio de apps, boss semanal e coleção de sombras. Reescrita em Kotlin + Jetpack Compose da antiga app React Native (`../SoloLevelingRN`).

## Comandos

```bash
./gradlew testDebugUnitTest   # regras do jogo + migração (JVM, sem emulador)
./gradlew assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease     # minificada (R8), assinada com a debug.keystore
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Requisitos: JDK 17+, Android SDK 36. `minSdk` 26.

## Arquitetura

```
domain/   Kotlin puro, sem Android. Todas as regras do jogo.
          Engine.run(state, ctx) { ação } → novo estado (+ recompensas em fila)
          Day.kt (fecho do dia, penalização, streak) · Quests.kt · Boss.kt (boss semanal + portais)
          Shadows.kt (passivas, extração, evolução) · Shop.kt (loja, itens, sessões de foco)
          Achievements.kt · Rules.kt (constantes e fórmulas)
data/     GameStore — fonte única de verdade (StateFlow + JSON atómico em files/state.json)
          Backup (export/import em ficheiro) · LegacyImport (lê a app RN antiga)
system/   SessionService (sessão de foco + bloqueio de apps + som ambiente)
          BlockerAccessibilityService · Alarms (um alarme exato: meia-noite, fim de sessão,
          janela de penalização, portal, lembrete) · GpsService · FocusTileService · PortalWorker
widget/   Widgets Glance "Hoje" e "Caçador"
ui/       Compose: Hoje · Foco · Herói · Loja + Definições, Forja, Onboarding, Recompensas
assets/content/  Catálogos JSON: missões, bosses, 80 sombras, itens, conquistas
```

Princípios:

- **Uma fonte de verdade.** UI, serviço de foco, widgets e tile leem o mesmo `GameStore`. Nada de sincronizar estados.
- **O dia fecha sem a app aberta.** Um alarme à meia-noite acorda o processo, o motor fecha o dia e aplica a penalização. O relógio a andar para trás nunca reabre/fecha dias.
- **Uma só fila de recompensas** (`Reward`), mostrada um item de cada vez (diálogos para momentos grandes, snackbar para avisos).
- **Conteúdo em JSON.** Equilibrar o jogo = editar `assets/content/*.json`.

## Migração da app antiga

Com o mesmo package (`com.lifup.app`) e a mesma chave, a app instala por cima da versão RN e, no primeiro arranque, lê o `AsyncStorage` antigo (`RKStorage`) e converte o progresso. Também há importação manual em Definições → Cópia de segurança (aceita ficheiros novos e o código base64 da app antiga).

## Línguas

UI em pt, en, es, fr, de (`res/values-*/strings.xml`). Conteúdo (missões, sombras, bosses) em pt e en; as outras línguas usam o inglês.

## Credits

- UI sound effects: [Kenney](https://kenney.nl) — Interface Sounds and RPG Audio (CC0).
