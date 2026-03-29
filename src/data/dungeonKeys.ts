export type DungeonKey = {
  id: string
  bossId: string
  name: string
  description: string
  unlockLevel?: number
  isBoxExclusive?: boolean
  color: string
  missionType: 'training' | 'focus' | 'gps'
  missionTarget: number
  missionDetail: string
  lore: string  // Lore/história do portal
  environment: string  // Descrição do ambiente/local
  difficulty: number | '???'  // Rating de dificuldade (1-5) ou "???" para mistério
}

// Map bosses to keys
// Level-gated keys: granted automatically at certain levels
export const LEVEL_GATED_KEYS: DungeonKey[] = [
  {
    id: 'key_kasaka',
    bossId: 'kasaka_venom_fang',
    name: 'Chave do Pantanal Venenoso',
    description: 'Permite aceder ao covil da serpente Kasaka.',
    unlockLevel: 5,
    color: '#84cc16',
    missionType: 'training',
    missionTarget: 50,
    missionDetail: '50 flexões de braços (ou variações adaptadas) para forjar resistência ao veneno.',
    lore: 'Kasaka é uma cobra antiga e leal, guardiã de poderes ocultos. Diz-se que derrotar este monstro concederá ao caçador a velocidade de um réptil.',
    environment: 'Pântano denso e venenoso, coberto de vegetação tóxica e água contaminada. Ar sufocante.',
    difficulty: 1
  },
  {
    id: 'key_baruka',
    bossId: 'baruka_ice_elf',
    name: 'Chave do Portão Vermelho Nevado',
    description: 'Abre o domínio congelado do chefe dos elfos Gélidos.',
    unlockLevel: 10,
    color: '#38bdf8',
    missionType: 'focus',
    missionTarget: 60 * 60_000,
    missionDetail: '60 minutos de Foco Produtivo ou Estudo Ininterrupto para sobreviver à tempestade de neve.',
    lore: 'Baruka governa o reino gelado com mão de ferro. Legendas falam de seus domínios arcanos onde o frio congela até a alma.',
    environment: 'Montanha coberta de neve eterna, castelo de gelo e cristal azul. Ventos cortantes e aurora boreal.',
    difficulty: 2
  },
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
    lore: 'Kargalgan, o Xamã Orc, comanda legiões com magia corrupta. Diz-se que seus rituais amaldiçoam qualquer um que ouse entrar.',
    environment: 'Planície vulcânica árida com crateras, totem orcs antigos e neblina vermelha de lava.',
    difficulty: 2
  },
  {
    id: 'key_vulcan',
    bossId: 'vulcan_greed_demon',
    name: 'Chave da Ganância de Vulcan',
    description: 'Sela o acesso ao vulcão onde reside o Demónio da Ganância.',
    unlockLevel: 20,
    color: '#ea580c',
    missionType: 'focus',
    missionTarget: 90 * 60_000,
    missionDetail: '90 minutos de Foco Total no Trabalho ou Estudo (sem distrações) no calor escaldante.',
    lore: 'Vulcan o Demónio da Ganância acumula riquezas no fundo de seu vulcão. Sua ganância é lendária entre os monstros.',
    environment: 'Vulcão ativo com lava escorrendo, cavernas aquecidas e tesouro brilhando no escuro.',
    difficulty: 3
  },
  {
    id: 'key_metus',
    bossId: 'metus_soul_guide',
    name: 'Lanterna das Almas',
    description: 'Ilumina o caminho até Metus, o Guia das Almas.',
    unlockLevel: 30,
    color: '#94a3b8',
    missionType: 'focus',
    missionTarget: 120 * 60_000,
    missionDetail: '120 minutos de Imersão (Trabalho, Leitura ou Arte) para resistir aos guias espectrais.',
    lore: 'Metus guia espíritos através dos planos sombrios. Encontrá-lo significa fazer um pacto com o próprio reino dos mortos.',
    environment: 'Floresta etérea habitada por espíritos, lua cheia suspensa, árvores antigas e sussurros ancestrais.',
    difficulty: 4
  },
  {
    id: 'key_beru',
    bossId: 'beru_ant_king',
    name: 'Cristal da Ilha de Jeju',
    description: 'Um fragmento de pura aura negra. O Rei das Formigas aguarda.',
    unlockLevel: 40,
    color: '#a855f7',
    missionType: 'training',
    missionTarget: 200,
    missionDetail: '200 burpees (ou equivalente em exercícios intensos de cardio/crossfit). Ganha a velocidade de Beru.',
    lore: 'Beru, o Rei das Formigas Mágicas, comanda um império subterrâneo. É dito ser mais poderoso que qualquer amo até agora encontrado.',
    environment: 'Caverna imensa com colónias de formigas, câmaras cristalinas, e rainha monstruosa.',
    difficulty: 5
  },
  {
    id: 'key_kamish',
    bossId: 'kamish_calamity',
    name: 'Escama da Pior Calamidade',
    description: 'Aura draconiana intensa. Invoca Kamish, o maior flagelo.',
    unlockLevel: 50,
    color: '#f97316',
    missionType: 'gps',
    missionTarget: 5000,
    missionDetail: 'Caminha ou corre 5km ininterruptos (ou pedala 15km) para escapar ao Sopro de Fogo.',
    lore: 'Kamish é a Pior Calamidade — um dragão corrupto capaz de destruir cidades. Sua escama queima com poder cataclísmico.',
    environment: 'Ruínas de civilizações destruídas, paisagem queimada, céu escuro com chuva de fogo.',
    difficulty: '???'
  },
  {
    id: 'key_statue_god',
    bossId: 'statue_of_god',
    name: 'Chave do Templo Duplo',
    description: 'Levar-te-á de volta onde tudo começou. A Estátua Observa.',
    unlockLevel: 70,
    color: '#fbbf24',
    missionType: 'focus',
    missionTarget: 150 * 60_000,
    missionDetail: '150 minutos a executar a tua tarefa mais importante em silêncio e imobilidade absoluta.',
    lore: 'Uma Estátua Divina guarda o conhecimento primordial. Diz-se que está conectada ao próprio destino do caçador.',
    environment: 'Templo antigo com suas duas câmaras espelhadas, ouro e mármore, e uma aura transcendental.',
    difficulty: '???'
  },
  {
    id: 'key_ashborn',
    bossId: 'ashborn_shadow_monarch',
    name: 'Coração Negro Genuíno',
    description: 'A prova final. O verdadeiro Monarca das Sombras testa o teu valor.',
    unlockLevel: 100,
    color: '#000000',
    missionType: 'focus',
    missionTarget: 240 * 60_000,
    missionDetail: '4 horas de Deep Work (Foco Profundo). Só a disciplina absoluta forja um verdadeiro Herdeiro.',
    lore: 'Ashborn, o Verdadeiro Monarca das Sombras. Lenda suprema. O último teste antes de se tornar imortal.',
    environment: 'Dimensão paralela de sombra pura, onde luz não existe. Poder absoluto concentrado num ponto.',
    difficulty: '???'
  }
]

// Box-exclusive keys: can only be found in loot boxes
export const BOX_KEYS: DungeonKey[] = [
  {
    id: 'key_dracula',
    bossId: 'dracula_vampire_lord',
    name: 'Cálice de Sangue Frio',
    description: 'Sacia a sede daquele que habita no castelo esquecido.',
    isBoxExclusive: true,
    color: '#991b1b',
    missionType: 'focus',
    missionTarget: 120 * 60_000,
    missionDetail: 'Medita rigorosamente por 2 horas ou faz Jejum Digital total durante a noite.',
    lore: 'Drácula, o Vampiro Eterno. Sua sede de sangue é insaciável. Atravessou milênios em escuridão.',
    environment: 'Castelo gótico decadente, salões cheios de teias, sangue seco nas paredes, morcegos voando eternamente.',
    difficulty: '???'
  },
  {
    id: 'key_cthulhu',
    bossId: 'cthulhu_mad_god',
    name: 'Ídolo Partido de R\u0027lyeh',
    description: 'Sussurros ecoam da sua superfície. Cthulhu desperta.',
    isBoxExclusive: true,
    color: '#047857',
    missionType: 'focus',
    missionTarget: 180 * 60_000,
    missionDetail: '3 horas de Foco Exclusivo numa só tarefa crítica profunda. Rejeita o ruído mental.',
    lore: 'Cthulhu, Deus Adormecido. Sua existência quebra a razão. Quando acordar, mundos perecerão.',
    environment: 'Cidade submersa de R\'lyeh, arquitetura alienígena impossível, água antiga, sussurros de loucura cósmica.',
    difficulty: '???'
  },
  {
    id: 'key_sauron',
    bossId: 'sauron_dark_lord',
    name: 'Fragmento do Anel',
    description: 'O Senhor do Escuro consegue ver-te.',
    isBoxExclusive: true,
    color: '#f59e0b',
    missionType: 'training',
    missionTarget: 150,
    missionDetail: '150 Elevações (Pull-ups) ou exercícios intensos para costas/braços. Forja a tua vontade.',
    lore: 'Sauron, Senhor Sombrio. Su poder é absoluto. Seu anel controla tudo ao seu redor.',
    environment: 'Torre de Barad-dûr, chamas infernais, olho gigante observando, terra devastada abaixo.',
    difficulty: '???'
  },
  {
    id: 'key_sun_wukong',
    bossId: 'sun_wukong_celestial',
    name: 'Coroa de Ouro Voadora',
    description: 'O Rei Macaco desafia-te para um duelo nos céus.',
    isBoxExclusive: true,
    color: '#fbbf24',
    missionType: 'gps',
    missionTarget: 10000,
    missionDetail: 'Percorre 10km (Corrida, Caminhada Acelerada ou equivalente de bicicleta/natação) nos céus ou em terreno variado.',
    lore: 'Sun Wukong, Rei Macaco Celestial. Invencível, malabarista de nuvens, senhor de setenta-duas transformações.',
    environment: 'Montanha do Pêssego Celestial, nuvens douradas, criadores observando, tempestade mágica constante.',
    difficulty: '???'
  },
  {
    id: 'key_kratos_ghost',
    bossId: 'kratos_ghost_sparta',
    name: 'Cinzas de Esparta',
    description: 'Uma chave de raiva pura. Invoca o assassino de deuses.',
    isBoxExclusive: true,
    color: '#dc2626',
    missionType: 'training',
    missionTarget: 300,
    missionDetail: '300 repetições acumuladas de exercícios de força (Flexões, Agachamentos e Abdominais) ou 1h de desporto intenso (Futebol, Basket, Ginásio).',
    lore: 'Kratos, o Fantasma de Esparta. Deuses caíram sob sua fúria. Sua sede de vingança nunca foi saciada.',
    environment: 'Ruínas de templos antigos, cinzas vulcânicas, deuses derrotados espalhados, raiva materializada no ar.',
    difficulty: '???'
  },
  {
    id: 'key_orc',
    bossId: 'kargalgan_shaman',
    name: 'Fragmento de Chama Orc',
    description: 'Uma chave forjada em fogo orc. Dá acesso ao território dos Orcs de Fogo.',
    isBoxExclusive: true,
    color: '#f97316',
    missionType: 'training' as const,
    missionTarget: 80,
    missionDetail: '80 agachamentos explosivos para resistir à força bruta dos Orcs de Fogo.',
    lore: 'Os Orcs de Fogo habitam territórios vulcânicos, forjando armas em lava. A sua chama nunca se apaga.',
    environment: 'Planície de lava com crateras abertas, Orcs a forjar metal fundido, calor insuportável.',
    difficulty: 2 as const,
  },
  // ── NEW BOX EXCLUSIVE KEYS (BATCH 2) ──────────────────────────────────────
  {
    id: 'key_basilisk',
    bossId: 'key_boss_basilisk',
    name: 'Olho do Basilisco Petrificado',
    description: 'Um ídolo que paralisa os fracos. Dá acesso ao covil do Basilisco.',
    isBoxExclusive: true, color: '#84cc16',
    missionType: 'focus', missionTarget: 60 * 60_000,
    missionDetail: '60 min de foco total em silêncio absoluto para resistir ao olhar do Basilisco.',
    lore: 'Basilisco, a Rainha das Serpentes. Seu contato paralisa. Um olho pode congelar a vida em pedra.',
    environment: 'Covil subterrâneo vasto, ovos gigantes, veneno que corrói rocha, fria e úmida eternamente.',
    difficulty: 4
  },
  {
    id: 'key_manticore',
    bossId: 'key_boss_manticore',
    name: 'Ferrão de Manticora Gélido',
    description: 'Aura venenosa e instintiva. Atrai a Manticora do Abismo.',
    isBoxExclusive: true, color: '#ef4444',
    missionType: 'training', missionTarget: 120,
    missionDetail: '120 repetições de exercícios explosivos para acompanhar a agilidade da Manticora.',
    lore: 'Manticora, Besta Venenosa do Abismo. Seu ferrão mata com uma gota. Instinto puro de predador.',
    environment: 'Abismo cavernoso profundo, ossos de vítimas no chão, veneno gotejando, besta gigante esticando as asas.',
    difficulty: 4
  },
  {
    id: 'key_phoenix',
    bossId: 'key_boss_phoenix_rebirth',
    name: 'Pena Eternamente em Chamas',
    description: 'Fogo que não se apaga. Convoca a Fénix da Renascença Sombria.',
    isBoxExclusive: true, color: '#ea580c',
    missionType: 'focus', missionTarget: 90 * 60_000,
    missionDetail: '90 min de foco produtivo profundo para renascer das tuas próprias cinzas.',
    lore: 'A Fénix Sombria renascer-se a cada mil anos. Seu poder queima tudo. Dizem que derrotá-la traz renascimento.',
    environment: 'Pira de fogo eterno, cinzas volantes, e labaredas que queimam sem consumir.',
    difficulty: 4
  },
  {
    id: 'key_beholder',
    bossId: 'key_boss_beholder_eye',
    name: 'Lente de Observação do Caos',
    description: 'Vê através de todas as mentiras. O Observador aguarda.',
    isBoxExclusive: true, color: '#a855f7',
    missionType: 'focus', missionTarget: 75 * 60_000,
    missionDetail: '75 min de estudo intenso ou leitura técnica sob o olhar vigilante.',
    lore: 'O Beholder observa todas as realidades. Dez mil olhos veem tudo. A verdade espera-se para aquele que conseguir resistir.',
    environment: 'Sala flutuante no vazio, olhos gigantes em todas as paredes, espaço que não segue geometria normal.',
    difficulty: '???'
  },
  {
    id: 'key_demon_astaroth',
    bossId: 'key_boss_demon_prince_astaroth',
    name: 'Sigilo de Astaroth',
    description: 'O símbolo da realeza demoníaca. Invoca o Príncipe do Medo.',
    isBoxExclusive: true, color: '#b91c1c',
    missionType: 'training', missionTarget: 150,
    missionDetail: '150 flexões de braços para forjar a força necessária para enfrentar um Príncipe Demónio.',
    lore: 'Astaroth, Príncipe do Medo. Sua presença traz pesadelos à realidade. Confrontá-lo significaria vencer o próprio medo.',
    environment: 'Castelo demoníaco escuro, chamas vermelhas, sussurros de almas presas, ar sufocante de malignidade.',
    difficulty: 4
  },
  {
    id: 'key_undead_dragon',
    bossId: 'key_boss_undead_dragon_king',
    name: 'Crânio de Serpe espectral',
    description: 'Restos de um dragão que se recusou a morrer. O Rei Dragão aguarda.',
    isBoxExclusive: true, color: '#475569',
    missionType: 'focus', missionTarget: 120 * 60_000,
    missionDetail: '2 horas de imersão total em trabalho ou criação complexa.',
    lore: 'Um dragão antigo que desafiou o próprio destino. Morte não o venceu. Sua fúria ressoa através dos séculos.',
    environment: 'Ruinas de castelo antigo, ossos gigantescos, necromancia e ar gelado que esfria a alma.',
    difficulty: 5
  },
  {
    id: 'key_titania',
    bossId: 'key_boss_titania_queen_dark',
    name: 'Asa de Fada Corrompida',
    description: 'Beleza distorcida e magia negra. A Rainha Titania desafia-te.',
    isBoxExclusive: true, color: '#fb7185',
    missionType: 'gps', missionTarget: 7000,
    missionDetail: '7km de marcha ritual para atravessar o jardim corrompido.',
    lore: 'Titania, Rainha das Fadas, corrompida pelo poder escuro. Sua corte é um pesadelo de beleza e horror.',
    environment: 'Jardim de flores que sugam energia, luz distorcida, magia negra visível flutuando entre as árvores.',
    difficulty: 4
  },
  {
    id: 'key_anubis',
    bossId: 'key_boss_anubis_guardian_soul',
    name: 'Pesagem do Coração de Ouro',
    description: 'A prova da verdade. Anúbis aguarda por julgamento.',
    isBoxExclusive: true, color: '#facc15',
    missionType: 'focus', missionTarget: 100 * 60_000,
    missionDetail: '100 min de foco reflexivo ou reflexão profunda sobre os teus objetivos.',
    lore: 'Anúbis, Juiz das Almas. Seu julgamento é justo e irrevogável. Apenas aquele com coração puro pode passar.',
    environment: 'Câmara do julgamento com escala de ouro, hieróglifos antigos brilhando, luz sobrenatural dourada.',
    difficulty: 3
  },
  {
    id: 'key_cerberus',
    bossId: 'key_boss_cerberus_gate_final',
    name: 'Coleira do Porteiro',
    description: 'Três cabeças, uma intenção: Impedir a tua passagem.',
    isBoxExclusive: true, color: '#dc2626',
    missionType: 'training', missionTarget: 200,
    missionDetail: '200 agachamentos livres para fortalecer as pernas contra as três mandíbulas.',
    lore: 'Cérbero, o Porteiro do Inferno. Com três cabeças e força titânica, nada passa sem sua permissão.',
    environment: 'Portão do inferno, correntes ancestrais, fogo e fumaça, as três cabeças rosnam eternamente.',
    difficulty: 5
  },
  {
    id: 'key_medusa',
    bossId: 'key_boss_medusa_queen_gaze',
    name: 'Escama de Serpente de Pedra',
    description: 'A pele daquela que transforma Heróis em estátuas.',
    isBoxExclusive: true, color: '#22c55e',
    missionType: 'focus', missionTarget: 150 * 60_000,
    missionDetail: '150 min de foco inamóvel. Não pestanejes perante o trabalho árduo.',
    lore: 'Medusa, cujo olhar petrifica. Condenada à solidão, sua fúria cresce com cada vítima que congela em pedra.',
    environment: 'Caverna cheia de estátuas humanas, serpentes na cabeça de Medusa, piso de pedra, escuridão opressiva.',
    difficulty: 4
  },
  {
    id: 'key_hydra_ancient',
    bossId: 'key_boss_hydra_ancient_world',
    name: 'Sangue da Hidra Primordial',
    description: 'Um veneno que corroi o próprio tempo. A Hidra Proibida desperta.',
    isBoxExclusive: true, color: '#0ea5e9',
    missionType: 'training', missionTarget: 250,
    missionDetail: '250 Burpees ou exercícios de cardio intenso para queimar o veneno no sangue.',
    lore: 'A Hidra Primordial com cem cabeças. Cada que tu cortas, duas crescem. Luto infinito e regeneração eterna.',
    environment: 'Pântano antigo com água tóxica, neblina verde venenosa, cabeças da Hidra saíndo da água.',
    difficulty: '???'
  },
  {
    id: 'key_fenrir',
    bossId: 'key_boss_fenrir_wolf_star',
    name: 'Corrente Quebrada de Gleipnir',
    description: 'Aquilo que prendia o Devorador de Estrelas foi rompido.',
    isBoxExclusive: true, color: '#f97316',
    missionType: 'gps', missionTarget: 10000,
    missionDetail: '10km de corrida para escapar às mandíbulas que devoram o céu.',
    lore: 'Fenrir, o Lobo Devorador. Encadeado desde os primórdios, agora livre. Seu apetite é infinito.',
    environment: 'Montanhas nórdicas, neve eterna, lobo titânico rasgando o pano da realidade, céu em chamas.',
    difficulty: '???'
  },
  {
    id: 'key_odin',
    bossId: 'key_boss_odin_simulation_valhalla',
    name: 'Lança Gungnir Simulada',
    description: 'Um fragmento de código de um Deus. Odin observa o Sistema.',
    isBoxExclusive: true, color: '#facc15',
    missionType: 'focus', missionTarget: 180 * 60_000,
    missionDetail: '3 horas de Deep Work absoluto (Foco nível National) para provar o teu valor em Valhalla.',
    lore: 'Odin, o Deus da Sabedoria. Sacrificou um olho por conhecimento. Seu poder atravessa mundos.',
    environment: 'Hall de Valhala com guerreiros eternos, trono dourado, Gungnir brilhando, realidade se descosendo.',
    difficulty: '???'
  },
  {
    id: 'key_zeus',
    bossId: 'key_boss_zeus_simulation_olympus',
    name: 'Relâmpago do Olimpo Digital',
    description: 'Pura energia condensada. O Senhor do Olimpo invoca-te.',
    isBoxExclusive: true, color: '#60a5fa',
    missionType: 'training', missionTarget: 300,
    missionDetail: '300 repetições de exercícios de calistenia ou 1h30 de desporto de alta intensidade.',
    lore: 'Zeus, Rei dos Deuses. Ele controla relâmpago e tempestades. Seu poder é absoluto no Olimpo.',
    environment: 'Topo do Olimpo com relâmpagos constantes, trono de ouro, deuses observando, céu em tempestade.',
    difficulty: '???'
  },
  {
    id: 'key_cthulhu_spawn',
    bossId: 'key_boss_cthulhu_spawn_outer',
    name: 'Medalhão do Infinito Inominável',
    description: 'Um objeto que não devia existir. A Prole do Vazio aproxima-se.',
    isBoxExclusive: true, color: '#047857',
    missionType: 'focus', missionTarget: 240 * 60_000,
    missionDetail: '4 horas de foco ininterrupto em tarefas que desafiem a tua sanidade mental.',
    lore: 'Descendente de Cthulhu. Sua existência não obedece lógica. A realidade falha perto dele.',
    environment: 'Dimensão paralela impossível, geometria que quebra a mente, sussurros de loucura, nada faz sentido.',
    difficulty: '???'
  },
  // ── DISCOVERED DUNGEON KEYS — Portais selados de criaturas antigas ──────────
  {
    id: 'key_alpha_wolf',
    bossId: 'alpha_wolf',
    name: 'Presa do Lobo Alfa',
    description: 'O canino de um predador que dominou uma alcateia inteira de dungeon.',
    isBoxExclusive: true,
    color: '#22c55e',
    missionType: 'training',
    missionTarget: 80,
    missionDetail: '80 repetições de exercícios de força (Flexões + Agachamentos) para merecer o respeito da alcateia.',
    lore: 'O Lobo Alfa dominou a alcateia do dungeon através de pura brutalidade e instinto. Nenhum caçador sobreviveu para contar a história — apenas a presa ficou para trás.',
    environment: 'Floresta densa e sombria, uivos constantes, chão coberto de pegadas imensas, luz filtrada pela copa fechada.',
    difficulty: 3,
  },
  {
    id: 'key_sea_king',
    bossId: 'sea_king',
    name: 'Escama do Rei dos Abismos',
    description: 'Uma escama iridescente de um ser que governa os mares sombrios.',
    isBoxExclusive: true,
    color: '#0ea5e9',
    missionType: 'gps',
    missionTarget: 8000,
    missionDetail: '8km em terreno variado (corrida ou caminhada rápida) para simular as correntes abissais.',
    lore: 'O Rei do Mar Sombrio governa os corredores subaquáticos com crueldade absoluta. Dizem que o seu rugido provoca tsunamis nos planos mortais.',
    environment: 'Dungeon subaquático, corredores de pedra cobertos de bioluminescência, pressão colossal, silêncio mortal.',
    difficulty: 4,
  },
  {
    id: 'key_dungeon_queen',
    bossId: 'dungeon_queen',
    name: 'Véu da Rainha Velada',
    description: 'Tecido de névoa solidificada. A Rainha do Dungeon sente a tua chegada.',
    isBoxExclusive: true,
    color: '#3b82f6',
    missionType: 'focus',
    missionTarget: 90 * 60_000,
    missionDetail: '90 minutos de foco absoluto — a mente deve ser impenetrável ao olhar da Rainha.',
    lore: 'A Rainha do Dungeon Velado comanda legiões com telecinese. O seu olhar paralisa a vontade. Apenas a concentração absoluta protege a mente do caçador.',
    environment: 'Castelo suspenso na névoa, câmaras flutuantes no vazio, trono de cristal negro, silêncio opressivo que esmaga.',
    difficulty: 4,
  },
  {
    id: 'key_king_of_the_dead',
    bossId: 'king_of_the_dead',
    name: 'Coroa do Rei dos Mortos',
    description: 'Uma coroa de osso negro que irradia poder necromântico. Ativa a cripta mais profunda.',
    isBoxExclusive: true,
    color: '#64748b',
    missionType: 'focus',
    missionTarget: 120 * 60_000,
    missionDetail: '2 horas de imersão total em silêncio — enfrenta o tribunal dos mortos sem fraquejar.',
    lore: 'O Rei dos Mortos governa aqueles que se recusaram a aceitar a morte. A sua cripta é um labirinto de almas presas. Entrar é fácil. Sair é o teste.',
    environment: 'Cripta ancestral de pedra negra, almas flutuantes, chão coberto de cinzas, ar que congela os pulmões.',
    difficulty: 5,
  },
  {
    id: 'key_crypt_omega',
    bossId: 'boss_crypt_omega',
    name: 'Teia de Seda Negra da Cripta',
    description: 'Tecida com veneno solidificado. A Aranha Ômega sente a tua presença.',
    isBoxExclusive: true,
    color: '#f59e0b',
    missionType: 'training',
    missionTarget: 180,
    missionDetail: '180 repetições explosivas (Burpees, Agachamentos, Flexões) para resistir à teia da Cripta.',
    lore: 'A Aranha Ômega governa as profundezas da Cripta. As suas teias são feitas de desespero solidificado. Nenhum caçador sobreviveu à câmara central.',
    environment: 'Caverna de cristal negro coberta de teias imensas, ovos pulsando, veneno escorrendo do teto em fios dourados.',
    difficulty: '???',
  },
  {
    id: 'key_seraphim_fallen',
    bossId: 'boss_seraphim',
    name: 'Pena de Asa Decepada',
    description: 'Uma pena negra de seis asas destruídas. Convoca o Serafim que caiu.',
    isBoxExclusive: true,
    color: '#a855f7',
    missionType: 'focus',
    missionTarget: 150 * 60_000,
    missionDetail: '150 minutos de foco — o Serafim testa a pureza da tua mente antes do combate.',
    lore: 'Um Serafim que desafiou o próprio Sistema e perdeu tudo. As suas asas decepadas carregam o peso de um poder que nunca devia ter sido corrompido.',
    environment: 'Dimensão partida, luz fragmentada em prismas negros, penas flutuando no vazio, silêncio sobrenatural total.',
    difficulty: '???',
  },
]

export const ALL_DUNGEON_KEYS = [...LEVEL_GATED_KEYS, ...BOX_KEYS]

export function getKeyByBossId(bossId: string) {
  return ALL_DUNGEON_KEYS.find(k => k.bossId === bossId)
}

export function getKeyById(id: string) {
  return ALL_DUNGEON_KEYS.find(k => k.id === id)
}
