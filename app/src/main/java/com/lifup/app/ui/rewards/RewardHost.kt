package com.lifup.app.ui.rewards

import androidx.compose.runtime.remember
import androidx.compose.runtime.mutableStateListOf
import kotlin.math.roundToInt
import com.lifup.app.ui.defTitle
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.MilitaryTech
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Reward
import com.lifup.app.domain.ToastKind
import com.lifup.app.domain.dismissReward
import com.lifup.app.ui.Feedback
import com.lifup.app.ui.LocalSnackbar
import com.lifup.app.ui.Sfx
import com.lifup.app.ui.accentRank
import com.lifup.app.ui.act
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.content
import com.lifup.app.ui.hero.ShadowTile
import com.lifup.app.ui.hunterTitle
import com.lifup.app.ui.local
import com.lifup.app.ui.passiveText
import com.lifup.app.domain.Rules
import com.lifup.app.ui.shadowRankColor
import com.lifup.app.ui.shadowRankName
import com.lifup.app.ui.theme.Lif

/** Shows pending rewards one at a time: dialogs for big moments, snackbars for small notices. */
@Composable
fun RewardHost(s: GameState) {
    val context = LocalContext.current
    val snackbar = LocalSnackbar.current
    val toast = s.rewards.firstOrNull { it is Reward.Toast } as Reward.Toast?
    val toastText = toast?.let { toastMessage(s, it) }
    LaunchedEffect(toast?.id) {
        if (toast != null && toastText != null) {
            snackbar.showSnackbar(toastText)
            act { dismissReward(toast.id) }
        }
    }

    val revealed = remember { mutableStateListOf<Long>() }
    val reward = s.rewards.firstOrNull { it !is Reward.Toast } ?: return
    LaunchedEffect(reward.id) {
        when (reward) {
            is Reward.LevelUp, is Reward.RankUp, is Reward.StreakMilestone -> Feedback.play(context, Sfx.LEVEL)
            is Reward.BossDefeated, is Reward.AchievementUnlocked -> Feedback.play(context, Sfx.VICTORY)
            // Copies get a small cue; new common/rare echoes a bright one; rarer new echoes play during their reveal.
            is Reward.ShadowGained -> when {
                !reward.isNew -> Feedback.play(context, Sfx.QUEST)
                content.shadowById[reward.shadowId]?.deservesReveal() != true -> Feedback.play(context, Sfx.ECHO_NEW)
                else -> Unit
            }
            is Reward.DayReport -> if (reward.penalty != null && reward.penalty.absorbedBy == null) Feedback.play(context, Sfx.PENALTY)
            else -> Unit
        }
        Feedback.buzz(context, strong = !(reward is Reward.ShadowGained && !reward.isNew))
    }
    val revealDef = (reward as? Reward.ShadowGained)?.takeIf { it.isNew && it.id !in revealed }?.let { content.shadowById[it.shadowId] }?.takeIf { it.deservesReveal() }
    if (revealDef != null) {
        EchoReveal(revealDef) { revealed += reward.id }
        return
    }
    // Achievements unlocked by the same action share one card instead of queueing up.
    val batch = if (reward is Reward.AchievementUnlocked) s.rewards.filterIsInstance<Reward.AchievementUnlocked>() else listOf(reward)
    val dismiss = { act { batch.forEach { dismissReward(it.id) } } }
    Dialog(onDismissRequest = dismiss, properties = DialogProperties(usePlatformDefaultWidth = false)) {
        Box(Modifier.padding(24.dp)) {
            when (reward) {
                is Reward.LevelUp -> RewardCard(Icons.Rounded.Star, Lif.colors.accent, stringResource(R.string.reward_level_title), stringResource(R.string.level_n, reward.level), dismiss) {
                    Line(stringResource(R.string.reward_gold, reward.gold), Lif.colors.gold)
                    reward.items.forEach { Line("+ " + content.itemById[it]?.name?.local().orEmpty()) }
                }
                is Reward.RankUp -> RewardCard(Icons.Rounded.MilitaryTech, accentRank(reward.rank), stringResource(R.string.reward_rank_title), "${reward.rank.label} · ${stringResource(hunterTitle(reward.rank))}", dismiss) {
                    Line(stringResource(R.string.reward_rank_text), Lif.colors.muted)
                }
                is Reward.ShadowGained -> {
                    val def = content.shadowById[reward.shadowId]
                    RewardCard(null, def?.let { shadowRankColor(it.rank) } ?: Lif.colors.purple,
                        stringResource(if (reward.isNew) R.string.reward_shadow_new else R.string.reward_shadow_copy),
                        def?.name?.local().orEmpty(), dismiss) {
                        if (def != null) {
                            Box(Modifier.width(120.dp)) { ShadowTile(def, s.owned(def.id)?.level ?: 1) {} }
                            Spacer(Modifier.height(8.dp))
                            Line(stringResource(shadowRankName(def.rank)), shadowRankColor(def.rank))
                            Line(passiveText(def.passive, Rules.passiveValue(def, s.owned(def.id)?.level ?: 1)), Lif.colors.accent)
                            if (!reward.isNew) Line(stringResource(R.string.reward_copies, reward.copies), Lif.colors.muted)
                            reward.origin?.let { Line(echoReason(it, reward.originRef), Lif.colors.text) }
                        }
                    }
                }
                is Reward.BossDefeated -> RewardCard(Icons.Rounded.Whatshot, Lif.colors.red, stringResource(R.string.reward_boss_title), content.bossById[reward.bossId]?.title?.local().orEmpty(), dismiss) {
                    Line("+${reward.xp} XP", Lif.colors.accent)
                    Line(stringResource(R.string.reward_gold, reward.gold), Lif.colors.gold)
                    reward.items.forEach { Line("+ " + content.itemById[it]?.name?.local().orEmpty()) }
                }
                is Reward.AchievementUnlocked -> AchievementCard(batch.filterIsInstance<Reward.AchievementUnlocked>(), dismiss)
                is Reward.StreakMilestone -> RewardCard(Icons.Rounded.LocalFireDepartment, Lif.colors.red, stringResource(R.string.reward_streak_title), stringResource(R.string.days_in_a_row, reward.days), dismiss) {
                    if (reward.gold > 0) Line(stringResource(R.string.reward_gold, reward.gold), Lif.colors.gold)
                    reward.items.forEach { Line("+ " + content.itemById[it]?.name?.local().orEmpty()) }
                }
                is Reward.ChestOpened -> RewardCard(Icons.Rounded.Inventory2, Lif.colors.gold, stringResource(R.string.reward_chest_title), "", dismiss) {
                    if (reward.gold > 0) Line(stringResource(R.string.reward_gold, reward.gold), Lif.colors.gold)
                    if (reward.xp > 0) Line("+${reward.xp} XP", Lif.colors.accent)
                    reward.itemId?.let { Line("+ " + content.itemById[it]?.name?.local().orEmpty()) }
                }
                is Reward.DayReport -> DayReportCard(reward, dismiss)
                is Reward.WeekReport -> WeekReportCard(s, reward, dismiss)
                is Reward.Toast -> Unit
            }
        }
    }
}

@Composable
private fun DayReportCard(r: Reward.DayReport, dismiss: () -> Unit) {
    val c = Lif.colors
    val pen = r.penalty
    val (icon, color, title) = when {
        r.rest -> Triple(Icons.Rounded.Bedtime, c.purple, stringResource(R.string.report_rest))
        r.perfect -> Triple(Icons.Rounded.TaskAlt, c.green, stringResource(R.string.report_perfect))
        r.passed -> Triple(Icons.Rounded.TaskAlt, c.accent, stringResource(R.string.report_passed))
        pen != null && pen.absorbedBy != null -> Triple(Icons.Rounded.TaskAlt, c.purple, stringResource(R.string.report_absorbed))
        else -> Triple(Icons.Rounded.Warning, c.red, stringResource(R.string.report_failed))
    }
    RewardCard(icon, color, stringResource(R.string.report_title, r.day), title, dismiss) {
        Line(stringResource(R.string.report_done, r.done, r.total))
        if (r.bonusXp > 0) Line("+${r.bonusXp} XP", c.accent)
        if (pen != null) {
            if (pen.absorbedBy != null) {
                Line(stringResource(R.string.report_absorbed_by, content.shadowById[pen.absorbedBy]?.name?.local().orEmpty()), c.purple)
            } else {
                Line(stringResource(R.string.report_loss, pen.xpLost, pen.goldLost), c.red)
                if (pen.quests > 0) Line(stringResource(R.string.report_penalty_quests, pen.quests), c.red)
            }
        }
        r.streakSavedBy?.let { by ->
            val name = content.shadowById[by]?.name?.local() ?: content.itemById[by]?.name?.local() ?: by
            Line(stringResource(R.string.report_streak_saved, name), c.gold)
        }
        if (r.streakRestored) Line(stringResource(R.string.report_streak_restored), c.gold)
        Line(stringResource(R.string.report_streak, r.streak), if (r.streak > 0) c.red else c.muted)
    }
}

/** Sunday's look back: days kept, how it compares, the strongest and weakest mission. */
@Composable
private fun WeekReportCard(s: GameState, r: Reward.WeekReport, dismiss: () -> Unit) {
    val c = Lif.colors
    RewardCard(Icons.Rounded.CalendarMonth, c.accent, stringResource(R.string.week_title), stringResource(R.string.week_kept, r.daysKept, r.days), dismiss) {
        if (r.perfectDays > 0) Line(stringResource(R.string.week_perfect, r.perfectDays), c.green)
        if (r.restDays > 0) Line(stringResource(R.string.week_rest, r.restDays), c.purple)
        r.previousKept?.let { prev ->
            val diff = r.daysKept - prev
            Line(
                when { diff > 0 -> stringResource(R.string.week_better, diff); diff < 0 -> stringResource(R.string.week_worse, -diff); else -> stringResource(R.string.week_same) },
                if (diff >= 0) c.green else c.gold,
            )
        }
        r.bossId?.let { id ->
            val name = content.bossById[id]?.title?.local() ?: id
            Line(stringResource(if (r.bossDefeated) R.string.week_boss_won else R.string.week_boss_lost, name), if (r.bossDefeated) c.green else c.muted)
        }
        r.weekly.forEach { w ->
            val met = w.done >= w.goal
            Line(stringResource(R.string.week_weekly_line, defTitle(s, w.defId), w.done, w.goal), if (met) c.green else c.gold)
        }
        r.best?.let { Line(stringResource(R.string.week_best, defTitle(s, it), (r.bestRate * 100).roundToInt()), c.text) }
        r.worst?.let {
            Line(stringResource(R.string.week_worst, defTitle(s, it), (r.worstRate * 100).roundToInt()), c.gold)
            if (r.worstRate < 0.4) Line(stringResource(R.string.week_suggest), c.muted)
        }
    }
}

@Composable
private fun RewardCard(icon: ImageVector?, color: Color, title: String, subtitle: String, onContinue: () -> Unit, body: @Composable () -> Unit) {
    Panel(border = color.copy(alpha = 0.7f), padding = androidx.compose.foundation.layout.PaddingValues(24.dp)) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (icon != null) Icon(icon, null, tint = color, modifier = Modifier.padding(bottom = 4.dp).height(44.dp).width(44.dp))
            Text(title.uppercase(), style = MaterialTheme.typography.titleSmall, color = color, textAlign = TextAlign.Center)
            if (subtitle.isNotEmpty()) Text(subtitle, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
            Spacer(Modifier.height(4.dp))
            body()
            Spacer(Modifier.height(12.dp))
            PrimaryButton(stringResource(R.string.continue_), onClick = onContinue, modifier = Modifier.fillMaxWidth(), color = color)
        }
    }
}

@Composable
private fun Line(text: String, color: Color = Lif.colors.text) {
    Text(text, style = MaterialTheme.typography.bodyLarge, color = color, textAlign = TextAlign.Center)
}

@Composable
private fun toastMessage(s: GameState, t: Reward.Toast): String {
    val shadowName = content.shadowById[t.arg]?.name?.local() ?: t.arg
    val itemName = content.itemById[t.arg]?.name?.local() ?: t.arg
    return when (t.kind) {
        ToastKind.LEVEL_UP -> stringResource(R.string.toast_level, t.arg)
        ToastKind.ITEM_FOUND -> stringResource(R.string.toast_item_found, itemName)
        ToastKind.PENALTY_CLEARED -> stringResource(R.string.toast_penalty_cleared)
        ToastKind.FOCUS_DONE -> t.arg.split(':').let { (min, xp) -> // older toasts carry minutes only
            if (xp.toIntOrNull()?.takeIf { it > 0 } != null) stringResource(R.string.toast_focus_done_xp, min, xp) else stringResource(R.string.toast_focus_done, min)
        }
        ToastKind.FOCUS_LOST -> stringResource(R.string.toast_focus_lost, t.arg)
        ToastKind.BOSS_ESCAPED -> stringResource(R.string.toast_boss_escaped, content.bossById[t.arg]?.title?.local() ?: t.arg)
        ToastKind.BOSS_REVIVED -> stringResource(R.string.toast_boss_revived, content.bossById[t.arg]?.title?.local() ?: t.arg)
        ToastKind.PORTAL_ESCAPED -> stringResource(R.string.toast_portal_escaped)
        ToastKind.PORTAL_CLEARED -> stringResource(R.string.toast_portal_cleared)
        ToastKind.SHADOW_UPGRADED -> stringResource(R.string.toast_shadow_upgraded, shadowName)
        ToastKind.PASSIVE_FIRED -> stringResource(R.string.toast_passive_fired, shadowName)
        ToastKind.BUFF_ACTIVE -> stringResource(R.string.toast_buff, itemName)
        ToastKind.WEEK_GOAL -> stringResource(R.string.toast_week_goal, defTitle(s, t.arg))
        ToastKind.LOAD_UP -> stringResource(R.string.toast_load_up, t.arg.toIntOrNull() ?: 0)
        ToastKind.LOAD_DOWN -> stringResource(R.string.toast_load_down, t.arg.toIntOrNull() ?: 0)
        ToastKind.ACHIEVEMENT -> stringResource(R.string.toast_achievement, content.achievementById[t.arg]?.title?.local().orEmpty(), com.lifup.app.domain.achievementGold(1))
        ToastKind.BOSS_HIT -> ""
    }
}

/** One card for every achievement unlocked at once: each with its tier, then the rewards summed up. */
@Composable
private fun AchievementCard(unlocked: List<Reward.AchievementUnlocked>, dismiss: () -> Unit) {
    val first = content.achievementById[unlocked.first().achievementId]
    val title = if (unlocked.size == 1) first?.title?.local().orEmpty() else stringResource(R.string.reward_achievements_n, unlocked.size)
    RewardCard(Icons.Rounded.EmojiEvents, Lif.colors.gold, stringResource(R.string.reward_achievement_title), title, dismiss) {
        unlocked.forEach { a ->
            val def = content.achievementById[a.achievementId]
            val tier = stringResource(R.string.tier_n, a.tier, def?.tiers?.size ?: a.tier)
            Line(if (unlocked.size == 1) tier else "${def?.title?.local().orEmpty()} · $tier", Lif.colors.muted)
        }
        Line(stringResource(R.string.reward_gold, unlocked.sumOf { it.gold }), Lif.colors.gold)
        unlocked.flatMap { it.items }.groupingBy { it }.eachCount().forEach { (id, n) ->
            Line("+ " + content.itemById[id]?.name?.local().orEmpty() + if (n > 1) " ×$n" else "")
        }
        unlocked.mapNotNull { a -> a.shadowId?.let { content.shadowById[it] } }.forEach { Line(stringResource(R.string.reward_echo, it.name.local()), Lif.colors.purple) }
    }
}

/** Why this echo arrived: the perfect day, the boss, the achievement… */
@Composable
private fun echoReason(origin: com.lifup.app.domain.EchoOrigin, ref: String?): String = when (origin) {
    com.lifup.app.domain.EchoOrigin.PERFECT_DAY -> stringResource(R.string.reason_perfect_day)
    com.lifup.app.domain.EchoOrigin.PORTAL -> stringResource(R.string.reason_portal)
    com.lifup.app.domain.EchoOrigin.ESSENCE -> stringResource(R.string.reason_essence)
    com.lifup.app.domain.EchoOrigin.SHOP -> stringResource(R.string.reason_shop)
    com.lifup.app.domain.EchoOrigin.ACHIEVEMENT -> stringResource(R.string.reason_achievement, content.achievementById[ref]?.title?.local().orEmpty())
    com.lifup.app.domain.EchoOrigin.STREAK -> stringResource(R.string.reason_streak, ref?.toIntOrNull() ?: 0)
    com.lifup.app.domain.EchoOrigin.BOSS -> stringResource(R.string.reason_boss, content.bossById[ref]?.title?.local().orEmpty())
    com.lifup.app.domain.EchoOrigin.LEVEL -> stringResource(R.string.reason_level, ref?.toIntOrNull() ?: 0)
}
