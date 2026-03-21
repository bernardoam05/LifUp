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
