import { RAID_BOSSES, RaidBossDef } from './bosses'

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
    missionDetail: '50 flexões de braços (ou variações adaptadas) para forjar resistência ao veneno.'
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
    missionDetail: '60 minutos de Foco Produtivo ou Estudo Ininterrupto para sobreviver à tempestade de neve.'
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
    missionDetail: '100 agachamentos livres pesados para esmagar as maldições dos orcs.'
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
    missionDetail: '90 minutos de Foco Total no Trabalho ou Estudo (sem distrações) no calor escaldante.'
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
    missionDetail: '120 minutos de Imersão (Trabalho, Leitura ou Arte) para resistir aos guias espectrais.'
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
    missionDetail: '200 burpees (ou equivalente em exercícios intensos de cardio/crossfit). Ganha a velocidade de Beru.'
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
    missionDetail: 'Caminha ou corre 5km ininterruptos (ou pedala 15km) para escapar ao Sopro de Fogo.'
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
    missionDetail: '150 minutos a executar a tua tarefa mais importante em silêncio e imobilidade absoluta.'
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
    missionDetail: '4 horas de Deep Work (Foco Profundo). Só a disciplina absoluta forja um verdadeiro Herdeiro.'
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
    missionDetail: 'Medita rigorosamente por 2 horas ou faz Jejum Digital total durante a noite.'
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
    missionDetail: '3 horas de Foco Exclusivo numa só tarefa crítica profunda. Rejeita o ruído mental.'
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
    missionDetail: '150 Elevações (Pull-ups) ou exercícios intensos para costas/braços. Forja a tua vontade.'
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
    missionDetail: 'Percorre 10km (Corrida, Caminhada Acelerada ou equivalente de bicicleta/natação) nos céus ou em terreno variado.'
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
    missionDetail: '300 repetições acumuladas de exercícios de força (Flexões, Agachamentos e Abdominais) ou 1h de desporto intenso (Futebol, Basket, Ginásio).'
  }
]

export const ALL_DUNGEON_KEYS = [...LEVEL_GATED_KEYS, ...BOX_KEYS]

export function getKeyByBossId(bossId: string) {
  return ALL_DUNGEON_KEYS.find(k => k.bossId === bossId)
}

export function getKeyById(id: string) {
  return ALL_DUNGEON_KEYS.find(k => k.id === id)
}
