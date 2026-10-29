# LifUp

Hábitos como um RPG. Cada dia traz um conjunto de missões (exercício, sono, foco, estudo, casa…); cumpri-las dá XP, ouro e atributos, e falhá-las tem custo real. A app é Android nativa (Kotlin + Jetpack Compose), funciona sem conta nem servidor, e o progresso fica só no telemóvel.

## O que faz

- **Missões diárias** sorteadas de um catálogo de 95, com carga que sobe à medida que manténs os dias. Missões opcionais (meditação, natação, instrumento, medicação…) ficam na **Forja** até as ativares.
- **Penalizações**: um dia falhado custa parte do que as missões teriam dado e pode trazer missões de castigo. A dificuldade (Fácil, Normal, Difícil) define o peso.
- **Streak e pausa**: dias de descanso por semana (2 em Fácil, 1 em Normal, nenhum em Difícil) e pausas para férias ou doença que não quebram a sequência.
- **Foco**: sessões cronometradas que bloqueiam as apps que escolheres, com Não Incomodar e som ambiente opcionais. Também há um atalho nas definições rápidas.
- **Boss semanal e portais**: 27 bosses, cada um fraco a uma família de missões, e portais que aparecem ao longo do dia.
- **Ecos**: 99 criaturas para colecionar, evoluir e equipar, cada uma com uma passiva.
- **Atributos e níveis**: rank de caçador de E a N, 27 conquistas e um calendário de atividade.
- **Relatórios**: resumo do dia, da semana (que dá para partilhar) e do mês.
- **Deteção automática**: passos, GPS e outros dados marcam algumas missões sozinhos.
- **Widgets**: Missões de hoje, Foco e Progresso.
- **Cópias de segurança**: exportar e importar em ficheiro, mais cópias automáticas diárias.
- Disponível em português, inglês, espanhol, francês e alemão.

## Instalar

Transfere o `lifup-vX.Y.Z.apk` da [última release](https://github.com/bernardoam05/LifUp/releases/latest) e instala-o (o Android vai pedir para permitires apps desta origem). Precisa de Android 8.0 ou mais recente.

A partir daí a app **atualiza-se sozinha**: ao abrir, vê se há uma release mais recente no GitHub e instala-a. Na primeira vez o Android pede confirmação; do Android 12 em diante as seguintes passam sem perguntar. Também dá para procurar em Definições → Sobre.

## Lançar uma versão

1. Escreve as notas em `release-notes/<versão>/` (`en.md`, `pt.md`, `es.md`, `fr.md`, `de.md`), uma alteração por linha começada por `- `, e faz commit.
2. Cria a tag:

```bash
git tag v2.1.0 && git push origin v2.1.0
```

O workflow `Release` corre os testes, gera o APK assinado com a versão da tag (o `versionCode` vem dela: 2.1.0 → 20100) e publica a release com as notas em inglês. As apps instaladas apanham-na na próxima abertura e mostram "O que há de novo" na língua do telemóvel (inglês se não houver ficheiro nessa língua). Sem notas, a release lista os commits desde a tag anterior.

## Desenvolver

Requisitos: JDK 17+ e Android SDK 36.

```bash
./gradlew testDebugUnitTest   # regras do jogo + migração (JVM, sem emulador)
./gradlew assembleDebug       # app/build/outputs/apk/debug/app-debug.apk
./gradlew assembleRelease     # minificada (R8), assinada com a debug.keystore
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

As builds de debug não se atualizam sozinhas, para não substituírem a versão que estás a testar.

### Arquitetura

```
domain/   Kotlin puro, sem Android. Todas as regras do jogo.
          Engine.run(state, ctx) { ação } → novo estado (+ recompensas em fila)
          Day.kt (fecho do dia, penalização, streak) · Draw.kt/Load.kt (sorteio e carga)
          Quests.kt · Boss.kt (boss semanal + portais) · Shadows.kt (ecos) · Shop.kt
          Pause.kt · Weekly.kt · Month.kt · Achievements.kt · Rules.kt (constantes e fórmulas)
data/     GameStore: fonte única de verdade (StateFlow + JSON atómico em files/state.json)
          Backup (export/import) · LegacyImport (lê a app React Native antiga)
system/   SessionService (sessão de foco + bloqueio de apps) · Alarms (meia-noite, fim de
          sessão, lembretes, portais) · AutoTracker (passos, GPS) · Updater (releases do GitHub)
widget/   Widgets Glance
ui/       Compose: Hoje · Foco · Herói · Loja + Definições, Forja, Onboarding, Recompensas
assets/content/  Catálogos JSON: missões, bosses, ecos, itens, conquistas
```

Princípios:

- **Uma fonte de verdade.** UI, serviço de foco, widgets e tile leem o mesmo `GameStore`.
- **O dia fecha sem a app aberta.** Um alarme à meia-noite acorda o processo e o motor fecha o dia. O relógio a andar para trás nunca reabre nem fecha dias.
- **Uma só fila de recompensas**, mostrada um item de cada vez.
- **Conteúdo em JSON.** Equilibrar o jogo é editar `assets/content/*.json`.

### Línguas

A interface está em pt, en, es, fr e de (`res/values-*/strings.xml`). O conteúdo (missões, ecos, bosses) está em pt e en; as outras línguas usam o inglês.

## Migração da app antiga

A versão React Native está na branch [`react-native`](https://github.com/bernardoam05/LifUp/tree/react-native). Como usa o mesmo package (`com.lifup.app`) e a mesma chave, esta app instala por cima e, no primeiro arranque, converte o progresso antigo. Também dá para importar à mão em Definições → Cópia de segurança.

## Créditos

- Efeitos sonoros: [Kenney](https://kenney.nl), Interface Sounds e RPG Audio (CC0).
