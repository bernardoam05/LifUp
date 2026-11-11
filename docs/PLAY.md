# Publicar na Google Play

Esta branch (`play-store`) prepara a app para a Play Store. O código é o mesmo para as duas lojas. Muda só a variante:

| | `github` | `play` |
|---|---|---|
| Distribuição | APK nas releases do GitHub | App Bundle (.aab) na Play |
| Atualizações | a própria app (`system/Updater`) | a Play Store |
| Permissão de instalar apps | sim | não |
| Assinatura | `app/debug.keystore` (a que os utilizadores atuais já têm) | chave de upload própria; a Play assina com a dela |

Tarefas: `assembleGithubRelease` (o workflow `Release` continua a usar esta) e `bundlePlayRelease` (o workflow `Play bundle`, lançado à mão).

## 1. Chave de upload (uma vez)

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 4096 -validity 10000
base64 -w0 upload.jks > upload.jks.b64
```

Guarda o `upload.jks` e as passwords fora do repositório (gestor de passwords e uma cópia offline). No GitHub, em Settings → Secrets and variables → Actions, cria estes secrets:

- `UPLOAD_KEYSTORE_BASE64`: o conteúdo de `upload.jks.b64`
- `UPLOAD_KEYSTORE_PASSWORD`
- `UPLOAD_KEY_ALIAS`: `upload`
- `UPLOAD_KEY_PASSWORD`

Na consola, ativa a **Assinatura de apps do Google Play**: a Google guarda a chave final e tu usas só a de upload. Se perderes a de upload, ela pode ser reposta.

## 2. Gerar o bundle

Em Actions → **Play bundle** → Run workflow. O `.aab` aparece em Artifacts. A versão é a pasta mais recente de `release-notes/`.

## 3. Consola da Play: o que preencher

- **Política de privacidade:** o link para o `PRIVACY.md` deste repositório.
- **Segurança dos dados:** só as missões em par (opcionais) enviam dados, para o Cloud Firestore (ver `docs/PAIRS.md` no main). Declara:
  - **Recolhidos:** "Identificadores do dispositivo ou outros IDs" (o ID anónimo), "Informações pessoais → Nome" (o nome do herói), "Atividade na app → Outras ações" (as conclusões das missões em par).
  - **Finalidade:** funcionalidade da app. **Opcional:** sim. **Partilhados com terceiros:** não (a Google é fornecedora de serviços).
  - **Cifrados em trânsito:** sim. **Pedido de eliminação:** sim, saindo do par.
  - Tudo o resto fica no dispositivo e não há conta.
- **Declarações de permissões:**
  - *Alarmes exatos* (`SCHEDULE_EXACT_ALARM`): fechar o dia à meia-noite, terminar sessões de foco e lembretes escolhidos pelo utilizador.
  - *Serviço em primeiro plano `specialUse`*: sessão de foco com bloqueio de apps. Indica o subtipo e explica.
  - *Serviço em primeiro plano `location`*: corridas e caminhadas iniciadas pelo utilizador. A Google pode pedir um vídeo.
  - *Acesso de utilização* e *sobrepor a outras apps*: bloqueio das apps escolhidas durante o foco.
- **Classificação de conteúdo:** questionário (sem violência real, sem compras de itens aleatórios com dinheiro).
- **Público-alvo:** 13 anos ou mais.

## 4. Teste fechado (obrigatório em contas pessoais novas)

Pelo menos **12 testadores** inscritos durante **14 dias seguidos** antes de pedir acesso à produção. Cria a faixa de teste fechado, junta os emails (amigos, colegas) e pede-lhes que instalem e usem a app.

## 5. Quem já usa a versão do GitHub

A versão da Play é assinada com outra chave, por isso não instala por cima da do GitHub. Para mudar: Definições → Cópia de segurança → Exportar, desinstalar, instalar da Play e Importar.
