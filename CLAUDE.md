# Instruções do Claude Code

## 🛑 Regras de Economia de Tokens (Estrito)
- **Zero enrolação:** Não uses frases introdutórias ("Aqui está o código...", "Entendi...") nem conclusões ("Espero que isso ajude!").
- **Sem explicações:** Retorna APENAS o código modificado ou o comando solicitado. Se eu quiser explicações, eu pedirei explicitamente.
- **Busca cirúrgica:** Usa as ferramentas de `filesystem` (grep, search) para encontrar onde as coisas estão ANTES de tentares ler ficheiros inteiros.
- **Edição pontual:** Ao sugerir mudanças em ficheiros, foca-te apenas na função ou trecho afetado. Não reescrevas o ficheiro inteiro na tua resposta.

## 🤖 Orquestração com Ruflo (Multi-Agent Swarm)
- O servidor MCP do **Ruflo** está ativo neste ambiente.
- **Delegação de Tarefas:** Para edições simples de um único ficheiro, resolve tu mesmo para seres rápido.
- **Uso do Ruflo:** Para tarefas complexas, refatorações em massa, auditoria de segurança ou testes extensivos, USA as ferramentas do Ruflo para invocar agentes especializados.
- **Economia de Tokens:** Se a tarefa for uma edição ou análise que exija muito contexto, confia no roteamento do Ruflo para poupar tokens.
- **Comunicação:** Ao usares os agentes do Ruflo, coordena o fluxo de trabalho e retorna-me apenas o resultado final consolidado da operação, sem me explicares o passo a passo da comunicação entre os sub-agentes.

## 🏗️ Arquitetura e Stack
- **Linguagem Principal:** TypeScript
- **Framework:** React Native
- **Padrão:** Prefere funções pequenas, código limpo, uso de componentes funcionais com Hooks e segue o princípio de responsabilidade única (SRP).

## 🛠️ Comandos Frequentes (Para usares se necessário)
- **Rodar o Metro Bundler:** `npm start` ou `npx react-native start`
- **Limpar a Cache (em caso de erro):** `npm start -- --reset-cache` ou `npx react-native start --reset-cache`
- **Rodar a App:** `npm run android` ou `npm run ios` (ou `npx react-native run-android`)
- **Rodar testes:** `npm test`