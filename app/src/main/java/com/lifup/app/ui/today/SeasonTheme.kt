package com.lifup.app.ui.today

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AcUnit
import androidx.compose.material.icons.rounded.Celebration
import androidx.compose.material.icons.rounded.LocalFlorist
import androidx.compose.material.icons.rounded.Nightlight
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.BossDef
import com.lifup.app.domain.activeOn

/** Look and name of a seasonal event, keyed by the seasonal boss id. */
data class SeasonTheme(val color: Color, val icon: ImageVector, val name: Int)

fun seasonTheme(def: BossDef): SeasonTheme? = when (def.id) {
    "season_halloween" -> SeasonTheme(Color(0xFFFF7A1A), Icons.Rounded.Nightlight, R.string.season_halloween)
    "season_yule" -> SeasonTheme(Color(0xFF7DD3FC), Icons.Rounded.AcUnit, R.string.season_yule)
    "season_newyear" -> SeasonTheme(Color(0xFFFFD166), Icons.Rounded.Celebration, R.string.season_newyear)
    "season_spring" -> SeasonTheme(Color(0xFF7EE787), Icons.Rounded.LocalFlorist, R.string.season_spring)
    "season_summer" -> SeasonTheme(Color(0xFFFFB020), Icons.Rounded.WbSunny, R.string.season_summer)
    else -> null
}

/** Ribbon on top of a seasonal boss card: the event's name and that its shadow is exclusive. */
@Composable
fun SeasonRibbon(theme: SeasonTheme) {
    Row(
        Modifier.fillMaxWidth().padding(bottom = 10.dp).clip(RoundedCornerShape(10.dp))
            .background(Brush.horizontalGradient(listOf(theme.color.copy(alpha = 0.35f), theme.color.copy(alpha = 0.05f))))
            .padding(horizontal = 10.dp, vertical = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(theme.icon, null, tint = theme.color, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(stringResource(theme.name).uppercase(), style = MaterialTheme.typography.labelLarge, color = theme.color, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
        Text(stringResource(R.string.season_exclusive), style = MaterialTheme.typography.labelSmall, color = theme.color)
    }
}

/** The seasonal event that starts with next week's boss, if any — shown as a teaser. */
fun upcomingSeason(bosses: List<BossDef>, today: java.time.LocalDate): BossDef? {
    val nextMonday = today.with(java.time.temporal.TemporalAdjusters.next(java.time.DayOfWeek.MONDAY))
    return bosses.firstOrNull { it.activeOnDate(nextMonday) }
}

private fun BossDef.activeOnDate(date: java.time.LocalDate) = activeOn(java.time.MonthDay.from(date))

/** "Next week: Halloween event", in the event's colours. */
@Composable
fun SeasonTeaser(def: BossDef) {
    val theme = seasonTheme(def) ?: return
    Row(Modifier.fillMaxWidth().padding(top = 8.dp).clip(RoundedCornerShape(10.dp)).background(theme.color.copy(alpha = 0.1f)).padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(theme.icon, null, tint = theme.color, modifier = Modifier.size(18.dp))
        Spacer(Modifier.width(8.dp))
        Text(stringResource(R.string.season_next, stringResource(theme.name)), style = MaterialTheme.typography.labelMedium, color = theme.color)
    }
}
