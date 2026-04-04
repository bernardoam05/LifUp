/**
 * Notification helpers using @notifee/react-native.
 * Channel is created once; functions are safe to call from JS side.
 */
import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';

const CHANNEL_ID = 'lifup';

// ── Setup ──────────────────────────────────────────────────────────────────────

export async function setupNotifications(): Promise<void> {
  await notifee.createChannel({
    id:          CHANNEL_ID,
    name:        'LifUp',
    importance:  AndroidImportance.HIGH,
    sound:       'default',
    vibration:   true,
    vibrationPattern: [300, 500],
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission();
  return settings.authorizationStatus >= 1;
}

// ── Immediate notifications ────────────────────────────────────────────────────

export async function notifyFocusComplete(questLabel: string): Promise<void> {
  await notifee.displayNotification({
    title: 'Foco Concluído',
    body:  `O foco na missão "${questLabel}" foi concluído. Recolhe as tuas recompensas.`,
    android: {
      channelId:   CHANNEL_ID,
      smallIcon:   'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

export async function notifyLevelUp(newLevel: number): Promise<void> {
  await notifee.displayNotification({
    title: `EVOLUÇÃO — Nível ${newLevel}`,
    body:  'Os teus atributos foram atualizados pelo Sistema.',
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
    },
  });
}

// ── Ongoing Mission (Pinned Chronometer) ─────────────────────────────────────

const ONGOING_NOTIF_ID = 'ongoing_mission';

export async function showOngoingMissionNotification(questLabel: string, startedAtMs: number): Promise<void> {
  await notifee.displayNotification({
    id: ONGOING_NOTIF_ID,
    title: ' Missão a Decorrer',
    body: questLabel,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      ongoing: true,
      showChronometer: true,
      chronometerDirection: 'up',
      timestamp: startedAtMs,
      pressAction: { id: 'default' },
    },
  });
}

export async function clearOngoingMissionNotification(): Promise<void> {
  await notifee.cancelNotification(ONGOING_NOTIF_ID);
}

// ── Scheduled trigger ─────────────────────────────────────────────────────────
// Fires even if the app is in background/closed.

let pendingTriggerNotifId: string | null = null;

export async function scheduleFocusCompletionNotification(
  delayMs: number,
  questLabel: string
): Promise<void> {
  // Cancel any previous pending trigger
  await cancelFocusNotification();

  const trigger: TimestampTrigger = {
    type:      TriggerType.TIMESTAMP,
    timestamp: Date.now() + delayMs,
  };

  pendingTriggerNotifId = await notifee.createTriggerNotification(
    {
      title: 'Foco Concluído',
      body:  `O foco na missão "${questLabel}" foi concluído. Recolhe as tuas recompensas.`,
      android: {
        channelId:   CHANNEL_ID,
        smallIcon:   'ic_launcher',
        pressAction: { id: 'default' },
      },
    },
    trigger
  );
}

export async function cancelFocusNotification(): Promise<void> {
  if (pendingTriggerNotifId) {
    await notifee.cancelTriggerNotification(pendingTriggerNotifId);
    pendingTriggerNotifId = null;
  }
}

// ── Pomodoro notifications ─────────────────────────────────────────────────────

const POMODORO_BREAK_END_ID = 'pomodoro_break_end';

/** Immediate notification when a work cycle ends and break starts. */
export async function notifyPomodoroBreakStarted(cycle: number, breakMins: number): Promise<void> {
  await notifee.displayNotification({
    title: `CICLO ${cycle} CONCLUÍDO — PAUSA`,
    body: `Pausa de ${breakMins} min iniciada. Descansa e volta ao trabalho.`,
    android: {
      channelId: CHANNEL_ID,
      smallIcon: 'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

/** Scheduled notification that fires when the break ends, even in background. */
export async function schedulePomodoroBreakEndNotification(
  breakEndMs: number,
  nextCycle: number,
): Promise<void> {
  await notifee.cancelNotification(POMODORO_BREAK_END_ID);
  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: breakEndMs,
  };
  await notifee.createTriggerNotification(
    {
      id: POMODORO_BREAK_END_ID,
      title: `CICLO ${nextCycle} — HORA DE TRABALHAR`,
      body: 'A pausa terminou. O próximo ciclo Pomodoro está pronto.',
      android: {
        channelId: CHANNEL_ID,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

export async function cancelPomodoroNotifications(): Promise<void> {
  await notifee.cancelNotification(POMODORO_BREAK_END_ID);
}

export async function scheduleSideQuestNotification(
  id: string,
  delayMs: number,
  title: string
): Promise<void> {
  const trigger: TimestampTrigger = {
    type:      TriggerType.TIMESTAMP,
    timestamp: Date.now() + delayMs,
  };

  await notifee.createTriggerNotification(
    {
      id,
      title: 'Lembrete de Missão',
      body:  `A missão "${title}" ainda aguarda conclusão.`,
      android: {
        channelId:   CHANNEL_ID,
        smallIcon:   'ic_launcher',
        pressAction: { id: 'default' },
      },
    },
    trigger
  );
}

export async function cancelSideQuestNotification(id: string): Promise<void> {
  await notifee.cancelTriggerNotification(id);
}

// ── System daily warnings ──────────────────────────────────────────────────────
// Three escalating reminders to complete missions before midnight.
// Each slot has a fixed ID so re-scheduling is idempotent and cancellation
// is precise — no need to track dynamic IDs at runtime.

const WARNING_SLOTS = [
  {
    id:   'warning-final',
    hour: 21, minute: 0,
    body: 'Aviso Final: Completa as missões diárias antes da reativação do Sistema à meia-noite.',
  },
] as const;

export async function scheduleSystemWarnings(): Promise<void> {
  const now = Date.now();

  for (const slot of WARNING_SLOTS) {
    const fire = new Date();
    fire.setHours(slot.hour, slot.minute, 0, 0);

    // Skip slots that have already passed today — never schedule in the past
    if (fire.getTime() <= now) {continue;}

    const trigger: TimestampTrigger = {
      type:      TriggerType.TIMESTAMP,
      timestamp: fire.getTime(),
    };

    // Using a fixed `id` means notifee overwrites any existing scheduled
    // notification with the same id, making this call fully idempotent.
    await notifee.createTriggerNotification(
      {
        id:    slot.id,
        title: 'Aviso do Sistema',
        body:  slot.body,
        android: {
          channelId:   CHANNEL_ID,
          smallIcon:   'ic_launcher',
          importance:  AndroidImportance.HIGH,
          pressAction: { id: 'default' },
        },
      },
      trigger
    );
  }
}

export async function cancelSystemWarnings(): Promise<void> {
  await Promise.all(
    WARNING_SLOTS.map(slot => notifee.cancelTriggerNotification(slot.id))
  );
}
