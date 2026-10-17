package com.lifup.app.ui

import androidx.annotation.StringRes
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.DirectionsRun
import androidx.compose.material.icons.automirrored.rounded.MenuBook
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.Air
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.AutoFixHigh
import androidx.compose.material.icons.rounded.Block
import androidx.compose.material.icons.rounded.ConfirmationNumber
import androidx.compose.material.icons.rounded.Diamond
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.Handyman
import androidx.compose.material.icons.rounded.HourglassBottom
import androidx.compose.material.icons.rounded.HourglassTop
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.LinkOff
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.NightsStay
import androidx.compose.material.icons.rounded.Paid
import androidx.compose.material.icons.rounded.Pets
import androidx.compose.material.icons.rounded.PrecisionManufacturing
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.Speed
import androidx.compose.material.icons.rounded.SportsMartialArts
import androidx.compose.material.icons.rounded.SwapHoriz
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material.icons.rounded.WaterDrop
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.res.stringResource
import com.lifup.app.R
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.L10n
import com.lifup.app.domain.Passive
import com.lifup.app.domain.Quest
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.ShadowClass
import com.lifup.app.domain.ShadowRank
import com.lifup.app.domain.text
import com.lifup.app.ui.theme.Palette
import kotlin.math.abs
import kotlin.math.roundToInt

@Composable
fun lang(): String = LocalConfiguration.current.locales[0].language

@Composable
fun L10n.local(): String = text(lang())

fun fmtNum(v: Double): String = if (abs(v - v.roundToInt()) < 0.05) v.roundToInt().toString() else "%.1f".format(v)

fun questTitle(q: Quest, lang: String) = q.title.text(lang)

/** Short number for tight spots: 9 999, 12,3k, 10,0M. */
fun fmtCompact(v: Long): String = when {
    v < 10_000 -> v.toString()
    v < 1_000_000 -> "%.1fk".format(v / 1_000.0).replace(".0k", "k")
    else -> "%.1fM".format(v / 1_000_000.0)
}

/** Title of a mission definition, built-in or made in the Forge. */
@Composable
fun defTitle(s: com.lifup.app.domain.GameState, id: String): String =
    (content.questDefById[id] ?: s.customDefs.firstOrNull { it.id == id })?.title?.local()
        ?: s.allQuests.firstOrNull { it.defId == id }?.title?.local() ?: id

fun questDetail(q: Quest, lang: String, unitLabel: String = q.unit) =
    q.description.text(lang).replace("{target}", fmtNum(q.target)).replace("{unit}", unitLabel)

@Composable
fun unitLabel(unit: String): String = when (unit.lowercase()) {
    "min" -> stringResource(R.string.unit_min)
    "h" -> stringResource(R.string.unit_h)
    "s" -> stringResource(R.string.unit_s)
    "km" -> "km"
    "reps" -> stringResource(R.string.unit_reps)
    "pages", "páginas" -> stringResource(R.string.unit_pages)
    "glasses" -> stringResource(R.string.unit_glasses)
    "steps" -> stringResource(R.string.unit_steps)
    "flights" -> stringResource(R.string.unit_flights)
    "servings" -> stringResource(R.string.unit_servings)
    "article" -> stringResource(R.string.unit_article)
    "episode" -> stringResource(R.string.unit_episode)
    "things" -> stringResource(R.string.unit_things)
    "person" -> stringResource(R.string.unit_person)
    else -> unit
}

fun fmtDuration(ms: Long): String {
    val total = (ms / 1000).coerceAtLeast(0)
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%02d:%02d".format(m, s)
}

fun fmtShort(ms: Long): String {
    val min = (ms / 60_000).coerceAtLeast(0)
    return if (min >= 60 * 24) "${min / (60 * 24)}d ${(min / 60) % 24}h" else if (min >= 60) "${min / 60}h ${min % 60}m" else "${min}m"
}

fun questIcon(type: QuestType): ImageVector = when (type) {
    QuestType.TRAINING -> Icons.Rounded.FitnessCenter
    QuestType.KNOWLEDGE -> Icons.AutoMirrored.Rounded.MenuBook
    QuestType.FOCUS -> Icons.Rounded.HourglassTop
    QuestType.GPS -> Icons.AutoMirrored.Rounded.DirectionsRun
    QuestType.FORBIDDEN -> Icons.Rounded.Block
    QuestType.LIMIT -> Icons.Rounded.Speed
}

fun questColor(type: QuestType, p: Palette): Color = when (type) {
    QuestType.TRAINING -> p.red
    QuestType.KNOWLEDGE -> p.blue
    QuestType.FOCUS -> p.purple
    QuestType.GPS -> p.green
    QuestType.FORBIDDEN -> p.gold
    QuestType.LIMIT -> p.muted
}

@StringRes fun questTypeName(type: QuestType) = when (type) {
    QuestType.TRAINING -> R.string.type_training
    QuestType.KNOWLEDGE -> R.string.type_knowledge
    QuestType.FOCUS -> R.string.type_focus
    QuestType.GPS -> R.string.type_gps
    QuestType.FORBIDDEN -> R.string.type_forbidden
    QuestType.LIMIT -> R.string.type_limit
}

fun shadowIcon(c: ShadowClass): ImageVector = when (c) {
    ShadowClass.BEAST -> Icons.Rounded.Pets
    ShadowClass.UNDEAD -> Icons.Rounded.NightsStay
    ShadowClass.MAGE -> Icons.Rounded.AutoFixHigh
    ShadowClass.WARRIOR -> Icons.Rounded.SportsMartialArts
    ShadowClass.TANK -> Icons.Rounded.Shield
    ShadowClass.ASSASSIN -> Icons.Rounded.VisibilityOff
    ShadowClass.ELEMENTAL -> Icons.Rounded.LocalFireDepartment
    ShadowClass.ANCIENT -> Icons.Rounded.AccountBalance
    ShadowClass.CONSTRUCT -> Icons.Rounded.PrecisionManufacturing
    ShadowClass.SPIRIT -> Icons.Rounded.Air
    ShadowClass.ARTISAN -> Icons.Rounded.Handyman
    ShadowClass.EXPLORER -> Icons.Rounded.Explore
}

fun shadowRankColor(r: ShadowRank): Color = when (r) {
    // The usual rarity colours, so the order reads without learning it.
    ShadowRank.NORMAL -> Color(0xFF94A3B8)
    ShadowRank.ELITE -> Color(0xFF3B82F6)
    ShadowRank.KNIGHT -> Color(0xFFA855F7)
    ShadowRank.COMMANDER -> Color(0xFFF59E0B)
    ShadowRank.MARSHAL -> Color(0xFFF43F5E)
}

@StringRes fun shadowRankName(r: ShadowRank) = when (r) {
    ShadowRank.NORMAL -> R.string.srank_normal
    ShadowRank.ELITE -> R.string.srank_elite
    ShadowRank.KNIGHT -> R.string.srank_knight
    ShadowRank.COMMANDER -> R.string.srank_commander
    ShadowRank.MARSHAL -> R.string.srank_marshal
}

@StringRes fun hunterTitle(r: HunterRank) = when (r) {
    HunterRank.E -> R.string.rank_title_e
    HunterRank.D -> R.string.rank_title_d
    HunterRank.C -> R.string.rank_title_c
    HunterRank.B -> R.string.rank_title_b
    HunterRank.A -> R.string.rank_title_a
    HunterRank.S -> R.string.rank_title_s
    HunterRank.N -> R.string.rank_title_n
}

/** Human description of a passive at a given strength. */
@Composable
fun passiveText(p: Passive, value: Double): String {
    val pct = "${(value * 100).roundToInt()}%"
    return when (p) {
        Passive.XP_BOOST -> stringResource(R.string.passive_xp, pct)
        Passive.GOLD_BOOST -> stringResource(R.string.passive_gold, pct)
        Passive.TRAINING_XP -> stringResource(R.string.passive_training, pct)
        Passive.MIND_XP -> stringResource(R.string.passive_mind, pct)
        Passive.EXPLORER_XP -> stringResource(R.string.passive_explorer, pct)
        Passive.BOSS_DAMAGE -> stringResource(R.string.passive_boss, pct)
        Passive.PENALTY_REDUCE -> stringResource(R.string.passive_penalty, pct)
        Passive.PENALTY_IMMUNITY -> stringResource(R.string.passive_immunity)
        Passive.STREAK_PROTECT -> stringResource(R.string.passive_streak)
        Passive.SHOP_DISCOUNT -> stringResource(R.string.passive_shop, pct)
        Passive.FOCUS_MASTERY -> stringResource(R.string.passive_focus, pct)
        Passive.DAILY_BONUS -> stringResource(R.string.passive_daily, value.roundToInt())
        Passive.SHADOW_LUCK -> stringResource(R.string.passive_luck, pct)
        Passive.ALL_BOOST -> stringResource(R.string.passive_all, pct)
    }
}

fun itemIcon(id: String): ImageVector = when (id) {
    "system_pass" -> Icons.Rounded.ConfirmationNumber
    "relogio_ampulheta" -> Icons.Rounded.HourglassBottom
    "lagrima_purificacao" -> Icons.Rounded.WaterDrop
    "escudo_constancia" -> Icons.Rounded.Shield
    "elixir_sabedoria" -> Icons.Rounded.Science
    "elixir_fortuna" -> Icons.Rounded.Paid
    "essencia_sombria" -> Icons.Rounded.AutoAwesome
    "quebra_feiticos" -> Icons.Rounded.LinkOff
    "pergaminho_troca" -> Icons.Rounded.SwapHoriz
    "bau_cacador" -> Icons.Rounded.Inventory2
    else -> Icons.Rounded.Diamond
}

@StringRes fun autoName(kind: com.lifup.app.domain.AutoKind) = when (kind) {
    com.lifup.app.domain.AutoKind.STEPS -> R.string.auto_steps
    com.lifup.app.domain.AutoKind.WALK_DISTANCE -> R.string.auto_walk
    com.lifup.app.domain.AutoKind.SCREEN_TIME -> R.string.auto_screen
    com.lifup.app.domain.AutoKind.DISTRACTION_TIME -> R.string.auto_distraction
}
