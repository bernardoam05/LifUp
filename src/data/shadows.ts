// ── Shadow Types ──────────────────────────────────────────────────────────────

export type ShadowRank = 'Normal' | 'Elite' | 'Knight' | 'Commander' | 'Marshal'

export type ShadowType =
  | 'Beast'
  | 'Magic'
  | 'Assassin'
  | 'Tank'
  | 'Warrior'
  | 'Insect'
  | 'Undead'
  | 'Demon'
  | 'Elemental'
  | 'Ancient'
  | 'Custom'

export type PassiveEffectType =
  | 'gold_boost'        // % bonus to all gold earned
  | 'xp_boost'          // % bonus to all XP earned
  | 'penalty_immunity'  // weekly immunity to one penalty
  | 'penalty_reduce'    // reduces penalty XP loss by %
  | 'streak_protect'    // prevents streak reset once per week
  | 'shop_discount'     // % discount on shop purchases
  | 'focus_bonus'       // extra focus minutes counted per session
  | 'boss_bonus_xp'     // % extra XP from boss raids
  | 'daily_bonus'       // small XP granted each day on login

export type PassiveEffect = {
  type:        PassiveEffectType
  value:       number    // the magnitude (0.05 = 5%, 1 = 1 minute, etc.)
  description: string    // human-readable effect
}

export type UnlockMethod =
  | { type: 'gacha' }
  | { type: 'shop';        price: number }
  | { type: 'achievement'; id: string }
  | { type: 'boss_drop';   bossId: string }
  | { type: 'custom' }

export type Shadow = {
  id:             string
  name:           string
  rank:           ShadowRank
  type:           ShadowType
  dropRate:       number          // weight in gacha pool (ignored for non-gacha)
  passiveEffect:  PassiveEffect
  lore:           string
  icon:           string          // MaterialCommunityIcons name
  color:          string          // rank color for UI
  unlockMethod?:  UnlockMethod    // undefined = gacha by default
}

// ── Rank color map ─────────────────────────────────────────────────────────────

export const SHADOW_RANK_COLOR: Record<ShadowRank, string> = {
  Normal:     '#94a3b8',
  Elite:      '#22c55e',
  Knight:     '#3b82f6',
  Commander:  '#f59e0b',
  Marshal:    '#ef4444',
}

// ── Shadow Database ────────────────────────────────────────────────────────────
// Unlock method guide:
//   undefined / { type: 'gacha' }         → random drop from boss raids
//   { type: 'shop', price }               → buyable in the store (gold)
//   { type: 'achievement', id }           → unlocked by completing achievement
//   { type: 'boss_drop', bossId }         → exclusive to one specific boss
//   { type: 'custom' }                    → created via Quest Forge

export const SHADOW_DATABASE: Shadow[] = [

  // ════════════════════════════════════════════════════════════════════════════
  // ── NORMAL RANK — Common · Pequenos bónus · A espinha dorsal do exército ──
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'goblin_grunt',
    name: 'Goblin Grunt',
    rank: 'Normal', type: 'Beast', dropRate: 0.18,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Era apenas um escudeiro antes de cair. Agora serve sem questionamento. O mais fraco dos exércitos ainda é um exército."',
    icon: 'alien', color: '#94a3b8',
  },
  {
    id: 'cave_spider',
    name: 'Aranha das Cavernas',
    rank: 'Normal', type: 'Beast', dropRate: 0.15,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Teceu teias na escuridão durante séculos. As suas presas nunca souberam que estava lá até ser tarde demais."',
    icon: 'spider', color: '#94a3b8',
  },
  {
    id: 'ant_worker',
    name: 'Formiga Operária',
    rank: 'Normal', type: 'Insect', dropRate: 0.14,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Na colónia, a sua função era escavar. Na morte, a sua função é a mesma — construir a grandeza do Monarca."',
    icon: 'bug', color: '#94a3b8',
  },
  {
    id: 'skeleton_archer',
    name: 'Arqueiro Esqueleto',
    rank: 'Normal', type: 'Undead', dropRate: 0.12,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Os seus olhos já não vêem. Mas a memória dos músculos permanece — cada flecha ainda encontra o alvo."',
    icon: 'skull', color: '#94a3b8',
  },
  {
    id: 'stone_golem_shard',
    name: 'Fragmento de Golem',
    rank: 'Normal', type: 'Tank', dropRate: 0.11,
    passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
    lore: '"Apenas um fragmento do golem original sobreviveu à invocação. Mas mesmo fragmentado, resiste."',
    icon: 'cube-outline', color: '#94a3b8',
  },
  {
    id: 'wolf_pup',
    name: 'Lobo das Sombras',
    rank: 'Normal', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Caçava em matilha no dungeon do norte. Agora caça sozinho — mas ao lado do Monarca, nunca está realmente só."',
    icon: 'dog', color: '#94a3b8',
  },
  {
    id: 'imp',
    name: 'Imp das Trevas',
    rank: 'Normal', type: 'Demon', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Pequeno. Ruidoso. Completamente sem honra. E ainda assim, leal ao novo mestre da forma mais absoluta."',
    icon: 'bat', color: '#94a3b8',
  },
  {
    id: 'mud_elemental',
    name: 'Elemental de Lama',
    rank: 'Normal', type: 'Elemental', dropRate: 0.10,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Nasceu da água e da terra do dungeon submerso. Agora carrega o peso do Monarca com silêncio e constância."',
    icon: 'water', color: '#94a3b8',
  },
  {
    id: 'dungeon_rat',
    name: 'Rato do Dungeon',
    rank: 'Normal', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Sobreviveu a dungeons que devastaram caçadores de C-Rank. Não pela força. Pela astúcia e pela fuga."',
    icon: 'rodent', color: '#94a3b8',
  },
  {
    id: 'cursed_peasant',
    name: 'Camponês Amaldiçoado',
    rank: 'Normal', type: 'Undead', dropRate: 0.12,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Trabalhou a terra até que a terra o engoliu. Ainda dobra as costas — mas agora é para o Monarca que semeia."',
    icon: 'shovel', color: '#94a3b8',
  },
  {
    id: 'cave_bat',
    name: 'Morcego das Trevas',
    rank: 'Normal', type: 'Beast', dropRate: 0.11,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Nunca viu a luz do sol em vida. Na morte, voa mais rápido — o escuro é o seu lar e o Monarca é o seu norte."',
    icon: 'bat', color: '#94a3b8',
  },
  {
    id: 'toxic_sprite',
    name: 'Sprite Tóxico',
    rank: 'Normal', type: 'Elemental', dropRate: 0.09,
    passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
    lore: '"Cresceu nas paredes pútridas dos dungeons de pântano. O seu toque corroía armaduras. A sua presença corroe o azar."',
    icon: 'flask', color: '#94a3b8',
  },
  {
    id: 'moss_golem',
    name: 'Golem de Musgo',
    rank: 'Normal', type: 'Tank', dropRate: 0.09,
    passiveEffect: { type: 'daily_bonus', value: 3, description: '+3 XP grátis ao iniciar cada dia' },
    lore: '"Construído pelos druidas de uma era há muito esquecida. Lento mas imortal — cada dia que passa, mais musgo cresce. Mais força acumula."',
    icon: 'tree', color: '#94a3b8',
  },
  {
    id: 'tunnel_mole',
    name: 'Toupeira do Abismo',
    rank: 'Normal', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Escavou durante milénios, sempre em direção a algo que não sabia nomear. Encontrou o Monarca. A escavação faz sentido agora."',
    icon: 'circle', color: '#94a3b8',
  },
  {
    id: 'frost_sprite',
    name: 'Sprite de Gelo',
    rank: 'Normal', type: 'Elemental', dropRate: 0.09,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Nasceu na primeira geada de um dungeon ártico. Pequeno como um floco de neve, frio como o esquecimento."',
    icon: 'snowflake-variant', color: '#94a3b8',
  },
  {
    id: 'dusk_jackal',
    name: 'Chacal do Crepúsculo',
    rank: 'Normal', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Esperava nos corredores dos dungeons de deserto, onde o calor mata mais caçadores do que os monstros. A paciência é o seu dom."',
    icon: 'paw', color: '#94a3b8',
  },
  {
    id: 'bone_shielder',
    name: 'Escudeiro de Osso',
    rank: 'Normal', type: 'Undead', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
    lore: '"Em vida, protegeu cavaleiros. Na morte, protege o Monarca. A função mudou; a dedicação, não."',
    icon: 'shield-outline', color: '#94a3b8',
  },
  {
    id: 'shadow_wisp',
    name: 'Chama Sombria',
    rank: 'Normal', type: 'Undead', dropRate: 0,
    passiveEffect: { type: 'xp_boost', value: 0.02, description: '+2% XP em todas as missões' },
    lore: '"Uma alma que não sabe que está morta. Erra pelos corredores do dungeon como uma chama que recusa apagar-se. A primeira compra transforma-a em lealdade."',
    icon: 'candle', color: '#94a3b8',
    unlockMethod: { type: 'achievement', id: 'economy_first_purchase' },
  },
  {
    id: 'cracked_sentinel',
    name: 'Sentinela Partida',
    rank: 'Normal', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"O seu escudo tem uma fenda por onde a luz passa. Mas o escudo ainda existe, e a guarda nunca baixou."',
    icon: 'shield-half-full', color: '#94a3b8',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── ELITE RANK — Incomum · Bónus sólidos · Mercenários e Caçados caídos ──
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'orc_berserker',
    name: 'Orc Berserker',
    rank: 'Elite', type: 'Warrior', dropRate: 0.14,
    passiveEffect: { type: 'gold_boost', value: 0.02, description: '+2% Gold em todas as missões' },
    lore: '"A raiva que o consumia em vida não desapareceu na morte. Apenas mudou de direção — agora aponta para os inimigos do Monarca."',
    icon: 'axe', color: '#22c55e',
  },
  {
    id: 'venomous_serpent',
    name: 'Serpente Venenosa',
    rank: 'Elite', type: 'Beast', dropRate: 0.13,
    passiveEffect: { type: 'xp_boost', value: 0.02, description: '+2% XP em todas as missões' },
    lore: '"O veneno que matou cem caçadores agora circula nas veias da sombra, mas não encontra nenhum coração para parar."',
    icon: 'snake', color: '#22c55e',
  },
  {
    id: 'ice_mage',
    name: 'Mago de Gelo',
    rank: 'Elite', type: 'Magic', dropRate: 0.12,
    passiveEffect: { type: 'xp_boost', value: 0.02, description: '+2% XP em todas as missões' },
    lore: '"Estudou por trinta anos para dominar o frio. Na morte, o frio domina-o a ele — e isso é suficiente para servir."',
    icon: 'snowflake', color: '#22c55e',
  },
  {
    id: 'shadow_hound',
    name: 'Cão das Sombras',
    rank: 'Elite', type: 'Beast', dropRate: 0.12,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Guardava o portal interno do dungeon há duzentos anos. Nenhum caçador passou. O Monarca passou — e o cão seguiu."',
    icon: 'dog-side', color: '#22c55e',
  },
  {
    id: 'ant_soldier',
    name: 'Soldado Formiga',
    rank: 'Elite', type: 'Insect', dropRate: 0.11,
    passiveEffect: { type: 'penalty_reduce', value: 0.03, description: '-3% na perda de XP por penalidade' },
    lore: '"Na hierarquia da colónia, era o escudo entre as operárias e o mundo exterior. O instinto não muda na morte."',
    icon: 'shield', color: '#22c55e',
  },
  {
    id: 'dark_elf_rogue',
    name: 'Ladra Élfica das Trevas',
    rank: 'Elite', type: 'Assassin', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Roubou a chave do dungeon ao seu próprio rei. Paga agora essa dívida de forma diferente — na moeda da lealdade."',
    icon: 'knife', color: '#22c55e',
  },
  {
    id: 'flame_imp',
    name: 'Imp de Chamas',
    rank: 'Elite', type: 'Demon', dropRate: 0.10,
    passiveEffect: { type: 'daily_bonus', value: 5, description: '+5 XP grátis ao iniciar cada dia' },
    lore: '"O fogo que criava em vida continua a arder em morte. Mas agora aquece apenas quem merece — o Monarca."',
    icon: 'fire', color: '#22c55e',
  },
  {
    id: 'earth_golem',
    name: 'Golem de Pedra',
    rank: 'Elite', type: 'Tank', dropRate: 0.09,
    passiveEffect: { type: 'penalty_reduce', value: 0.04, description: '-4% na perda de XP por penalidade' },
    lore: '"Construído para não cair. Em dois séculos, não caiu. Até ao dia em que o Monarca passou pela sua sala."',
    icon: 'cube', color: '#22c55e',
  },
  {
    id: 'swamp_wraith',
    name: 'Espírito do Pântano',
    rank: 'Elite', type: 'Undead', dropRate: 0.09,
    passiveEffect: { type: 'xp_boost', value: 0.02, description: '+2% XP em todas as missões' },
    lore: '"Vaga pelo pântano desde que os dungeons eram novos. Não odeia nem ama. Apenas existe — e obedece."',
    icon: 'ghost', color: '#22c55e',
  },
  {
    id: 'blood_knight_fallen',
    name: 'Cavaleiro de Sangue Caído',
    rank: 'Elite', type: 'Warrior', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Serviu o Lorde Vampiro durante gerações. Quando o lorde caiu, o cavaleiro não teve para onde ir. O Monarca abriu a porta."',
    icon: 'sword', color: '#22c55e',
  },
  {
    id: 'iron_wyvern',
    name: 'Wyvern de Ferro',
    rank: 'Elite', type: 'Beast', dropRate: 0.09,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"As suas asas já não cortam o ar. Mas o rugido que emite antes de cada batalha ainda faz vibrar as paredes do dungeon."',
    icon: 'dragon', color: '#22c55e',
  },
  {
    id: 'poison_ivy_spirit',
    name: 'Espírito da Hera Venenosa',
    rank: 'Elite', type: 'Elemental', dropRate: 0.09,
    passiveEffect: { type: 'focus_bonus', value: 3, description: '+3 min de foco extra por sessão' },
    lore: '"Cresceu nas paredes do dungeon durante séculos, envolvendo os ossos dos caçadores caídos. Paciente como uma planta. Mortal como o veneno."',
    icon: 'leaf', color: '#22c55e',
  },
  {
    id: 'thunder_wolf',
    name: 'Lobo do Trovão',
    rank: 'Elite', type: 'Beast', dropRate: 0,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '"O líder da alcateia do dungeon da tempestade. O seu uivo chamava relâmpagos. Agora o único trovão que importa é o passo do Monarca."',
    icon: 'lightning-bolt', color: '#22c55e',
    unlockMethod: { type: 'boss_drop', bossId: 'alpha_wolf' },
  },
  {
    id: 'venal_duelist',
    name: 'Duelista Venal',
    rank: 'Elite', type: 'Warrior', dropRate: 0,
    passiveEffect: { type: 'gold_boost', value: 0.04, description: '+4% Gold em todas as missões' },
    lore: '"Lutava por quem pagasse mais. Morreu por um contrato. Serve agora sem necessidade de pagamento — a morte simplifica os contratos."',
    icon: 'sword-cross', color: '#22c55e',
    unlockMethod: { type: 'shop', price: 2000 },
  },
  {
    id: 'hired_golem',
    name: 'Golem de Aluguer',
    rank: 'Elite', type: 'Tank', dropRate: 0,
    passiveEffect: { type: 'penalty_reduce', value: 0.05, description: '-5% na perda de XP por penalidade' },
    lore: '"Construído por um mago mercenário para ser vendido a qualquer senhor. O último comprador foi o Monarca. E desta vez, não há devolução."',
    icon: 'robot', color: '#22c55e',
    unlockMethod: { type: 'shop', price: 2000 },
  },
  {
    id: 'sea_serpent',
    name: 'Serpente dos Abismos',
    rank: 'Elite', type: 'Beast', dropRate: 0,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '"Governava os corredores alagados do dungeon subaquático. A sua pele era um mapa de cicatrizes. Cada uma contava uma história de vitória."',
    icon: 'wave', color: '#22c55e',
    unlockMethod: { type: 'boss_drop', bossId: 'sea_king' },
  },
  {
    id: 'bone_mage',
    name: 'Mago de Osso',
    rank: 'Elite', type: 'Magic', dropRate: 0.10,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Invocava esqueletos com a magia do osso. Na morte, a ironia é completa — ele próprio tornou-se o esqueleto que invocava."',
    icon: 'book-skull', color: '#22c55e',
  },
  {
    id: 'swamp_troll',
    name: 'Troll do Pântano',
    rank: 'Elite', type: 'Tank', dropRate: 0.09,
    passiveEffect: { type: 'daily_bonus', value: 5, description: '+5 XP grátis ao iniciar cada dia' },
    lore: '"Regenerava qualquer ferida. Não havia arma que o pudesse matar permanentemente — até ao dia em que o Monarca o tentou. E conseguiu."',
    icon: 'emoticon-devil', color: '#22c55e',
  },
  {
    id: 'fire_salamander',
    name: 'Salamandra de Fogo',
    rank: 'Elite', type: 'Elemental', dropRate: 0.09,
    passiveEffect: { type: 'gold_boost', value: 0.02, description: '+2% Gold em todas as missões' },
    lore: '"Vivia nos lagos de lava dos dungeons vulcânicos. As suas escamas eram mais valiosas que ouro. Agora serve um mestre mais valioso ainda."',
    icon: 'fire-circle', color: '#22c55e',
  },
  {
    id: 'moonlit_stalker',
    name: 'Caçador da Lua',
    rank: 'Elite', type: 'Assassin', dropRate: 0,
    passiveEffect: { type: 'focus_bonus', value: 5, description: '+5 min de foco extra por sessão' },
    lore: '"Operava exclusivamente durante a noite. Os caçadores da madrugada conhecem o seu olhar. Completar o Dungeon de Foco revelou a sua existência."',
    icon: 'moon-waxing-crescent', color: '#22c55e',
    unlockMethod: { type: 'achievement', id: 'focus_igris' },
  },
  {
    id: 'ember_wolf',
    name: 'Lobo das Brasas',
    rank: 'Elite', type: 'Beast', dropRate: 0.09,
    passiveEffect: { type: 'gold_boost', value: 0.02, description: '+2% Gold em todas as missões' },
    lore: '"A sua pele ardia. A sua alcateia morreu no calor do dungeon. Ele sobreviveu sozinho porque o fogo não queimava o que já era chama."',
    icon: 'fire-alert', color: '#22c55e',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── KNIGHT RANK — Raro · Bónus fortes · Campeões de masmorras e guerreiros lendários
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'grizzly_shadow',
    name: 'Urso Cinzento das Sombras',
    rank: 'Knight', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.04, description: '+4% Gold em todas as missões' },
    lore: '"Rei das florestas antes do dungeon se abrir. Rei das sombras depois. A hierarquia muda, mas a realeza permanece."',
    icon: 'paw', color: '#3b82f6',
  },
  {
    id: 'armored_knight',
    name: 'Cavaleiro Blindado',
    rank: 'Knight', type: 'Warrior', dropRate: 0.09,
    passiveEffect: { type: 'penalty_reduce', value: 0.06, description: '-6% na perda de XP por penalidade' },
    lore: '"Jurou proteger o seu rei até à morte. A morte chegou. O juramento não."',
    icon: 'shield-sword', color: '#3b82f6',
  },
  {
    id: 'ant_queen_guard',
    name: 'Guarda da Rainha Formiga',
    rank: 'Knight', type: 'Insect', dropRate: 0.09,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '"A rainha caiu. O guarda permaneceu. Sem rei, sem rainha — apenas o dever de proteger algo maior que si mesmo."',
    icon: 'bug-check', color: '#3b82f6',
  },
  {
    id: 'storm_witch',
    name: 'Bruxa das Tempestades',
    rank: 'Knight', type: 'Magic', dropRate: 0.08,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.10, description: '+10% XP extra em Boss Raids' },
    lore: '"Invocou relâmpagos que partiam montanhas. Mesmo convertida em sombra, o trovão que a acompanha pode ser ouvido."',
    icon: 'lightning-bolt', color: '#3b82f6',
  },
  {
    id: 'vampire_lord',
    name: 'Lorde Vampiro',
    rank: 'Knight', type: 'Undead', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold em todas as missões' },
    lore: '"Viveu mil anos a roubar a vitalidade dos outros. Agora doa a sua para alimentar o poder do Monarca."',
    icon: 'bat', color: '#3b82f6',
  },
  {
    id: 'flying_ant_elite',
    name: 'Formiga Voadora de Elite',
    rank: 'Knight', type: 'Insect', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.05, description: '+5% XP em todas as missões' },
    lore: '"A unidade de reconhecimento aéreo da colónia. Nenhum Hunter alguma vez a viu a tempo de reagir."',
    icon: 'bee', color: '#3b82f6',
  },
  {
    id: 'stone_giant',
    name: 'Gigante de Pedra',
    rank: 'Knight', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"Altura equivalente a um edifício de cinco andares. Força equivalente a uma catástrofe natural. Lealdade equivalente a uma rocha."',
    icon: 'mountain', color: '#3b82f6',
  },
  {
    id: 'phantom_assassin',
    name: 'Assassino Fantasma',
    rank: 'Knight', type: 'Assassin', dropRate: 0.07,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold em todas as missões' },
    lore: '"Não existe nos registos de nenhum dungeon. Nenhuma testemunha sobreviveu para confirmar a sua presença."',
    icon: 'incognito', color: '#3b82f6',
  },
  {
    id: 'wendigo',
    name: 'Wendigo das Altitudes',
    rank: 'Knight', type: 'Beast', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.05, description: '+5% XP em todas as missões' },
    lore: '"A fome que o consumia em vida nunca cessou. Na morte, essa fome converteu-se em vontade — e a vontade serve o Monarca."',
    icon: 'skull-crossbones', color: '#3b82f6',
  },
  {
    id: 'fallen_paladin',
    name: 'Paladino Caído',
    rank: 'Knight', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.07, description: '-7% na perda de XP por penalidade' },
    lore: '"A sua fé foi traída pelo deus que serviu. Caiu não por fraqueza, mas por ilusão. O Monarca não lhe prometeu paraíso — prometeu propósito."',
    icon: 'church', color: '#3b82f6',
  },
  {
    id: 'medusa',
    name: 'Medusa Sombria',
    rank: 'Knight', type: 'Magic', dropRate: 0,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"O seu olhar petrificava qualquer ser vivo. Em sombra, o olhar ainda paralisa — não o corpo, mas o tempo. A streak nunca congela enquanto ela guarda."',
    icon: 'eye', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'dungeon_queen' },
  },
  {
    id: 'ogre_warchief',
    name: 'Chefe de Guerra Ogre',
    rank: 'Knight', type: 'Tank', dropRate: 0.07,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold em todas as missões' },
    lore: '"Liderava hordas inteiras de criaturas cavernosas. A sua tática era simples: avançar. E funcionava. Na morte, ainda avança."',
    icon: 'weight-lifter', color: '#3b82f6',
  },
  {
    id: 'dark_elemental_spirit',
    name: 'Espírito Elemental Negro',
    rank: 'Knight', type: 'Elemental', dropRate: 0.07,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '"Formado pela fusão de todos os elementos corrompidos. Não obedecia a nenhum mestre — até encontrar um que era mais escuro que ele próprio."',
    icon: 'weather-night', color: '#3b82f6',
  },
  {
    id: 'mind_flayer',
    name: 'Devorador de Mentes',
    rank: 'Knight', type: 'Magic', dropRate: 0,
    passiveEffect: { type: 'focus_bonus', value: 10, description: '+10 min de foco extra por sessão' },
    lore: '"Alimentava-se de consciências. Os caçadores que entravam no seu dungeon saíam vazios. O Monarca entrou cheio e saiu com mais. O Devorador nunca entendeu porquê."',
    icon: 'brain', color: '#3b82f6',
    unlockMethod: { type: 'achievement', id: 'focus_night_owl' },
  },
  {
    id: 'banshee',
    name: 'Banshee das Profundezas',
    rank: 'Knight', type: 'Undead', dropRate: 0.07,
    passiveEffect: { type: 'daily_bonus', value: 10, description: '+10 XP grátis ao iniciar cada dia' },
    lore: '"O seu grito era uma profecia de morte. Cada manhã, a sua voz anuncia o início de um novo dia de poder para o Monarca."',
    icon: 'account-voice', color: '#3b82f6',
  },
  {
    id: 'shadow_mercenary',
    name: 'Mercenário das Sombras',
    rank: 'Knight', type: 'Assassin', dropRate: 0,
    passiveEffect: { type: 'gold_boost', value: 0.06, description: '+6% Gold em todas as missões' },
    lore: '"Trabalhou para os cinco maiores Guildas antes de os trair a todos. Agora serve apenas um. E desta vez, a traição é impossível — está morto."',
    icon: 'cash', color: '#3b82f6',
    unlockMethod: { type: 'shop', price: 7500 },
  },
  {
    id: 'manticore',
    name: 'Manticora Sombria',
    rank: 'Knight', type: 'Beast', dropRate: 0.07,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.08, description: '+8% XP extra em Boss Raids' },
    lore: '"Corpo de leão, asas de raptor, cauda venenosa. Era a criatura mais temida de três dungeons. O Monarca levou dez minutos a subjugá-la."',
    icon: 'cat', color: '#3b82f6',
  },
  {
    id: 'iron_sentinel',
    name: 'Sentinela de Ferro',
    rank: 'Knight', type: 'Tank', dropRate: 0,
    passiveEffect: { type: 'penalty_reduce', value: 0.07, description: '-7% na perda de XP por penalidade' },
    lore: '"Construído por um rei paranoico para guardar o seu tesouro. O tesouro foi saqueado. A Sentinela manteve o posto. O Monarca comprou o posto."',
    icon: 'robot-angry', color: '#3b82f6',
    unlockMethod: { type: 'shop', price: 7500 },
  },
  {
    id: 'death_wraith',
    name: 'Espectro da Morte',
    rank: 'Knight', type: 'Undead', dropRate: 0,
    passiveEffect: { type: 'penalty_immunity', value: 1, description: 'Imunidade completa a 1 penalidade por semana' },
    lore: '"Era o arauto do Rei dos Mortos. Anunciava a punição antes que chegasse. Agora anuncia a chegada do Monarca — e as penalidades recuam."',
    icon: 'ghost-outline', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'king_of_the_dead' },
  },
  {
    id: 'frost_giant_warrior',
    name: 'Guerreiro Gigante de Gelo',
    rank: 'Knight', type: 'Tank', dropRate: 0.07,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"Os clãs do norte temiam o seu nome. Cada inverno que passava, tornava-se mais forte. Mesmo na morte, o frio que emanava nunca fundiu."',
    icon: 'snowman', color: '#3b82f6',
  },
  {
    id: 'drow_warlord',
    name: 'Senhor da Guerra Drow',
    rank: 'Knight', type: 'Warrior', dropRate: 0.07,
    passiveEffect: { type: 'xp_boost', value: 0.05, description: '+5% XP em todas as missões' },
    lore: '"Comandou exércitos subterrâneos durante três reinados. Conhecia cada túnel, cada armadilha. O Monarca aprendeu-os todos — e então conquistou o general."',
    icon: 'sword', color: '#3b82f6',
  },
  {
    id: 'hydra_knight',
    name: 'Cavaleiro da Hidra',
    rank: 'Knight', type: 'Beast', dropRate: 0,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold em todas as missões' },
    lore: '"Montava a Hidra nas batalhas do dungeon alagado. Quando a Hidra caiu, caiu com ela — mas o vínculo entre cavaleiro e besta persistiu na sombra."',
    icon: 'waves', color: '#3b82f6',
    unlockMethod: { type: 'boss_drop', bossId: 'hydra_queen' },
  },
  {
    id: 'crypt_guardian',
    name: 'Guardião da Cripta',
    rank: 'Knight', type: 'Undead', dropRate: 0.07,
    passiveEffect: { type: 'penalty_reduce', value: 0.06, description: '-6% na perda de XP por penalidade' },
    lore: '"Guarda os túmulos dos antigos Caçadores. Conhece cada lápide, cada nome. Agora guarda o único caçador que não precisa de lápide."',
    icon: 'grave-stone', color: '#3b82f6',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── COMMANDER RANK — Muito Raro · Bónus poderosos · Lendas dos dungeons ──
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'igris',
    name: 'Igris, o Cavaleiro Sanguíneo',
    rank: 'Commander', type: 'Warrior', dropRate: 0.04,
    passiveEffect: { type: 'xp_boost', value: 0.10, description: '+10% XP em todas as missões' },
    lore: '"O mais fiel dos cavaleiros do Monarca das Trevas. Mesmo na morte, a sua armadura mantém o brilho do sangue antigo. Nenhuma ordem é recusada."',
    icon: 'sword-cross', color: '#f59e0b',
  },
  {
    id: 'tank',
    name: 'Tank, o Gorila das Sombras',
    rank: 'Commander', type: 'Beast', dropRate: 0.04,
    passiveEffect: { type: 'penalty_reduce', value: 0.10, description: '-10% na perda de XP por penalidade' },
    lore: '"A primeira sombra que o Monarca recolheu de um Boss Raid. Não é o mais inteligente, mas nenhuma barreira resiste ao seu peso."',
    icon: 'gorilla', color: '#f59e0b',
  },
  {
    id: 'iron',
    name: 'Iron, o Pugilista',
    rank: 'Commander', type: 'Warrior', dropRate: 0.04,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold e +5% XP em treinos físicos' },
    lore: '"Campeão de combate corpo a corpo em vida. Na morte, os seus punhos tornaram-se instrumentos do Monarca — e nunca erram."',
    icon: 'boxing-glove', color: '#f59e0b',
  },
  {
    id: 'kasaka',
    name: 'Kasaka, o Rei Serpente',
    rank: 'Commander', type: 'Beast', dropRate: 0.03,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
    lore: '"Governou o seu dungeon com veneno e paciência. Esperou séculos pelo desafiante certo. Quando chegou, perdeu. E passou a seguir."',
    icon: 'snake', color: '#f59e0b',
  },
  {
    id: 'tusk',
    name: 'Tusk, o Rei Javali',
    rank: 'Commander', type: 'Beast', dropRate: 0.03,
    passiveEffect: { type: 'xp_boost', value: 0.08, description: '+8% XP em todas as missões' },
    lore: '"Uma carga do Tusk partia formações inteiras de caçadores. Agora essa carga está direcionada para os inimigos do Monarca."',
    icon: 'elephant', color: '#f59e0b',
  },
  {
    id: 'cerberus',
    name: 'Cerberus, o Guardião',
    rank: 'Commander', type: 'Beast', dropRate: 0.03,
    passiveEffect: { type: 'streak_protect', value: 2, description: 'Protege o streak duas vezes por semana' },
    lore: '"Três cabeças, três mentes, um único propósito. Nenhum caçador passou o portal que ele guardava. O Monarca foi o primeiro."',
    icon: 'dog', color: '#f59e0b',
  },
  {
    id: 'rakan_the_cruel',
    name: 'Rakan, o Cruel',
    rank: 'Commander', type: 'Demon', dropRate: 0.035,
    passiveEffect: { type: 'xp_boost', value: 0.12, description: '+12% XP em todas as missões' },
    lore: '"Dizem que torturava outros demónios por diversão. A crueldade era o seu combustível. Na sombra do Monarca, essa energia é canalizada para o crescimento implacável."',
    icon: 'skull', color: '#f59e0b',
  },
  {
    id: 'white_tiger_lord',
    name: 'Lorde Tigre Branco',
    rank: 'Commander', type: 'Beast', dropRate: 0.03,
    passiveEffect: { type: 'gold_boost', value: 0.08, description: '+8% Gold em todas as missões' },
    lore: '"Um tigre albino sagrado do dungeon das montanhas nevadas. As tribos locais oravam para ele. O Monarca combateu-o durante três dias. Ambos sobreviveram. Apenas um continua de pé."',
    icon: 'cat-outline', color: '#f59e0b',
  },
  {
    id: 'ashborn_fragment',
    name: 'Fragmento de Ashborn',
    rank: 'Commander', type: 'Ancient', dropRate: 0,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.20, description: '+20% XP extra em Boss Raids' },
    lore: '"Um eco do Monarca das Sombras anterior. Quando derrotes Cerberus, este fragmento reconhece em ti a mesma chama. Não serve por obrigação — serve por reconhecimento."',
    icon: 'star-four-points', color: '#f59e0b',
    unlockMethod: { type: 'achievement', id: 'boss_cerberus' },
  },
  {
    id: 'dark_arbiter',
    name: 'Árbitro das Trevas',
    rank: 'Commander', type: 'Ancient', dropRate: 0,
    passiveEffect: { type: 'focus_bonus', value: 20, description: '+20 min de foco extra por sessão' },
    lore: '"Existiu antes dos Guildas, antes dos Caçadores, antes das regras. Julga cada ação sem misericórdia. O Monarca comprou a sua neutralidade — e converteu-a em serviço."',
    icon: 'scale-balance', color: '#f59e0b',
    unlockMethod: { type: 'shop', price: 20000 },
  },
  {
    id: 'venom_sovereign',
    name: 'Soberano do Veneno',
    rank: 'Commander', type: 'Beast', dropRate: 0,
    passiveEffect: { type: 'penalty_reduce', value: 0.15, description: '-15% na perda de XP por penalidade' },
    lore: '"A cabeça principal da Hidra. Quando o corpo foi destruído, a consciência sobreviveu. O veneno que corre nas suas veias dissolve qualquer punição."',
    icon: 'snake', color: '#f59e0b',
    unlockMethod: { type: 'boss_drop', bossId: 'hydra_queen' },
  },
  {
    id: 'iron_demon_lord',
    name: 'Lorde Demônio de Ferro',
    rank: 'Commander', type: 'Demon', dropRate: 0.025,
    passiveEffect: { type: 'gold_boost', value: 0.10, description: '+10% Gold em todas as missões' },
    lore: '"A sua pele era mais dura que qualquer metal forjado. Mil espadas se quebraram nela. Agora essa dureza protege a riqueza do Monarca."',
    icon: 'account-hard-hat', color: '#f59e0b',
  },
  {
    id: 'archlich_prime',
    name: 'Arqui-Lich Supremo',
    rank: 'Commander', type: 'Undead', dropRate: 0.025,
    passiveEffect: { type: 'daily_bonus', value: 20, description: '+20 XP grátis ao iniciar cada dia' },
    lore: '"Sacrificou a sua alma por imortalidade. Obteve-a. Passou milénios a acumular poder nos dungeons mais profundos. O Monarca reclamou tudo isso em sete minutos."',
    icon: 'coffin', color: '#f59e0b',
  },
  {
    id: 'wraith_commander',
    name: 'Comandante Espectral',
    rank: 'Commander', type: 'Undead', dropRate: 0.025,
    passiveEffect: { type: 'streak_protect', value: 2, description: 'Protege o streak duas vezes por semana' },
    lore: '"Liderou exércitos de mortos-vivos através de sete dungeons sem nunca perder um único soldado — porque os mortos não podem ser mortos duas vezes. A streak também não."',
    icon: 'flag-variant', color: '#f59e0b',
  },
  {
    id: 'storm_herald',
    name: 'Arauto da Tempestade',
    rank: 'Commander', type: 'Elemental', dropRate: 0.025,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.10, description: '+10% XP extra em Boss Raids' },
    lore: '"Anunciava as tempestades antes de chegarem. As criaturas do dungeon fugiam ao ouvir o seu grito. O Monarca ouviu e avançou. O Arauto decidiu seguir quem não fugia."',
    icon: 'weather-lightning-rainy', color: '#f59e0b',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ── MARSHAL RANK — Lendário · Passivas quebra-jogo · Uma raridade absoluta ──
  // ════════════════════════════════════════════════════════════════════════════

  {
    id: 'beru',
    name: 'Beru, o Rei Formiga',
    rank: 'Marshal', type: 'Insect', dropRate: 0.01,
    passiveEffect: { type: 'penalty_immunity', value: 1, description: 'Imunidade completa a 1 penalidade por semana' },
    lore: '"Governou a maior colónia de dungeons já registada. Cem mil formigas respondiam ao seu chamado. Agora responde ao chamado do Monarca — e a devoção não mudou em escala."',
    icon: 'crown', color: '#ef4444',
  },
  {
    id: 'bellion',
    name: 'Bellion, o Grande Marechal',
    rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'gold_boost', value: 0.20, description: '+20% Gold em todas as missões' },
    lore: '"Existia antes dos dungeons. Viu impérios nascer e colapsar. Apenas uma entidade alguma vez o subjugou — e esse é o teu Monarca. Considera-te abençoado."',
    icon: 'star-four-points', color: '#ef4444',
  },
  {
    id: 'greed',
    name: 'Greed, o Espectro da Cobiça',
    rank: 'Marshal', type: 'Demon', dropRate: 0.005,
    passiveEffect: { type: 'shop_discount', value: 0.15, description: '-15% no custo de todos os itens da Loja' },
    lore: '"Acumulou riqueza suficiente para comprar nações. Morreu sem gastar um único moeda. Agora serve o Monarca com ironia — pois o ouro que protegeu em vida, flui para o tesouro de outro."',
    icon: 'cash-multiple', color: '#ef4444',
  },
  {
    id: 'kamish_the_calamity',
    name: 'Kamish, a Calamidade',
    rank: 'Marshal', type: 'Ancient', dropRate: 0,
    passiveEffect: { type: 'xp_boost', value: 0.25, description: '+25% XP em todas as missões' },
    lore: '"O único ser a exterminar um país inteiro antes de ser parado. Na morte, toda a energia que usava para destruir foi invertida — agora constrói o poder do Monarca com a mesma intensidade devastadora."',
    icon: 'nuke', color: '#ef4444',
    unlockMethod: { type: 'boss_drop', bossId: 'kamish_dungeon' },
  },
  {
    id: 'architect_of_ruin',
    name: 'Arquiteto da Ruína',
    rank: 'Marshal', type: 'Ancient', dropRate: 0,
    passiveEffect: { type: 'focus_bonus', value: 30, description: '+30 min de foco extra por sessão' },
    lore: '"Construiu os primeiros dungeons como prisões para deuses caídos. O seu poder sobre a concentração é absoluto — cada sessão de foco na sua presença torna-se uma eternidade produtiva."',
    icon: 'castle', color: '#ef4444',
    unlockMethod: { type: 'achievement', id: 'secret_monarch' },
  },
  {
    id: 'high_shadow',
    name: 'Alta Sombra',
    rank: 'Marshal', type: 'Ancient', dropRate: 0.002,
    passiveEffect: { type: 'penalty_immunity', value: 2, description: 'Imunidade completa a 2 penalidades por semana' },
    lore: '"Não tem nome. Não tem história. Não tem origem conhecida. Apenas existe, nas margens de tudo que é escuro. Quem a obtém, obteve algo que o próprio Sistema não esperava revelar."',
    icon: 'weather-night', color: '#ef4444',
  },
  {
    id: 'void_sovereign',
    name: 'Soberano do Vazio',
    rank: 'Marshal', type: 'Demon', dropRate: 0,
    passiveEffect: { type: 'shop_discount', value: 0.20, description: '-20% no custo de todos os itens da Loja' },
    lore: '"Governou o espaço entre os dungeons — o vazio onde nem a magia nem o aço chegam. O seu poder sobre o comércio sombrio é absoluto. Compra-o e tudo ficará mais barato. Por um preço."',
    icon: 'infinity', color: '#ef4444',
    unlockMethod: { type: 'shop', price: 50000 },
  },

  // ── AUTÓMATOS DA CRIPTA (Crypt Automatons) ──
  {
    id: 'auto_pawn', name: 'Peão Mecânico', rank: 'Normal', type: 'Tank', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"A forma mais simples de autómato da cripta, desenhado apenas para marchar em frente. Agora marcha para o Monarca."',
    icon: 'robot', color: '#94a3b8',
  },
  {
    id: 'auto_gear', name: 'Engrenagem Viva', rank: 'Normal', type: 'Warrior', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Desligado há milénios, o seu núcleo ativou-se com a presença do Monarca."',
    icon: 'cog-outline', color: '#94a3b8',
  },
  {
    id: 'auto_scout', name: 'Sentinela Batedor', rank: 'Normal', type: 'Assassin', dropRate: 0.1,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Pequeno e rápido, um autómato que vigiava os corredores labirínticos dos criadores mortos."',
    icon: 'eye-circle-outline', color: '#94a3b8',
  },
  {
    id: 'auto_rust', name: 'Guarda Enferrujado', rank: 'Normal', type: 'Tank', dropRate: 0.1,
    passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
    lore: '"As lamelas de ferro descamam, mas a sua programação primordial de defender não expira."',
    icon: 'shield-off-outline', color: '#94a3b8',
  },
  {
    id: 'auto_miner', name: 'Escavador de Latão', rank: 'Normal', type: 'Warrior', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Extraía minério magi-condutor. Agora extrai ouro para as arcas do Monarca."',
    icon: 'pickaxe', color: '#94a3b8',
  },
  {
    id: 'auto_welder', name: 'Maquinista Cobre', rank: 'Normal', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'focus_bonus', value: 1, description: '+1 min de foco extra por sessão' },
    lore: '"Concebido para reparar os outros autómatos. As suas faíscas azuis iluminam o caminho sombrio."',
    icon: 'flash-outline', color: '#94a3b8',
  },
  {
    id: 'auto_clockwork', name: 'Autómato Relógio', rank: 'Elite', type: 'Assassin', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Move-se com a precisão de um ponteiro. Cada golpe é perfeitamente cronometrado."',
    icon: 'clock-fast', color: '#22c55e',
  },
  {
    id: 'auto_templar', name: 'Templário Metálico', rank: 'Elite', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.04, description: '-4% na perda de XP por penalidade' },
    lore: '"Armadura maciça e escudo acoplado. Não sente dor. Não sente medo. Protege o mestre."',
    icon: 'shield-star', color: '#22c55e',
  },
  {
    id: 'auto_blade', name: 'Lâmina Dentada', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Um autómato com espadas giratórias em vez de braços. Um terror nos corredores apertados da Cripta."',
    icon: 'saw-blade', color: '#22c55e',
  },
  {
    id: 'auto_cannon', name: 'Torreta Móvel', rank: 'Elite', type: 'Magic', dropRate: 0.08,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '"Dispara energia mágica concentrada. Lento, mas de um poder destrutivo incomparável na sua categoria."',
    icon: 'car-artillery', color: '#22c55e',
  },
  {
    id: 'auto_spider', name: 'Aracnídeo Mecânico', rank: 'Elite', type: 'Beast', dropRate: 0.08,
    passiveEffect: { type: 'daily_bonus', value: 5, description: '+5 XP grátis ao iniciar cada dia' },
    lore: '"Escala qualquer superfície, usando cabos de aço endurecido para apanhar presas biológicas."',
    icon: 'spider-thread', color: '#22c55e',
  },
  {
    id: 'auto_centurion', name: 'Centurião da Cripta', rank: 'Knight', type: 'Warrior', dropRate: 0.06,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"A unidade de comando das patrulhas robóticas. O seu chip central foi gravado com magias obscuras."',
    icon: 'robot-industrial', color: '#3b82f6',
  },
  {
    id: 'auto_aegis', name: 'Égide de Tungsténio', rank: 'Knight', type: 'Tank', dropRate: 0.06,
    passiveEffect: { type: 'penalty_reduce', value: 0.06, description: '-6% na perda de XP por penalidade' },
    lore: '"Construído para suportar explosões vulcânicas. O Monarca usou-o como barreira impenetrável contra os falsos deuses."',
    icon: 'shield-cross-outline', color: '#3b82f6',
  },
  {
    id: 'auto_specter', name: 'Espectro de Fios', rank: 'Knight', type: 'Assassin', dropRate: 0.05,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '"Usa tecnologia de refração de luz. Fica perfeitamente invisível antes de desferir cortes microscópicos."',
    icon: 'ghost-off', color: '#3b82f6',
  },
  {
    id: 'auto_titan', name: 'Titã de Sucata', rank: 'Knight', type: 'Tank', dropRate: 0.05,
    passiveEffect: { type: 'gold_boost', value: 0.04, description: '+4% Gold em todas as missões' },
    lore: '"Nasceu da fusão de centenas de autómatos quebrados. Uma montanha de metal que segue o Monarca de forma desajeitada mas letal."',
    icon: 'train-car-flatbed-tank', color: '#3b82f6',
  },
  {
    id: 'auto_symphony', name: 'Orquestrador Bélico', rank: 'Commander', type: 'Magic', dropRate: 0.02,
    passiveEffect: { type: 'focus_bonus', value: 15, description: '+15 min de foco extra por sessão' },
    lore: '"Controlava toda a infraestrutura da Cripta. Com as suas frequências hipnóticas, o foco e o ritmo mental tornam-se inquebráveis."',
    icon: 'music-clef-treble', color: '#f59e0b',
  },
  {
    id: 'auto_omega', name: 'Arma Ómega', rank: 'Commander', type: 'Warrior', dropRate: 0.02,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
    lore: '"A última linha de defesa dos velhos construtores. O Monarca desativou-a com força bruta. Agora, a aniquilação tem um novo mestre."',
    icon: 'nuke', color: '#f59e0b',
  },
  {
    id: 'auto_prime', name: 'Prime, O Motor Eterno', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'shop_discount', value: 0.15, description: '-15% no custo de todos os itens da Loja' },
    lore: '"A primeira máquina da Cripta. Funciona através de energia sombria pura. Em sua presença, o Sistema reorganiza as prioridades logísticas e comerciais."',
    icon: 'engine-outline', color: '#ef4444',
  },

  // ── SOMBRAS ASTRAIS (Astral Shadows) ──
  {
    id: 'astral_wisp', name: 'Luz Estelar Moribunda', rank: 'Normal', type: 'Elemental', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Uma faísca de uma galáxia morta, recolhida do vórtice astral. Dá calor silencioso."',
    icon: 'star-outline', color: '#94a3b8',
  },
  {
    id: 'astral_moth', name: 'Mariposa do Vácuo', rank: 'Normal', type: 'Insect', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Atraída não pelo calor, mas pela energia umbrosa do Monarca. Flutua entre dimensões."',
    icon: 'butterfly', color: '#94a3b8',
  },
  {
    id: 'astral_echo', name: 'Eco do Cometa', rank: 'Normal', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'focus_bonus', value: 1, description: '+1 min de foco extra por sessão' },
    lore: '"O som residual de um impacto estelar que durou um milénio. Acalma a mente mortal."',
    icon: 'comet', color: '#94a3b8',
  },
  {
    id: 'astral_hound', name: 'Cão Cósmico', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Fareja rastos não na terra, mas nos tecidos do espaço. Encontra caminhos que não deveriam existir."',
    icon: 'dog', color: '#94a3b8',
  },
  {
    id: 'astral_phantom', name: 'Manto das Plêiades', rank: 'Elite', type: 'Assassin', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Uma sombra envolta no brilho azul das estrelas jovens. Rápida e impiedosa, corta num clarão."',
    icon: 'moon-waning-crescent', color: '#22c55e',
  },
  {
    id: 'astral_weaver', name: 'Tecelã de Constelações', rank: 'Elite', type: 'Magic', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.04, description: '-4% na perda de XP por penalidade' },
    lore: '"Poder capaz de ligar estrelas. Agora liga e fortifica os fragmentos mágicos do Monarca."',
    icon: 'constellation', color: '#22c55e',
  },
  {
    id: 'astral_guardian', name: 'Vigia Orbital', rank: 'Elite', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Pedaços gravitacionais de meteoritos servem como a sua armadura giratória. Um satélite de defesa perfeito."',
    icon: 'planet', color: '#22c55e',
  },
  {
    id: 'astral_striker', name: 'Meteoro Laminado', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '"A força de impacto que causaria crateras em mundos inteiros, contida na lâmina deste guerreiro caído."',
    icon: 'sword-cross', color: '#22c55e',
  },
  {
    id: 'astral_behemoth', name: 'Leviatã do Vácuo', rank: 'Knight', type: 'Beast', dropRate: 0.06,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"Nadava pelos oceanos das nebulosas Escuras. Um titã que corrompe o próprio espaço onde pisa."',
    icon: 'weather-night-partly-cloudy', color: '#3b82f6',
  },
  {
    id: 'astral_archon', name: 'Arconte Solar', rank: 'Knight', type: 'Elemental', dropRate: 0.06,
    passiveEffect: { type: 'xp_boost', value: 0.05, description: '+5% XP em todas as missões' },
    lore: '"Um ser infundido com o poder plasmático de estrelas ativas. Cada golpe é uma explosão nuclear controlada."',
    icon: 'white-balance-sunny', color: '#3b82f6',
  },
  {
    id: 'astral_seer', name: 'Oráculo da Névoa', rank: 'Knight', type: 'Magic', dropRate: 0.06,
    passiveEffect: { type: 'focus_bonus', value: 5, description: '+5 min de foco extra por sessão' },
    lore: '"Lia o futuro no colapso de Supernovas. Ao seu lado, o foco torna-se uma clarividência afiada."',
    icon: 'crystal-ball', color: '#3b82f6',
  },
  {
    id: 'astral_drifter', name: 'Nómada Intergalático', rank: 'Knight', type: 'Assassin', dropRate: 0.06,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold em todas as missões' },
    lore: '"Conhece mil mundos e os seus tesouros. Encontra vulnerabilidades que nenhum ser terrestre veria."',
    icon: 'alien-outline', color: '#3b82f6',
  },
  {
    id: 'astral_nebula', name: 'Rei Nebulosa', rank: 'Commander', type: 'Magic', dropRate: 0.02,
    passiveEffect: { type: 'penalty_immunity', value: 1, description: 'Imunidade completa a 1 penalidade por semana' },
    lore: '"Nasceu do colapso e da formação. Ao absorver falhas do Sistema, converte-as em pura energia vazia. Inegavelmente monstruoso."',
    icon: 'weather-cloudy', color: '#f59e0b',
  },
  {
    id: 'astral_nova', name: 'General Supernova', rank: 'Commander', type: 'Warrior', dropRate: 0.02,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
    lore: '"A fúria de uma estrela que agoniza antes de deflagrar. Os bosses inimigos derretem face ao seu avançar cintilante."',
    icon: 'star-shooting', color: '#f59e0b',
  },
  {
    id: 'astral_eclipse', name: 'Eclipse, a Fome Cósmica', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'xp_boost', value: 0.20, description: '+20% XP em todas as missões' },
    lore: '"A escuridão que engole a luz de cem galáxias. Foi preciso o poder integral de um Autarca e o Monarca para o subjugar."',
    icon: 'moon-new', color: '#ef4444',
  },

  // ── GLADIADORES (Gladiators) ──
  {
    id: 'glad_recruit', name: 'Recruta da Arena', rank: 'Normal', type: 'Warrior', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Lutou com paus, sangrou na areia, morreu por aplausos vazios. O Monarca oferece-lhe uma arena eterna."',
    icon: 'account-plus-outline', color: '#94a3b8',
  },
  {
    id: 'glad_beast', name: 'Cão de Fossa', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Lançado aos condenados na arena inferior. A fome nunca cessou."',
    icon: 'dog-side', color: '#94a3b8',
  },
  {
    id: 'glad_net', name: 'Caçador de Redes', rank: 'Normal', type: 'Assassin', dropRate: 0.1,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Com as suas redes de malha dupla enredou campeões antes de lhe cortarem a garganta nas costas."',
    icon: 'spider-web', color: '#94a3b8',
  },
  {
    id: 'glad_shield', name: 'Bucha de Canhão', rank: 'Normal', type: 'Tank', dropRate: 0.1,
    passiveEffect: { type: 'penalty_reduce', value: 0.01, description: '-1% na perda de XP por penalidade' },
    lore: '"O primeiro na linha, destinado a morrer. Aprendeu a não ceder um milímetro. Hoje nem precisa de respirar."',
    icon: 'shield-off', color: '#94a3b8',
  },
  {
    id: 'glad_boar', name: 'Javali Espinhos', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Adornado com ferros dolorosos pelos donos da arena. Enlouqueceu pelas dores. Esmaga sob ordens agora."',
    icon: 'pig', color: '#94a3b8',
  },
  {
    id: 'glad_champion', name: 'Veterano das Areias', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Cem vitórias consecutivas. Traído na centésima primeira. Ele não esquece a lâmina nas costas."',
    icon: 'crown-outline', color: '#22c55e',
  },
  {
    id: 'glad_tiger', name: 'Dentes de Sabre Coliseu', rank: 'Elite', type: 'Beast', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Nenhum gladiador humano escapou das suas presas durante três décadas de terror nos combates de exibição."',
    icon: 'cat', color: '#22c55e',
  },
  {
    id: 'glad_hoplite', name: 'Hoplita Ensanguentado', rank: 'Elite', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.04, description: '-4% na perda de XP por penalidade' },
    lore: '"A formação nunca quebra. O corpo pode ser em pedaços, o fantasma agarra a lança ao lado dos irmãos e do Monarca."',
    icon: 'strategy', color: '#22c55e',
  },
  {
    id: 'glad_venom', name: 'Facas Envenenadas', rank: 'Elite', type: 'Assassin', dropRate: 0.08,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '"Sobreviveu à base de sujidade e truques sujos. A sua adaga tem soros e toxinas de eras extintas."',
    icon: 'flask-empty-outline', color: '#22c55e',
  },
  {
    id: 'glad_minotaur', name: 'Minotauro Escravo', rank: 'Elite', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'daily_bonus', value: 6, description: '+6 XP grátis ao iniciar cada dia' },
    lore: '"Preso sob correntes que pesavam mais do que os blocos de pedra. Uma vez livre pelo escuro, o bater do casco faz o chão tremer."',
    icon: 'cow', color: '#22c55e',
  },
  {
    id: 'glad_spartacus', name: 'Líder dos Rejeitados', rank: 'Knight', type: 'Warrior', dropRate: 0.06,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"Chefiou uma rebelião de escravos das arenas que ameaçou impérios inteiros. A rebelião não acabou."',
    icon: 'flag-triangle', color: '#3b82f6',
  },
  {
    id: 'glad_executioner', name: 'O Carrasco da Arena', rank: 'Knight', type: 'Warrior', dropRate: 0.06,
    passiveEffect: { type: 'gold_boost', value: 0.05, description: '+5% Gold em todas as missões' },
    lore: '"A multidão não gritava o seu nome. Gritava as mortes que ele entregava com o machado de dupla lâmina."',
    icon: 'axe', color: '#3b82f6',
  },
  {
    id: 'glad_lion', name: 'Quimera de Batalha', rank: 'Knight', type: 'Beast', dropRate: 0.06,
    passiveEffect: { type: 'xp_boost', value: 0.05, description: '+5% XP em todas as missões' },
    lore: '"Mistura biológica injetada em arenas fechadas para purgar fracos. As suas asas carregam o terror da arena."',
    icon: 'skull-outline', color: '#3b82f6',
  },
  {
    id: 'glad_sorcerer', name: 'Cativador de Sangue', rank: 'Knight', type: 'Magic', dropRate: 0.06,
    passiveEffect: { type: 'focus_bonus', value: 8, description: '+8 min de foco extra por sessão' },
    lore: '"Forçado a lutar como um espetáculo de magias grotescas, acabou por dominar ritos proibidos no sangue das areias."',
    icon: 'blood-bag', color: '#3b82f6',
  },
  {
    id: 'glad_juggernaut', name: 'Imperador da Dor', rank: 'Commander', type: 'Tank', dropRate: 0.02,
    passiveEffect: { type: 'penalty_reduce', value: 0.15, description: '-15% na perda de XP por penalidade' },
    lore: '"Nunca foi ferido profundamente. A lenda na arena afirmava que ele não tinha órgãos — apenas blocos de agonia solidificada."',
    icon: 'emoticon-angry-outline', color: '#f59e0b',
  },
  {
    id: 'glad_god', name: 'Deus da Arena', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.25, description: '+25% XP extra em Boss Raids' },
    lore: '"O Avatar imortal de sangue derramado. Todos que caem no coliseu abrem caminho para esta criatura. Submeteu-se pela primeira vez à autoridade do Monarca."',
    icon: 'sword-cross', color: '#ef4444',
  },

  // ── DEUSES ANTIGOS (Ancient Gods) ──
  {
    id: 'god_servant', name: 'Acolito de Bronze', rank: 'Normal', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Limparam templos desmoronados das divindades esquecidas. Agora limparão os obstáculos do Monarca."',
    icon: 'account', color: '#94a3b8',
  },
  {
    id: 'god_idol', name: 'Ídolo Fendido', rank: 'Normal', type: 'Tank', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Pequenas relíquias abençoadas com restos de poder caduco. Inúteis para as bestas, inestimáveis no Exército Umbroso."',
    icon: 'pot-mix', color: '#94a3b8',
  },
  {
    id: 'god_hound', name: 'Mastim do Santuário', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Cães corrompidos de estátuas antigas, desenterrados pela essência púrpura das sombras."',
    icon: 'dog-side', color: '#94a3b8',
  },
  {
    id: 'god_scripture', name: 'Papiro Amaldiçoado', rank: 'Elite', type: 'Magic', dropRate: 0.08,
    passiveEffect: { type: 'focus_bonus', value: 3, description: '+3 min de foco extra por sessão' },
    lore: '"Uma folha com as leis antigas — agora obedece apenas à lei do sistema, o qual substituiu as divindades mortais."',
    icon: 'script-text-outline', color: '#22c55e',
  },
  {
    id: 'god_sculpture', name: 'Anjo de Mármore', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Querubim desfeito que a sombra restituiu com osso e vapor. Bate com fúria divina desapontada."',
    icon: 'feather', color: '#22c55e',
  },
  {
    id: 'god_priest', name: 'Sumo Sacerdote', rank: 'Knight', type: 'Magic', dropRate: 0.06,
    passiveEffect: { type: 'penalty_reduce', value: 0.08, description: '-8% na perda de XP por penalidade' },
    lore: '"Tentou banir os desfiladeiros umbrosos do Monarca e serviu de sacrifício. Na morte compreendeu porque os deuses tremem."',
    icon: 'church', color: '#3b82f6',
  },
  {
    id: 'god_goliath', name: 'Arauto do Abismo', rank: 'Knight', type: 'Tank', dropRate: 0.06,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.08, description: '+8% XP extra em Boss Raids' },
    lore: '"Quatro braços e armadura de obsidiana infundida por rezas fúteis. Uma máquina destruidora abençoada com escuridão pura."',
    icon: 'robot', color: '#3b82f6',
  },
  {
    id: 'god_seraphim', name: 'Lâmina Serafim Caído', rank: 'Commander', type: 'Assassin', dropRate: 0.02,
    passiveEffect: { type: 'xp_boost', value: 0.12, description: '+12% XP em todas as missões' },
    lore: '"Seis asas decepadas transmutadas em tendão escuro. Onde passava trazia luz cega. Onde vai, só cai sombra espessa e letal."',
    icon: 'sword', color: '#f59e0b',
  },
  {
    id: 'god_sovereign', name: 'Panteão Solitário', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'shop_discount', value: 0.15, description: '-15% no custo de todos os itens da Loja' },
    lore: '"O último deus do continente em forma de espectro ancestral. Inclinou a perna diante do poder ilimitado do caçador."',
    icon: 'chess-king', color: '#ef4444',
  },

  // ── SEGUNDA VAGA: REFORÇOS DA CIDADELA (Novas 40+ Sombras) ──
  {
    id: 'citadel_guard', name: 'Guarda da Cidadela', rank: 'Normal', type: 'Warrior', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Soldado raso de um império desmoronado. Levanta-se novamente sob novo estandarte."',
    icon: 'shield', color: '#94a3b8',
  },
  {
    id: 'citadel_archer', name: 'Besteiro Esqueleto', rank: 'Normal', type: 'Assassin', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"A sua mira melhorou sem olhos que sequem com o vento frio."',
    icon: 'bullseye-arrow', color: '#94a3b8',
  },
  {
    id: 'abyss_crawler', name: 'Rastejante do Abismo', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Alimentava-se dos restos nos calabouços de R-Rank. Agora é leal à escuridão."',
    icon: 'bug', color: '#94a3b8',
  },
  {
    id: 'forgotten_mage', name: 'Mago Esquecido', rank: 'Normal', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
    lore: '"Gagueja encantamentos que já não funcionam. Serve como distração mágica."',
    icon: 'auto-fix', color: '#94a3b8',
  },
  {
    id: 'dungeon_gargoyle', name: 'Gárgula do Portal', rank: 'Normal', type: 'Tank', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Observou milhões de caçadores entrarem para a morte. Finalmente, juntou-se ao massacre."',
    icon: 'chess-rook', color: '#94a3b8',
  },
  {
    id: 'shadow_rat_king', name: 'Rei dos Ratos', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Milhares de consciências roedoras fundidas num colosso rasteiro que o Monarca subjugou."',
    icon: 'rodent', color: '#94a3b8',
  },
  {
    id: 'iron_maid', name: 'Dama de Ferro Viva', rank: 'Elite', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.04, description: '-4% na perda de XP por penalidade' },
    lore: '"Instrumento de tortura alimentado pelas almas de quem lá sofreu. Move-se lentamente na vanguarda."',
    icon: 'door', color: '#22c55e',
  },
  {
    id: 'crypt_assassin', name: 'Assassino Estripador', rank: 'Elite', type: 'Assassin', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Não usa armas, apenas unhas de osso alongadas temperadas com veneno místico."',
    icon: 'knife-military', color: '#22c55e',
  },
  {
    id: 'venom_weaver', name: 'Tecedeira de Veneno', rank: 'Elite', type: 'Insect', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Aranha do tamanho de cavalos. Fia teias que dissolvem a carne dos descuidados."',
    icon: 'spider', color: '#22c55e',
  },
  {
    id: 'golem_magma', name: 'Golem de Magma', rank: 'Elite', type: 'Elemental', dropRate: 0.08,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '"Arrefeceu apenas superficialmente, quebrando e jorrando lava a cada golpe sofrido."',
    icon: 'fire-hydrant', color: '#22c55e',
  },
  {
    id: 'grave_robber', name: 'Saqueador de Tumbas', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'daily_bonus', value: 5, description: '+5 XP grátis ao iniciar cada dia' },
    lore: '"Roubou aos mortos toda a vida e pagou com a sua própria morte nos corredores abissais."',
    icon: 'robber', color: '#22c55e',
  },
  {
    id: 'dark_cavalry', name: 'Cavalaria Sombria', rank: 'Knight', type: 'Warrior', dropRate: 0.06,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"Cavalos descarnados montados por generais que esqueceram de que império vieram."',
    icon: 'horse', color: '#3b82f6',
  },
  {
    id: 'plague_doctor', name: 'Médico da Peste', rank: 'Knight', type: 'Magic', dropRate: 0.06,
    passiveEffect: { type: 'penalty_reduce', value: 0.06, description: '-6% na perda de XP por penalidade' },
    lore: '"Tentou curar a sombra. Percebeu que a sombra é a única cura contra as doenças dos deuses."',
    icon: 'doctor', color: '#3b82f6',
  },
  {
    id: 'blood_hound', name: 'Cão de Sangue Alfa', rank: 'Knight', type: 'Beast', dropRate: 0.05,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '"Pode rastrear presas no passado e através de outras dimensões menores."',
    icon: 'dog-side', color: '#3b82f6',
  },
  {
    id: 'gargantua', name: 'Gargântua Mudo', rank: 'Knight', type: 'Tank', dropRate: 0.05,
    passiveEffect: { type: 'gold_boost', value: 0.04, description: '+4% Gold em todas as missões' },
    lore: '"Sem cordas vocais, o seu silêncio enlouquece quem ouve o ruído das suas pesadas passadas metálicas."',
    icon: 'weight', color: '#3b82f6',
  },
  {
    id: 'abyss_warlock', name: 'Feiticeiro Abissal', rank: 'Knight', type: 'Magic', dropRate: 0.06,
    passiveEffect: { type: 'focus_bonus', value: 5, description: '+5 min de foco extra por sessão' },
    lore: '"Canalizou o vácuo de uma dimensão estéril, vendendo a sanidade pelo foco inquebrável da sombra."',
    icon: 'book-open-blank-variant', color: '#3b82f6',
  },
  {
    id: 'shadow_dragon', name: 'Filhote de Dragão Sombrio', rank: 'Commander', type: 'Beast', dropRate: 0.02,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
    lore: '"Um pálido eco do poder dracónico, mas cresce dia após dia no exército real do Monarca."',
    icon: 'dragon', color: '#f59e0b',
  },
  {
    id: 'cursed_inquisitor', name: 'Inquisidor Amaldiçoado', rank: 'Commander', type: 'Warrior', dropRate: 0.02,
    passiveEffect: { type: 'penalty_immunity', value: 1, description: 'Imunidade completa a 1 penalidade por semana' },
    lore: '"Caçador de hereges que deparou com a divindade incorreta e pagou até ao osso. Impiedoso contra qualquer adversidade."',
    icon: 'fire-circle', color: '#f59e0b',
  },
  {
    id: 'royal_assassin', name: 'Assassino Real', rank: 'Commander', type: 'Assassin', dropRate: 0.02,
    passiveEffect: { type: 'focus_bonus', value: 15, description: '+15 min de foco extra por sessão' },
    lore: '"Trabalhava nas sombras para imperadores frágeis. Serve a escuridão suprema sob promessa de caos silenciado."',
    icon: 'incognito', color: '#f59e0b',
  },
  {
    id: 'monolith', name: 'O Monólito Primitivo', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'shop_discount', value: 0.15, description: '-15% no custo de todos os itens da Loja' },
    lore: '"Uma rocha senciente com vinte metros de altura que o Sistema marcava como indomável. Destrói economias inteiras só de aterrar."',
    icon: 'pillar', color: '#ef4444',
  },
  {
    id: 'star_breaker', name: 'Quebrador de Estrelas', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'xp_boost', value: 0.20, description: '+20% XP em todas as missões' },
    lore: '"O poder comprimido de cometas em rota de colisão manifestado em braços de poeira cósmica. Concede um crescimento sem precedentes aos seus pares umbrosos."',
    icon: 'earth', color: '#ef4444',
  },

  // ── TERCEIRA VAGA: LEGIÃO DOS ESQUECIDOS (Mais 30 Sombras) ──
  {
    id: 'hollow_peasant', name: 'Aldeão Vazio', rank: 'Normal', type: 'Undead', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Nunca segurou uma arma na vida. Na morte, o seu medo desapareceu."',
    icon: 'pitchfork', color: '#94a3b8',
  },
  {
    id: 'cave_dweller', name: 'Habitante das Grutas', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'xp_boost', value: 0.01, description: '+1% XP em todas as missões' },
    lore: '"Os seus olhos adaptaram-se à escuridão muito antes de se fundir a ela."',
    icon: 'eye-off-outline', color: '#94a3b8',
  },
  {
    id: 'rust_hound', name: 'Cão Ferruginoso', rank: 'Normal', type: 'Beast', dropRate: 0.1,
    passiveEffect: { type: 'daily_bonus', value: 2, description: '+2 XP grátis ao iniciar cada dia' },
    lore: '"Corroído por chuvas ácidas nas arenas abertas. Forte e desesparado."',
    icon: 'dog', color: '#94a3b8',
  },
  {
    id: 'ash_specter', name: 'Espectro de Cinzas', rank: 'Normal', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'penalty_reduce', value: 0.02, description: '-2% na perda de XP por penalidade' },
    lore: '"Nasceu das fogueiras de acampamentos de caçadores aniquilados."',
    icon: 'fire', color: '#94a3b8',
  },
  {
    id: 'bone_collector', name: 'Colecionador de Ossos', rank: 'Normal', type: 'Undead', dropRate: 0.1,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"As montanhas de esqueletos na Cripta eram o seu parque de diversões."',
    icon: 'bone', color: '#94a3b8',
  },
  {
    id: 'blind_seer', name: 'Vidente Cego', rank: 'Normal', type: 'Magic', dropRate: 0.1,
    passiveEffect: { type: 'focus_bonus', value: 1, description: '+1 min de foco extra por sessão' },
    lore: '"Previu a ascensão do Monarca. Arrancou os próprios olhos porque a visão era aterradora."',
    icon: 'eye-off', color: '#94a3b8',
  },
  {
    id: 'bronze_hoplite', name: 'Hoplita de Bronze', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Defendeu as encostas contra hordas maiores. Como sombra, ele nunca cede um passo."',
    icon: 'shield', color: '#22c55e',
  },
  {
    id: 'void_manta', name: 'Manta do Vazio', rank: 'Elite', type: 'Beast', dropRate: 0.08,
    passiveEffect: { type: 'penalty_reduce', value: 0.04, description: '-4% na perda de XP por penalidade' },
    lore: '"Planava sobre falésias dimensionais, sugando a humidade mágica do ar."',
    icon: 'sail-boat', color: '#22c55e',
  },
  {
    id: 'cursed_samurai', name: 'Samurai Vingativo', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Lutou sem senhor em vida. Encontrou na morte o Lorde das Sombras perfeito."',
    icon: 'sword', color: '#22c55e',
  },
  {
    id: 'swamp_behemoth', name: 'Behemoth de Lodo', rank: 'Elite', type: 'Tank', dropRate: 0.08,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.05, description: '+5% XP extra em Boss Raids' },
    lore: '"Corpo feito de lamas tóxicas e cadáveres petrificados de antigas expedições."',
    icon: 'water-pump', color: '#22c55e',
  },
  {
    id: 'crystal_golem', name: 'Golem de Cristal', rank: 'Elite', type: 'Elemental', dropRate: 0.08,
    passiveEffect: { type: 'daily_bonus', value: 5, description: '+5 XP grátis ao iniciar cada dia' },
    lore: '"Refratava magia em focos mortais no Ninho de Cristal Perdido."',
    icon: 'diamond', color: '#22c55e',
  },
  {
    id: 'ember_knight', name: 'Cavaleiro de Fogo', rank: 'Knight', type: 'Warrior', dropRate: 0.06,
    passiveEffect: { type: 'streak_protect', value: 1, description: 'Protege o streak uma vez por semana' },
    lore: '"O seu elmo irradia calor constante. As suas pegadas derretem o chão em que pisa."',
    icon: 'fire-hydrant', color: '#3b82f6',
  },
  {
    id: 'frostbite_mage', name: 'Mago da Geada Mortífera', rank: 'Knight', type: 'Magic', dropRate: 0.06,
    passiveEffect: { type: 'penalty_reduce', value: 0.06, description: '-6% na perda de XP por penalidade' },
    lore: '"Congelou as almas de um exército inteiro de goblins e, em seguida, a si mesmo."',
    icon: 'snowflake-melt', color: '#3b82f6',
  },
  {
    id: 'silent_blade', name: 'Lâmina Silenciosa', rank: 'Knight', type: 'Assassin', dropRate: 0.05,
    passiveEffect: { type: 'xp_boost', value: 0.04, description: '+4% XP em todas as missões' },
    lore: '"Não usa passos verbais nem ruídos metálicos. Apenas fatias perfeitas e silêncio absoluto."',
    icon: 'knife', color: '#3b82f6',
  },
  {
    id: 'titan_ape', name: 'Primata Titânico', rank: 'Knight', type: 'Beast', dropRate: 0.05,
    passiveEffect: { type: 'gold_boost', value: 0.04, description: '+4% Gold em todas as missões' },
    lore: '"Derrubava florestas antigas apenas para aquecer os músculos. Adora a carnificina."',
    icon: 'monkey', color: '#3b82f6',
  },
  {
    id: 'soul_reaper', name: 'Ceifeiro de Almas', rank: 'Commander', type: 'Undead', dropRate: 0.02,
    passiveEffect: { type: 'focus_bonus', value: 15, description: '+15 min de foco extra por sessão' },
    lore: '"Rivalizava os Guias do Submundo. O Monarca usurpou a sua posição numa única batalha."',
    icon: 'sickle', color: '#f59e0b',
  },
  {
    id: 'storm_bringer', name: 'Invocador de Tempestades', rank: 'Commander', type: 'Elemental', dropRate: 0.02,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.15, description: '+15% XP extra em Boss Raids' },
    lore: '"Nasceu nos céus tempestuosos. Rasga nuvens negras quando invocado, gerando relâmpagos massivos."',
    icon: 'weather-lightning', color: '#f59e0b',
  },
  {
    id: 'chrono_master', name: 'Senhor do Tempo', rank: 'Marshal', type: 'Ancient', dropRate: 0.005,
    passiveEffect: { type: 'shop_discount', value: 0.15, description: '-15% no custo de todos os itens da Loja' },
    lore: '"Uma criatura que manipula fluxos temporais menores. Concedeu a si próprio juventude até a lâmina do Monarca travar o seu feitiço."',
    icon: 'timer-sand', color: '#ef4444',
  },
  // ── Low-rank balance additions ─────────────────────────────────────────────
  {
    id: 'dune_scamp', name: 'Saqueador das Dunas', rank: 'Normal', type: 'Beast', dropRate: 0.10,
    passiveEffect: { type: 'gold_boost', value: 0.01, description: '+1% Gold em todas as missões' },
    lore: '"Aprendeu a sobreviver com quase nada. Leal a quem lhe dá propósito."',
    icon: 'dog', color: '#22c55e',
  },
  {
    id: 'library_wisp', name: 'Faísca da Biblioteca', rank: 'Normal', type: 'Magic', dropRate: 0.10,
    passiveEffect: { type: 'focus_bonus', value: 5, description: '+5 min de foco extra por sessão' },
    lore: '"Sussurra páginas antigas quando o silêncio é total."',
    icon: 'book-open-variant', color: '#3b82f6',
  },
  {
    id: 'rust_sentinel', name: 'Sentinela Ferrugem', rank: 'Normal', type: 'Tank', dropRate: 0.10,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.02, description: '+2% XP extra em Boss Raids' },
    lore: '"Quebrou mil lâminas antes de aceitar a tua."',
    icon: 'shield-check', color: '#94a3b8',
  },
  {
    id: 'glacier_stalker', name: 'Espreitador Glacial', rank: 'Elite', type: 'Assassin', dropRate: 0.08,
    passiveEffect: { type: 'xp_boost', value: 0.03, description: '+3% XP em todas as missões' },
    lore: '"Move-se entre estalidos de gelo. Só deixa pegadas quando quer."',
    icon: 'snowflake', color: '#60a5fa',
  },
  {
    id: 'ember_squire', name: 'Escudeiro de Brasas', rank: 'Elite', type: 'Warrior', dropRate: 0.08,
    passiveEffect: { type: 'gold_boost', value: 0.03, description: '+3% Gold em todas as missões' },
    lore: '"Treinado a servir cavaleiros de fogo. Agora serve o Monarca."',
    icon: 'fire', color: '#f59e0b',
  },
  {
    id: 'storm_lancer', name: 'Lanceiro da Tempestade', rank: 'Knight', type: 'Warrior', dropRate: 0.06,
    passiveEffect: { type: 'boss_bonus_xp', value: 0.06, description: '+6% XP extra em Boss Raids' },
    lore: '"Carrega trovões na ponta da lança. Nunca falha o primeiro golpe."',
    icon: 'sword', color: '#38bdf8',
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

export const SHADOW_MAP: Record<string, Shadow> =
  Object.fromEntries(SHADOW_DATABASE.map(s => [s.id, s]))

export const SHADOW_BY_RANK: Record<ShadowRank, Shadow[]> = {
  Normal:    SHADOW_DATABASE.filter(s => s.rank === 'Normal'),
  Elite:     SHADOW_DATABASE.filter(s => s.rank === 'Elite'),
  Knight:    SHADOW_DATABASE.filter(s => s.rank === 'Knight'),
  Commander: SHADOW_DATABASE.filter(s => s.rank === 'Commander'),
  Marshal:   SHADOW_DATABASE.filter(s => s.rank === 'Marshal'),
}

// Only gacha-eligible shadows (undefined unlockMethod = gacha by default)
export const SHADOW_GACHA_BY_RANK: Record<ShadowRank, Shadow[]> = {
  Normal:    SHADOW_DATABASE.filter(s => s.rank === 'Normal'    && (!s.unlockMethod || s.unlockMethod.type === 'gacha')),
  Elite:     SHADOW_DATABASE.filter(s => s.rank === 'Elite'     && (!s.unlockMethod || s.unlockMethod.type === 'gacha')),
  Knight:    SHADOW_DATABASE.filter(s => s.rank === 'Knight'    && (!s.unlockMethod || s.unlockMethod.type === 'gacha')),
  Commander: SHADOW_DATABASE.filter(s => s.rank === 'Commander' && (!s.unlockMethod || s.unlockMethod.type === 'gacha')),
  Marshal:   SHADOW_DATABASE.filter(s => s.rank === 'Marshal'   && (!s.unlockMethod || s.unlockMethod.type === 'gacha')),
}

// Shop-available shadows
export const SHADOW_SHOP: Shadow[] =
  SHADOW_DATABASE.filter(s => s.unlockMethod?.type === 'shop')

// Achievement-unlocked shadows: achievementId → Shadow
export const SHADOW_BY_ACHIEVEMENT: Record<string, Shadow> =
  Object.fromEntries(
    SHADOW_DATABASE
      .filter(s => s.unlockMethod?.type === 'achievement')
      .map(s => [(s.unlockMethod as { type: 'achievement'; id: string }).id, s])
  )

// Roll a random shadow from the gacha pool using weighted dropRate within rank tier
export function rollShadow(
  rank: ShadowRank,
  alreadyOwned: string[] = [],
): Shadow | null {
  const pool = SHADOW_GACHA_BY_RANK[rank].filter(s => !alreadyOwned.includes(s.id))
  if (pool.length === 0) return null

  const totalWeight = pool.reduce((sum, s) => sum + s.dropRate, 0)
  let roll = Math.random() * totalWeight
  for (const shadow of pool) {
    roll -= shadow.dropRate
    if (roll <= 0) return shadow
  }
  return pool[pool.length - 1]
}
