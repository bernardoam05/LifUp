# 🔍 Audit Técnico — Relatório de Refatoração
**Data:** 27 Março 2026 | **Status:** CRÍTICO  
**Scope:** Portais Dinâmicos, Inventário, Loja, Modals, Chaves

---

## 📊 SUMÁRIO EXECUTIVO

| Problema | Ficheiro | Linha | Severidade | Impact |
|----------|----------|-------|-----------|--------|
| Portais não fecham após 1ª utilização | [QuestScreen.tsx](src/screens/QuestScreen.tsx#L512-L550) | 513-549 | 🔴 CRÍTICO | Portal fica travado, user não consegue navegar |
| Igris drop hardcoded com `else if` | [useGameStore.ts](src/store/useGameStore.ts#L1058) | 1058 | 🔴 CRÍTICO | Igris pode droppar 2x, outros bosses perdem drops |
| Inventário exibe 4 itens quando vazio | [InventoryScreen.tsx](src/screens/InventoryScreen.tsx#L333) | 333 | 🟠 ALTA | Confusão UI, contador incorreto |
| Temas não persistem após compra | [ShopScreen.tsx](src/screens/ShopScreen.tsx) + [useGameStore.ts](src/store/useGameStore.ts#L1292) | Múltiplas | 🟠 ALTA | Tema desaparece ao reiniciar app |
| Modals sem queue ordenada | [App.tsx](App.tsx#L19-L200) | 19-200 | 🔴 CRÍTICO | Sobreposição de UI, cliques interceptados |
| Shadow Unlock sem toque | [ShadowShopModal.tsx](src/components/ShadowShopModal.tsx#L60-75) | 60-75 | 🟠 ALTA | Botão não responde ao input |
| Orc Key não mapeada | [dungeonKeys.ts](src/data/dungeonKeys.ts) | - | 🟠 ALTA | Missing field `missionType`, `missionDetail` |
| Cooldown em chaves inexistente | [useGameStore.ts](src/store/useGameStore.ts#L920) | 920 | 🟠 ALTA | User pode farmear chaves infinitamente |
| Drops duplicados de cofres | [useGameStore.ts](src/store/useGameStore.ts#L930-960) | 930-960 | 🟡 MÉDIO | Items duplicam probabilisticamente |
| Modals Boss+Treino não unificados | [DungeonKeyModal.tsx](src/components/DungeonKeyModal.tsx) + [EventDungeonModal.tsx](src/components/EventDungeonModal.tsx) | Ambos | 🟡 MÉDIO | Código duplicado, manutenção difícil |

---

## 🗺️ MAPEAMENTO DE FLUXOS

### **🔴 Problema #1: Portais Dinâmicos não fecham após 1ª utilização**

**Ficheiro:** [QuestScreen.tsx:513-549](src/screens/QuestScreen.tsx#L513-L549)

```tsx
// ❌ PROBLEMA: Portal fica aberto indefinidamente após conclusão
const handleOpenDungeonBreak = (mission: DungeonMission) => {
  setPortalConfirm(mission)
  setShowDungeon(true)  // ← Abre modal
  // Mas não há clean-up após completar a missão!
  
  // user completa portal → missão conclui
  // setShowDungeon(false) NUNCA é chamado automaticamente
  // Portal continua travado
}

// Culpa: Status da missão não sincroniza com visibilidade do modal
const [showDungeon, setShowDungeon] = useState(false)
const [activeMission, setActiveMission] = useState<DungeonMission | null>(null)
// Desincronizados — showDungeon não fecha quando activeMission completa
```

**Sugestão de Correção:**

```tsx
// ✅ SOLUÇÃO: Efeito para limpar modal ao completar missão
useEffect(() => {
  if (!activeMission) {
    setShowDungeon(false)  // Auto-close quando missão termina
  }
}, [activeMission])

// OU: Callback no store para fechar após completar
set((s: GameState) => ({
  activeMissionTimers: { ...s.activeMissionTimers, [missionId]: null },
  // Trigger close em QuestScreen via selector
}))

// QuestScreen:
const isModalShouldClose = useGameStore(s => !s.activeMission)
useEffect(() => {
  if (isModalShouldClose) setShowDungeon(false)
}, [isModalShouldClose])
```

**Raiz Causa:** Falta de cleanup automático — modal state não sincroniza com game state

---

### **🔴 Problema #2: Igris drop hardcoded com hardcoding de else-if chain**

**Ficheiro:** [useGameStore.ts:1058](src/store/useGameStore.ts#L1058)

```tsx
// ❌ PROBLEMA: Igris drops item com probabilidade, mas é mutualmente exclusivo
else if (sid.includes('kasaka') && Math.random() < (0.4 * lootMult)) dropItems.push('kasaka_venom')
else if (sid.includes('igris') && Math.random() < (0.4 * lootMult)) dropItems.push('igris_fragment')  // ← else if cria exclusão
else if (sid.includes('cerberus') && Math.random() < (0.4 * lootMult)) dropItems.push('cerberus_fang')
else if (sid.includes('lich') || sid.includes('baran')) {
  if (Math.random() < 0.3) dropItems.push(Math.random() < 0.5 ? 'iron_will_crystal' : 'lich_eye')
}

// Resultado:
// - Se Igris → drop apenas Igris (kasaka não droppa)
// - Se Cerberus → drop apenas Cerberus (lich não droppa se lich == false)
// - Drops são MUTUAMENTE EXCLUSIVOS em vez de independentes
```

**Sugestão de Correção:**

```tsx
// ✅ SOLUÇÃO: Usar independentes if-else (sem else chain)
if (Math.random() < (0.5 * lootMult)) dropItems.push('shadow_essence')
if (Math.random() < (0.2 * lootMult)) dropItems.push('blood_fallen')

// Boss-specific items: INDEPENDENTES
if (sid.includes('kasaka') && Math.random() < (0.4 * lootMult)) 
  dropItems.push('kasaka_venom')
if (sid.includes('igris') && Math.random() < (0.4 * lootMult)) 
  dropItems.push('igris_fragment') // ← if, não else if!
if (sid.includes('cerberus') && Math.random() < (0.4 * lootMult)) 
  dropItems.push('cerberus_fang')

// Special multi-item boss
if ((sid.includes('lich') || sid.includes('baran')) && Math.random() < 0.3) {
  dropItems.push(Math.random() < 0.5 ? 'iron_will_crystal' : 'lich_eye')
}
```

**Raiz Causa:** Lógica de drops usa `else if` quando deveria usar `if` independentes

---

## 💾 ESTADO E INVENTÁRIO

### **🟠 Problema #3: Contador do Inventário exibe 4 itens quando vazio**

**Ficheiro:** [InventoryScreen.tsx:333](src/screens/InventoryScreen.tsx#L333)

```tsx
// ❌ PROBLEMA: Total é calculado diretamente
const total = inventory.reduce((sum, e) => sum + e.quantity, 0)

// Se inventory = [], total = 0 (correto)
// Mas INITIAL_PLAYER setup pode estar inicializando inventory com 4 items ghost?

// Investigar em useGameStore bootSystem():
// Há alguma inicialização que adiciona itens por default?
```

**Sugestão de Correção:**

1. **Verificar inicialização:** [types.ts:INITIAL_PLAYER](src/store/types.ts#L70-85)

```tsx
// Confirmar que inventory começa VAZIO
export const INITIAL_PLAYER: Player = {
  // ...
  inventory: [], // ← Deve estar vazio
}
```

2. **Debug:** Adicionar log ao montar InventoryScreen

```tsx
useEffect(() => {
  console.log('Inventory at mount:', inventory.length, inventory)
}, [])
```

3. **Se há ghost items:** Limpar em `bootSystem()` 

```tsx
bootSystem() {
  set((s: GameState & GameActions) => ({
    player: { 
      ...s.player, 
      inventory: inventory.filter(e => e.quantity > 0) // ← Remove zero-quantity entries
    }
  }))
}
```

**Raiz Causa:** Probabilisticamente há 4 items inicializados ou não limpezinhos no restore do AsyncStorage

---

### **🟠 Problema #4: Temas não persistem após compra na Loja**

**Ficheiro:** [ShopScreen.tsx](src/screens/ShopScreen.tsx) + [useGameStore.ts:1292](src/store/useGameStore.ts#L1292)

```tsx
// ❌ PROBLEMA 1: Não há ação para comprar tema
// ShopScreen.tsx — só vende items, não temas

// ❌ PROBLEMA 2: Persistência incompleta
// useGameStore.ts partialize:
partialize: s => ({
  player: s.player,  // ← Incluem activeThemeId!
  // MAS: activeThemeId pode estar em player.activeThemeId
  // Verificar se está em partialize corretamente
})

// ❌ PROBLEMA 3: Sem setter para temas adquiridos
// Não há addUnlockedTheme() ação após compra
```

**Sugestão de Correção:**

```tsx
// ① Adicionar ação ao store:
addUnlockedTheme(themeId: string) {
  set((s: GameState) => ({
    player: {
      ...s.player,
      unlockedThemes: Array.from(new Set([...s.player.unlockedThemes, themeId]))
    }
  }))
}

// ② Confirmar activeThemeId está em partialize:
partialize: s => ({
  player: s.player, // activeThemeId IS in player
  // ...
})

// ③ Ao comprar tema na loja:
purchaseItem(itemId, cost) {
  if (itemId.startsWith('theme_')) {
    const themeId = itemId.replace('theme_', '') // 'theme_d_rank' → 'd_rank'
    store.addUnlockedTheme(themeId)
    store.setActiveTheme(themeId)
  }
  // ...
}
```

**Raiz Causa:** Falta integração Loja-Tema. Compra não dispara unlock de tema.

---

## 🎨 GESTÃO DE UI/UX (Modals & Toasts)

### **🔴 Problema #5: Sobreposição na queue de Modals — Cliques interceptados**

**Ficheiro:** [App.tsx:19-200](App.tsx#L19-L200)

```tsx
// ❌ PROBLEMA: Múltiplos modals renderizados simultaneamente sem Z-order
return (
  <Fragment>
    <NavigationContainer> {/* ... */} </NavigationContainer>
    <ExtractionModal visible={...} />      {/* z-order 1 */}
    <RankModal visible={...} />            {/* z-order 2 */}
    <TutorialOverlay phase={...} />        {/* z-order 3 */}
    <LevelUpToast reward={...} />          {/* z-order 4 */}
    <ShadowUnlockModal visible={...} />    {/* z-order 5 — pode estar por baixo! */}
    <AchievementModal achievementId={...} /> {/* z-order 6 */}
  </Fragment>
)

// Resultado: Se ExtractionModal abre enquanto LevelUpToast está ativo,
// ExtractionModal fica invisible atrás de LevelUpToast
// User vê "toast" em vez de "extraction", cliques não funcionam
```

**Sugestão de Correção:**

```tsx
// ✅ SOLUÇÃO 1: Implementar queue de rewardsQueue (já existe em store!)
const rewardsQueue = useGameStore(s => s.rewardsQueue)

// Show ONE reward at a time:
const currentReward = rewardsQueue[0]

return (
  <>
    {/* Navigation */}
    <NavigationContainer> {/* ... */} </NavigationContainer>

    {/* Reward Queue — mostrar UMA DE VEZ */}
    {currentReward?.type === 'extraction' && (
      <ExtractionModal 
        result={currentReward.data}
        onDismiss={() => { 
          // Remove do queue
          useGameStore.setState(s => ({
            rewardsQueue: s.rewardsQueue.slice(1)
          }))
        }} 
      />
    )}
    {currentReward?.type === 'achievement' && (
      <AchievementModal 
        achievementId={currentReward.id}
        onDismiss={() => { 
          useGameStore.setState(s => ({
            rewardsQueue: s.rewardsQueue.slice(1)
          }))
        }} 
      />
    )}
    {/* ... outros tipos ... */}
  </>
)
```

**Raiz Causa:** Sem gerenciamento centralizado de precedência de modals → overlapping

---

### **🟠 Problema #6: Shadow Unlock modal sem resposta ao toque**

**Ficheiro:** [ShadowShopModal.tsx:60-75](src/components/ShadowShopModal.tsx#L60-L75)

```tsx
// ❌ PROBLEMA: TouchableOpacity pode estar interceptada por ScrollView
<ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>
  {filteredShadows.map(sh => (
    <View key={sh.id} style={[s.card, { borderColor: color + '44' }]}>
      {/* ... shadow info ... */}
      <TouchableOpacity
        disabled={!canAfford}
        onPress={() => onBuy(sh)}  // ← onClick pode não dispara
        style={[s.buyBtn, /* ... */]}
      >
        <Text style={[s.buyBtnText, { color }]}>
          {owned ? 'UPGRADE' : 'RECRUTAR'}
        </Text>
      </TouchableOpacity>
    </View>
  ))}
</ScrollView>

// Culpa: ScrollView ativo + activeOpacity=0.2 por default
// A imagem pode estar com PointerEvents="none"
```

**Sugestão de Correção:**

```tsx
// ✅ SOLUÇÃO: Definir activeOpacity + pointerEvents explicitamente
<TouchableOpacity
  disabled={!canAfford}
  onPress={() => onBuy(sh)}
  activeOpacity={canAfford ? 0.6 : 0.3}  // ← Feedback visual
  pointerEvents={canAfford ? 'auto' : 'none'}  // ← Bloquear disabled
  style={[s.buyBtn, { borderColor: color }, !canAfford && { opacity: 0.3 }]}
>
  <Text style={[s.buyBtnText, { color }]}>
    {owned ? 'UPGRADE' : 'RECRUTAR'}
  </Text>
</TouchableOpacity>

// OU: Verificar se View pai tem `pointerEvents="box-none"`:
<View pointerEvents="box-none"> {/* Permite cliques em filhos */}
  <TouchableOpacity onPress={...}> ... </TouchableOpacity>
</View>
```

**Raiz Causa:** ScrollView intercepta gestos; sem `pointerEvents` explícito, toque não chega

---

## 📋 REGRAS DE NEGÓCIO — Itens

### **🟠 Problema #7: Orc Key não mapeada — Faltam campos**

**Ficheiro:** [dungeonKeys.ts](src/data/dungeonKeys.ts) (Boss: `bossId: 'kargalgan_shaman'`)

```tsx
// ❌ PROBLEMA: Alguns keys têm campos incompletos
{
  id: 'key_kargalgan',
  bossId: 'kargalgan_shaman',
  name: 'Máscara do Xamã Orc',
  description: 'Garante entrada no território amaldiçoado por Kargalgan.',
  unlockLevel: 15,
  color: '#b91c1c',
  missionType: 'training',
  missionTarget: 100,
  missionDetail: '100 agachamentos livres pesados para esmagar as maldições dos orcs.',
  // ✓ Bom — Tem todos os campos
}

// É MAS: Há keys "orc_key" em data que não têm cooldown atribuído?
// Ver COOLDOWN lógica abaixo.
```

**Sugestão de Correção:**

```tsx
// ✅ SOLUÇÃO: Adicionar campo cooldown ao DungeonKey type
export type DungeonKey = {
  // ... campos existentes ...
  lastUsedAt?: number;  // ← Timestamp da última utilização
  cooldownMinutes?: number;  // ← Cooldown em minutos (default 24h?)
}

// Ao usar key:
enterDungeon(keyId: string) {
  const key = dungeonKeys.find(k => k.id === keyId)
  const now = Date.now()
  const cooldownMs = (key?.cooldownMinutes ?? 24 * 60) * 60_000
  
  if (key?.lastUsedAt && now - key.lastUsedAt < cooldownMs) {
    // Reject: cooldown active
    return false
  }
  
  // Accept: use key
  set(s => ({
    player: { ...s.player, dungeonKeys: s.player.dungeonKeys.filter(id => id !== keyId) },
    system: { ...s.system, keyLastUsedAt: { ...s.system.keyLastUsedAt, [keyId]: now } }
  }))
  return true
}
```

**Raiz Causa:** Falta modelo de cooldown — keys podem ser farmadas infinitamente

---

### **🟠 Problema #8: Cooldown em chaves não existe**

**Ficheiro:** [useGameStore.ts:920](src/store/useGameStore.ts#L920) (check `enterDungeon()`)

```tsx
// ❌ PROBLEMA: Sem cooldown — user pode refarmear mesma chave
enterDungeon(keyId) {
  let success = false
  set((s: GameState) => {
    if (!s.player.dungeonKeys?.includes(keyId)) return {}
    success = true
    return { player: { ...s.player, dungeonKeys: s.player.dungeonKeys.filter(id => id !== keyId) } }
  })
  return success
}

// Se user refaz quest que concede key → key readicionada
// Sem cooldown tracking, key pode ser usada 2x em 1 hora
```

**Sugestão de Correção:** Ver **Problema #7 acima** (solução integrada)

---

### **🟡 Problema #9: Drops duplicados de cofres — Probabilidade independente**

**Ficheiro:** [useGameStore.ts:930-960](src/store/useGameStore.ts#L930-L960)

```tsx
// ❌ PROBLEMA (Leve): Drops podem duplicar com baixa prob
const dropItems: string[] = []

if (Math.random() < (0.5 * lootMult)) dropItems.push('shadow_essence')
if (Math.random() < (0.2 * lootMult)) dropItems.push('blood_fallen')

// Cada roll é INDEPENDENTE
// Se lootMult = 2: 100% shadow_essence, 40% blood_fallen ambos podem cair
// Resultado: Player recebe múltiplos items na primeira derrota

// Tecnicamente intencional (loot perception), mas pode ser confuso
```

**Sugestão de Correção (Opcional):**

```tsx
// ✅ Se drops devem ser únicos por tipo:
const hasEssence = dropItems.includes('shadow_essence')
if (!hasEssence && Math.random() < (0.5 * lootMult)) 
  dropItems.push('shadow_essence')

// OU: Documentar comportamento no UI ("Vários drops possíveis com bónus de loot")
```

**Raiz Causa:** Rolls independentes são probabil corretos, pode ser apenas falta de comunicação ao user

---

## 🏗️ COMPONENTIZAÇÃO DE UI

### **🟡 Problema #10: Modals Bosses de Chave + Treino NÃO unificados**

**Ficheiros:**
- [DungeonKeyModal.tsx](src/components/DungeonKeyModal.tsx) — Para chaves
- [EventDungeonModal.tsx](src/components/EventDungeonModal.tsx) — Para eventos
- Falta de unified timer para ambos

```tsx
// ❌ PROBLEMA: Código duplicado
// DungeonKeyModal.tsx renderDifficulty():
if (difficulty === '???') {
  return (
    <View style={dm.difficultyRow}>
      <Text style={dm.difficultyLabel}>DIFICULDADE:</Text>
      <Text style={[dm.difficultyLabel, { fontSize: 12, fontWeight: '900' }]}>???</Text>
    </View>
  )
}

// EventDungeonModal.tsx provavelmente tem 90% código igual
// Styles, handlers, layout — tudo repetido

// ✗ Manutenção difícil — fix em 1 não copia para outro
// ✗ Inconsistência visual possível
// ✗ Bundle size aumentado
```

**Sugestão de Correção:**

```tsx
// ✅ SOLUÇÃO: Criar MissionModalBase.tsx unificado
// src/components/MissionModalBase.tsx
import type { DungeonKey } from '../data/dungeonKeys'
import type { EventBoss } from '../data/bosses' // ou type genérico

type Mission = { 
  id: string
  name: string
  difficulty: number | '???'
  missionType: 'focus' | 'training' | 'gps'
  missionTarget: number
  missionDetail: string
  lore: string
  environment: string
  color: string
}

export function MissionModalBase({ mission, onStart, onCancel, C }: {
  mission: Mission
  onStart: () => void
  onCancel: () => void
  C: any
}) {
  // Renderizar com {difficulty}, {missionType}, {timer}, etc
  // Reutilizável para chaves E eventos
}

// DungeonKeyModal.tsx agora apenas wraps:
export default function DungeonKeyModal({ ... }) {
  const mission: Mission = {
    id: key.id,
    name: key.name,
    difficulty: key.difficulty,
    // ...
  }
  return <MissionModalBase mission={mission} onStart={...} onCancel={...} C={C} />
}

// EventDungeonModal.tsx:
export default function EventDungeonModal({ ... }) {
  const mission: Mission = { /* convert event to mission */ }
  return <MissionModalBase mission={mission} {...props} />
}
```

**Raiz Causa:** Componentes desenvolvidos separadamente sem abstração comum

---

## 🔧 MATRIZ DE PRIORIDADE & ESFORÇO

| # | Problema | Ficheiro | Esforço | Sprint | Prioridade |
|-|----------|----------|---------|--------|-----------|
| 1 | Portais não fecham | QuestScreen.tsx | 15min | NOW | 🔴 CRÍTICO |
| 2 | Igris drop hardcoded | useGameStore.ts:1058 | 10min | NOW | 🔴 CRÍTICO |
| 3 | Inventário 4 items | InventoryScreen.tsx | 20min | NOW | 🟠 ALTA |
| 4 | Temas não persistem | ShopScreen.tsx + store | 30min | TODAY | 🟠 ALTA |
| 5 | Modal overlap | App.tsx | 25min | NOW | 🔴 CRÍTICO |
| 6 | Shadow Unlock | ShadowShopModal.tsx | 10min | TODAY | 🟠 ALTA |
| 7 | Orc Key | dungeonKeys.ts | 20min | TODAY | 🟠 ALTA |
| 8 | Cooldown chaves | useGameStore.ts | 30min | TODAY | 🟠 ALTA |
| 9 | Drops duplicados | useGameStore.ts:930 | 5min | POST | 🟡 MÉDIO |
| 10 | Modals duplicados | DundeonKeyModal + Event | 60min | NEXT | 🟡 MÉDIO |

**Total Crítico (NOW):** 50min  
**Total High (TODAY):** 90min  
**Total Medium (NEXT):** 65min  

---

## 📝 CHECKLIST DE CORREÇÃO

- [ ] **NOW (50min)**
  - [ ] Fix portal close logic (useEffect cleanup)
  - [ ] Replace `else if` com `if` em drops Igris
  - [ ] Implementar modal queue ordenada em App.tsx

- [ ] **TODAY (90min)**
  - [ ] Debug & fix inventory counter
  - [ ] Adicionar theme unlock action + persistência
  - [ ] Fix Shadow Unlock button (pointerEvents)
  - [ ] Adicionar cooldown a chaves
  - [ ] Map Orc Key fields

- [ ] **NEXT SPRINT (65min)**
  - [ ] Document drops duplicados (feature, not bug)
  - [ ] Refactor DungeonKeyModal + EventDungeonModal → MissionModalBase

---

**Report gerado:** 27/03/2026  
**Next Audit:** Pós-implementação dos fixes críticos
