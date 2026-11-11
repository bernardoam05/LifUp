# Missões em par

Duas pessoas fazem a mesma missão, cada uma a sua parte. A recompensa extra só abre quando ambas acabam. Este documento é o desenho: regras do jogo, sincronização, custos e configuração do Firebase. As regras de segurança estão em [`firebase/firestore.rules`](../firebase/firestore.rules), com testes no emulador (`cd firebase && npm ci && npm test`; corre também no workflow `Firestore rules`).

## 1. Regras do jogo

### 1.1 A parte de cada um

Cada pessoa faz o que a missão lhe pediria se a fizesse sozinha, no passo em que está nessa missão (`QuestDef.targetAt(step)`). Quem está mais avançado faz mais: 20 + 40 flexões = 60 no total. Não há uma divisão a combinar e nenhum dos dois precisa de saber o nível do outro para calcular a sua parte. A parte do colega aparece só para mostrar o total.

### 1.2 Recompensas

| Resultado | Quem cumpriu | Quem falhou |
|---|---|---|
| Ambos cumpriram | recompensa normal + **25%** | — |
| O colega falhou | recompensa normal **−10%** | penalização normal de missão falhada |
| Desconhecido (ver 1.4) | recompensa normal (**×1**) | penalização normal, decidida pelo próprio telemóvel |

- **A recompensa normal chega quando concluis a tua parte**, como numa missão solo. Os +25% ou os −10% chegam no acerto, depois do prazo, como entrada própria na fila de recompensas ("Bónus de par de ontem").
- **Com o −10%, entrar num par compensa** desde que o colega cumpra pelo menos 3 vezes em cada 10.
- **Contra o farm:** criar e abandonar pares não dá nada, porque só se ganha pelo que se fez. O bónus de +25% conta apenas nas **2 primeiras missões de par de cada dia**, com o mesmo par ou com pares diferentes. As seguintes valem ×1, e o −10% continua a aplicar-se.
- No máximo **3 missões de par ativas** por pessoa.
- **A parte de par não entra no fecho do dia local.** O fecho do dia não lhe dá recompensa nem penalização: tudo é tratado no momento em que concluis e no acerto. Assim, quem está noutro fuso horário não fica com a missão partida entre dois dias.

### 1.3 Prazo e recorrência

- **O prazo de cada ciclo é a meia-noite de quem criou o par**, no fuso guardado em `tz`. Para o colega é um instante absoluto, que pode não ser a meia-noite dele.
- **Recorrência:** `once` (uma vez), `daily` (todos os dias), `weekly` (dias da semana escolhidos) e `every` (de N em N dias, a contar de `start`). A aleatória não existe, porque cada telemóvel sorteia de forma diferente.
- **O ciclo é identificado pela data de quem criou** (`2026-11-11`). Os dois telemóveis calculam o ciclo e o prazo da mesma forma, a partir de `start`, `recurrence` e `tz`, sem escreverem nada no Firestore para isso.
- **Sequência do par:** quantos ciclos seguidos os dois cumpriram. É só para mostrar e não dá recompensa.

### 1.4 Acerto, sincronização atrasada e quota esgotada

O acerto é feito em cada telemóvel. A regra é: **as boas notícias chegam logo, as más só depois de confirmadas.**

1. **Primeira leitura, ao prazo + 5 minutos.** Se o colega tem a conclusão do ciclo com `at ≤ prazo`, recebes os +25% e o acerto fica feito.
2. **Se o colega ainda não aparece,** não se conclui nada. Há uma segunda leitura depois do próximo reset da quota (meia-noite do Pacífico, perto das 8h em Lisboa), mais 30 minutos.
   - Se o colega continua a não aparecer, o resultado é "colega falhou" (−10%).
   - Se aparece com `at > prazo`, o resultado é **desconhecido (×1)**. Isto cobre o caso de alguém que concluiu a tempo mas não conseguiu enviar porque estava sem rede ou com a quota esgotada: a escrita só chegou depois do prazo, com a hora do servidor dessa altura.
3. **Se não for possível ler** (falta de rede, ou a quota esgotada com `RESOURCE_EXHAUSTED`), o telemóvel volta a tentar até **36 horas depois do prazo**. Passado esse tempo, o resultado é **desconhecido (×1)**, e conta 1 vez para esse dia.
4. **Aviso por link (em vez de um botão):** não há nenhum botão que leia o Firestore à mão, para ninguém o carregar sem parar. Quem conclui a sua parte pode tocar em "Avisar o par", que abre a folha de partilha do Android com um link (ver 1.5). Abrir esse link é a única forma de forçar uma verificação, e conta como prova se o servidor não responder.

**Quando a quota esgota:**
- Ao receber `RESOURCE_EXHAUSTED`, a app guarda `quotaBlockedUntil` = próximo reset + 10 minutos.
- Até lá, não lê nem escreve nada que não seja essencial: sem aviso das 20h e sem atualização com a app aberta. O cartão do par mostra "Serviço cheio hoje; volta a funcionar por volta das 8h. Podes avisar o teu par por link."
- As conclusões ficam numa fila local (`pairOutbox` no `GameStore`) e são enviadas depois do reset. Não confiamos só na fila do SDK, porque o SDK pode rejeitar uma escrita em vez de a guardar.
- O progresso local nunca se perde. O pior que pode acontecer é o resultado sair ×1.

### 1.5 O link de aviso

- **Formato:** `https://questborn-38f2a.web.app/p/#<dados>`. É uma página estática no Firebase Hosting (`firebase/hosting/p/`), ligada à app por App Links (`assetlinks.json`). Se a app não estiver instalada, a página manda para a loja. Se o browser de outra app não abrir a app sozinho, o botão da página passa o link por `intent:` com os dados em `?d=`, e a app aceita as duas formas.
- **Tudo vai no fragmento (`#`)**, que nunca chega ao servidor. Os dados são o `pairId`, o ciclo, o uid de quem concluiu, a quantidade, a hora local da conclusão e uma assinatura HMAC-SHA256 com o `secret` do par. O `secret` são 32 bytes aleatórios guardados no documento do par, que só os membros leem.
- **Ao abrir o link,** a app confirma a assinatura e guarda localmente "o colega concluiu o ciclo X às HH:MM". Depois faz **uma** leitura do Firestore, se a quota não estiver esgotada, para atualizar o resto.
- **No acerto,** conta primeiro a entrada no servidor. Se ela não existir, conta a do link, que vale como dentro do prazo se a hora indicada for anterior ao prazo. Com isto, o caso da quota esgotada deixa de dar ×1 sempre que o colega mandou o link.
- **Contra o spam:**
  - só há um link por ciclo e por pessoa, e só depois de concluíres;
  - abrir o mesmo link outra vez, ou um link de um ciclo já acertado, não faz nenhuma leitura;
  - no máximo 3 leituras por dia são feitas a partir de links.
- A hora no link vem do relógio do telemóvel e não é provada. A app já confia em quem diz que fez a missão, por isso não fica menos segura.

Quem falhou nunca depende do servidor para saber o seu próprio resultado. O telemóvel sabe se concluiu antes do prazo, pelo relógio local, e aplica a penalização normal se não concluiu.

## 2. Sincronização (Firestore)

### Porque o Firestore

- Guarda o estado do par.
- As regras de segurança garantem que cada telemóvel só escreve a sua parte e que as conclusões levam a hora do servidor.
- Funciona sem servidor nosso e sem cartão: no plano Spark nunca há cobrança, só a quota a esgotar.

A alternativa era o ntfy. Só fazia sentido com verificações frequentes, porque não conta leituras; sem elas, deixa de compensar, e o ntfy.sh guarda as mensagens apenas 12 horas.

### Dados

```
invites/{code}                 { pairId, by, expireAt }                       código de 8 letras, válido 24 h
pairs/{pairId}                 { createdBy, members[≤2], quest, recurrence,
                                 tz, start, secret, invite?, expireAt }
pairs/{pairId}/parts/{uid}     { name, level, last, done: { "<ciclo>": { at, amount } }, expireAt }
```

- **`pairId`:** 20 caracteres aleatórios. Nunca aparece a ninguém; o único segredo partilhado é o código do convite.
- **`quest`:** o id da missão no catálogo. O texto nas 5 línguas vem do catálogo local de cada telemóvel, por isso uma missão personalizada não pode ser usada em par na primeira versão.
- **`done`:** um mapa por ciclo. Só se acrescenta o ciclo indicado em `last`, com `at` igual à hora do servidor. Uma entrada nunca é reescrita e as antigas podem ser apagadas. Guardam-se as últimas 7, num máximo de 14.
- **`expireAt`:** daqui a 30 dias (as regras aceitam no máximo 40), renovado sempre que há uma escrita. Serve para a app reconhecer pares abandonados e apagá-los (no plano Spark não há TTL; ver 5).
- **`secret`:** a chave que assina os links de aviso (1.5). É gerada por quem cria o par e nunca muda.
- **`name`:** o nome do herói (`Player.name`), com 24 caracteres no máximo. É o único dado pessoal.

### O que as regras garantem

Os testes estão em `firebase/test/rules.test.js`.

- Sem sessão iniciada não se faz nada. Ninguém consegue listar pares nem convites.
- **Criar um par:** só para ti, sozinho nele, com os campos exatos e um `expireAt` razoável.
- **Convite:** só quem está sozinho no par o pode criar. O código tem o formato certo, dura no máximo 1 dia e só se lê se ainda não expirou.
- **Entrar num par:** só com um convite válido para esse par, e só te acrescentas a ti, sem mudar mais nada.
- **Membros:** podem renovar o `expireAt`, sair ou terminar o par para os dois. Ninguém de fora o pode fazer.
- **A parte de cada um:** só o dono a escreve e os dois membros leem ambas. As conclusões não podem ter hora antiga, não podem ser reescritas e não podem acrescentar dois ciclos de uma vez. O tamanho fica limitado.

### Fluxos

| Ação | Escritas | Leituras |
|---|---|---|
| Criar o par e o convite | 3 (par, parte, convite) | 1 (a regra lê o par) |
| Entrar com o código | 3 (par, parte, apagar o convite) | 3 |
| Concluir a tua parte | 1 | 1 (a regra lê o par) |
| Abrir o ecrã do par | — | 1 a 3 (as partes, mais a leitura da regra) |
| Aviso das 20h (só se a tua parte ainda não está feita) | — | 1 a 3 |
| Acerto (1 ou 2 leituras) | — | 2 a 6 |
| Sair ou terminar | 1 a 3 | 1 a 2 |

A partilha do código é feita por QR no ecrã ou pela folha de partilha do Android. A sincronização normal não depende de links: o código só serve para entrar no par, e o link de aviso (1.5) é opcional.

### Orçamento diário (plano Spark: 50 000 leituras, 20 000 escritas, 20 000 apagamentos)

Num dia normal, por par recorrente, há ~2 escritas (as duas conclusões) e ~8 a 12 leituras (aberturas, acerto e o aviso das 20h).

- **O limite são as leituras**, e chegam para **cerca de 4 000 a 6 000 pares ativos por dia**.
- **As escritas chegam para cerca de 10 000 pares.**
- **As regras também contam leituras:** cada `get()` dentro de uma regra é cobrado. Por isso as regras leem o par uma vez por pedido e não guardam cópias.

## 3. Na app

- **`system/PairSync.kt`:** uma interface (`create`, `invite`, `join`, `markDone`, `readParts`, `leave`) com uma implementação para o Firestore. Se um dia for preciso trocar de serviço (ntfy alojado por nós, ou o plano pago com teto de orçamento), muda-se só esta peça.
- **`domain/Pairs.kt`:** Kotlin puro e testado no CI. Calcula o ciclo e o prazo a partir de `start`, `recurrence` e `tz`, faz o acerto (os três resultados, a janela de 36 horas e o reset do Pacífico), aplica o teto de 2 bónus por dia e o máximo de 3 pares.
- **Estado no `GameStore`:**
  - os pares ativos e as partes de hoje;
  - `pairOutbox`, a fila de conclusões por enviar;
  - `pairSettled`, os ciclos já acertados, para nunca pagar duas vezes;
  - `quotaBlockedUntil`.
- **Alarmes e workers:**
  - um alarme exato ao prazo + 5 minutos, mais um WorkManager com a restrição de ter rede, para o acerto;
  - uma segunda tentativa depois do reset do Pacífico;
  - o aviso das 20h.
  - Não há nenhuma verificação periódica de 15 em 15 minutos.
- **Firebase:**
  - Os SDKs são `firebase-auth` e `firebase-firestore` (com o BoM), e acrescentam ~1,5 a 2 MB depois do R8.
  - O Firebase é iniciado à mão, com `FirebaseOptions` vindos de `BuildConfig` (apiKey, appId, projectId). Estes valores não são secretos.
  - Sem o plugin `google-services`, o projeto continua a compilar sem `google-services.json`.
  - A sessão anónima só começa quando a pessoa cria ou entra num par. Quem nunca usa pares nunca fala com a Google.
- **Variantes:** funciona igual na `github` e na `play`. O Firestore e a autenticação anónima não precisam dos Google Play Services.
- **App Check:** fica de fora. O Play Integrity recusaria as instalações vindas do GitHub.
- **Textos novos:** nas 5 línguas, como sempre.

## 4. Privacidade e Play

- **PRIVACY.md:** deixa de ser verdade que não há servidor. Passa a dizer que, só se usares missões em par, um ID anónimo, o nome do herói, o nível e as conclusões dessas missões vão para o Cloud Firestore (Google, UE), cifrados em trânsito. São apagados quando sais do par, e no máximo 30 dias depois da última atividade. Não há conta nem email e nada é vendido.
- **Formulário de segurança dos dados:**
  - **Dados recolhidos:** "Identificadores do dispositivo ou outros IDs" (o ID anónimo), "Informações pessoais → Nome" (o nome do herói), "Atividade na app" (as conclusões).
  - **Finalidade:** funcionalidade da app.
  - **Opcional:** sim.
  - **Partilhado com terceiros:** não. A Google é um fornecedor de serviços e não conta como partilha.
  - **Cifrado em trânsito:** sim.
  - **Pedido de eliminação:** sim, saindo do par.

## 5. Firebase (configurado a 2026-11-11)

Projeto **`questborn-38f2a`**, no plano Spark e sem cartão. Estes valores não são secretos e vão no código da app:

| | |
|---|---|
| projectId | `questborn-38f2a` |
| appId | `1:382154712615:android:79cd702cd5c23e3fd4d002` |
| apiKey | `AIzaSyD-0xUx5exVsBbFFckaUDBSZaaerGP8ju8` |

O que está feito:

- **Firestore:** base `(default)`, edição Standard, em `eur3`. As regras deste repositório estão publicadas.
- **Authentication:** só o login anónimo. Fica no Firebase Auth normal (`FIREBASE_AUTH`), **sem o Identity Platform**, que no plano Spark limita a 3 000 utilizadores ativos por dia. A **limpeza automática de contas anónimas fica desligada**, porque apaga as contas 30 dias depois de criadas, mesmo que estejam a ser usadas, e um par com mais de um mês deixava de funcionar. As contas anónimas não contam para nenhum limite.
- **App Android** `com.lifup.app`, com o SHA-1 e o SHA-256 da chave do GitHub.
- **Chave de API Android:** só aceita pedidos de `com.lifup.app` com a chave do GitHub, e só para Firestore, Identity Toolkit, Token Service e Firebase Installations.
- **Chave de API de browser:** a app não a usa. Só funciona a partir dos domínios do próprio Hosting.
- **Hosting:** `https://questborn-38f2a.web.app` serve a página do link (`/p/`) e o `/.well-known/assetlinks.json`. O Google já o reconhece.
- **Sem TTL:** as políticas de TTL do Firestore exigem a faturação ativa. A limpeza fica a cargo da app:
  - quem sai apaga a sua parte, e o último a sair apaga o par;
  - convites usados são apagados ao entrar;
  - se o par ou o colega tiver um `expireAt` já passado, a app trata o par como terminado e apaga o que as regras deixam.
  - Os restos (apps desinstaladas, convites nunca usados) ocupam ~1 KB cada. O plano tem 1 GiB, por isso cabem ~1 milhão antes de ser preciso uma limpeza.

**Para publicar alterações**, a partir de `firebase/`, depois de `npx firebase login`:

```bash
npx firebase deploy --only firestore,hosting
```

**Quando a app estiver na Play:** junta o SHA-1 e o SHA-256 da assinatura da Play (Play Console → Integridade da app) em três sítios:
- na app Firebase (`npx firebase apps:android:sha:create <appId> <sha>`);
- nas restrições da chave Android (Google Cloud → APIs e serviços → Credenciais);
- no `hosting/.well-known/assetlinks.json`.

## 6. Por decidir ou confirmar

- Os números +25%, −10%, 2 bónus por dia e 3 pares ativos ficam para afinar depois do teste fechado.
- Grupos de 3 ou mais: o modelo aguenta (aumentar o máximo de `members` nas regras), mas a primeira versão é só para pares.
- Missões personalizadas em par: precisariam do texto no próprio par. Ficam para depois.
