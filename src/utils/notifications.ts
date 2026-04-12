/**
 * Notification helpers using @notifee/react-native.
 * Channel is created once; functions are safe to call from JS side.
 */
import notifee, {
  AndroidImportance,
  TriggerType,
  TimestampTrigger,
} from '@notifee/react-native';
import i18n from '../i18n';

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
    title: i18n.t('notifications.focus_complete_title', { ns: 'store' }),
    body:  i18n.t('notifications.focus_complete_body', { ns: 'store', questLabel }),
    android: {
      channelId:   CHANNEL_ID,
      smallIcon:   'ic_launcher',
      pressAction: { id: 'default' },
    },
  });
}

export async function notifyLevelUp(newLevel: number): Promise<void> {
  await notifee.displayNotification({
    title: i18n.t('notifications.level_up_title', { ns: 'store', newLevel }),
    body:  i18n.t('notifications.level_up_body', { ns: 'store' }),
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
    title: i18n.t('notifications.ongoing_mission_title', { ns: 'store' }),
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
      title: i18n.t('notifications.focus_complete_title', { ns: 'store' }),
      body:  i18n.t('notifications.focus_complete_body', { ns: 'store', questLabel }),
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
    title: i18n.t('notifications.pomodoro_break_title', { ns: 'store', cycle }),
    body: i18n.t('notifications.pomodoro_break_body', { ns: 'store', breakMins }),
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
      title: i18n.t('notifications.pomodoro_work_title', { ns: 'store', nextCycle }),
      body: i18n.t('notifications.pomodoro_work_body', { ns: 'store' }),
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
      title: i18n.t('notifications.side_quest_reminder_title', { ns: 'store' }),
      body:  i18n.t('notifications.side_quest_reminder_body', { ns: 'store', title }),
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
        title: i18n.t('notifications.system_warning_title', { ns: 'store' }),
        body:  i18n.t('notifications.system_warning_final_body', { ns: 'store' }),
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
