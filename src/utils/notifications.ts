/**
 * Notification helpers using @notifee/react-native.
 * Channel is created once; functions are safe to call from JS side.
 */
import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native'

const CHANNEL_ID = 'solo_leveling'

// ── Setup ──────────────────────────────────────────────────────────────────────

export async function setupNotifications(): Promise<void> {
  await notifee.createChannel({
    id:          CHANNEL_ID,
    name:        'Solo Leveling',
    importance:  AndroidImportance.HIGH,
    vibration:   true,
    vibrationPattern: [300, 500],
  })
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission()
  return settings.authorizationStatus >= 1
}

// ── Immediate notifications ────────────────────────────────────────────────────

export async function notifyFocusComplete(questLabel: string): Promise<void> {
  await notifee.displayNotification({
    title: '⚡ Foco Concluído!',
    body:  `"${questLabel}" terminado, Hunter. Recolhe o teu XP e Gold.`,
    android: {
      channelId:   CHANNEL_ID,
      smallIcon:   'ic_launcher',
      pressAction: { id: 'default' },
    },
  })
}

export async function notifyLevelUp(newLevel: number): Promise<void> {
  await notifee.displayNotification({
    title: `🎖 LEVEL UP — Nível ${newLevel}!`,
    body:  'Os teus atributos aumentaram. Continua, Hunter.',
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
    },
  })
}

// ── Scheduled trigger ─────────────────────────────────────────────────────────
// Fires even if the app is in background/closed.

let pendingTriggerNotifId: string | null = null

export async function scheduleFocusCompletionNotification(
  delayMs: number,
  questLabel: string
): Promise<void> {
  // Cancel any previous pending trigger
  await cancelFocusNotification()

  const trigger: TimestampTrigger = {
    type:      TriggerType.TIMESTAMP,
    timestamp: Date.now() + delayMs,
  }

  pendingTriggerNotifId = await notifee.createTriggerNotification(
    {
      title: '⚡ Foco Concluído!',
      body:  `"${questLabel}" terminado, Hunter. Recolhe o teu XP e Gold.`,
      android: {
        channelId:   CHANNEL_ID,
        smallIcon:   'ic_launcher',
        pressAction: { id: 'default' },
      },
    },
    trigger
  )
}

export async function cancelFocusNotification(): Promise<void> {
  if (pendingTriggerNotifId) {
    await notifee.cancelTriggerNotification(pendingTriggerNotifId)
    pendingTriggerNotifId = null
  }
}

// ── System daily warnings ──────────────────────────────────────────────────────
// Three escalating reminders to complete missions before midnight.
// Each slot has a fixed ID so re-scheduling is idempotent and cancellation
// is precise — no need to track dynamic IDs at runtime.

const WARNING_SLOTS = [
  {
    id:   'warning-18',
    hour: 18, minute: 0,
    body: 'O Sistema vigia-te. Ainda tens missões por completar, Hunter.',
  },
  {
    id:   'warning-20',
    hour: 20, minute: 0,
    body: 'Aviso do Sistema: Faltam 4 horas. Completa as missões ou enfrentarás a Penalidade.',
  },
  {
    id:   'warning-23',
    hour: 23, minute: 0,
    body: 'ALERTA: 1 hora restante! O teu tempo está a esgotar-se, Caçador.',
  },
] as const

export async function scheduleSystemWarnings(): Promise<void> {
  const now = Date.now()

  for (const slot of WARNING_SLOTS) {
    const fire = new Date()
    fire.setHours(slot.hour, slot.minute, 0, 0)

    // Skip slots that have already passed today — never schedule in the past
    if (fire.getTime() <= now) continue

    const trigger: TimestampTrigger = {
      type:      TriggerType.TIMESTAMP,
      timestamp: fire.getTime(),
    }

    // Using a fixed `id` means notifee overwrites any existing scheduled
    // notification with the same id, making this call fully idempotent.
    await notifee.createTriggerNotification(
      {
        id:    slot.id,
        title: '⚠ Aviso do Sistema',
        body:  slot.body,
        android: {
          channelId:   CHANNEL_ID,
          smallIcon:   'ic_launcher',
          importance:  AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
      },
      trigger
    )
  }
}

export async function cancelSystemWarnings(): Promise<void> {
  await Promise.all(
    WARNING_SLOTS.map(slot => notifee.cancelTriggerNotification(slot.id))
  )
}
