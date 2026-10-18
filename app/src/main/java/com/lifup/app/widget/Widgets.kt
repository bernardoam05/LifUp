package com.lifup.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.ColorFilter
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.Action
import androidx.glance.action.clickable
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Column
import androidx.glance.layout.ColumnScope
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.lifup.app.MainActivity
import com.lifup.app.R
import com.lifup.app.domain.GameState
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// Widget palette: the app's dark theme, fixed (widgets can't read the in-app theme).
internal val W_BG = Color(0xFF0B0D14)
internal val W_PANEL = Color(0xFF161A26)
internal val W_TRACK = Color(0xFF262C3E)
internal val W_TEXT = Color(0xFFE6E7EE)
internal val W_MUTED = Color(0xFF9497A8)
internal val W_DIM = Color(0xFF5B6075)
internal val W_GREEN = Color(0xFF22C55E)
internal val W_RED = Color(0xFFEF4444)
internal val W_GOLD = Color(0xFFF59E0B)
internal val W_PURPLE = Color(0xFFA855F7)

internal fun c(color: Color) = ColorProvider(color)

/** Pushes fresh state to every placed widget; bursts of changes are coalesced into one update. */
object Widgets {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private var pending: Job? = null

    fun refresh(context: Context, @Suppress("UNUSED_PARAMETER") s: GameState) = refreshSoon(context)

    fun refreshSoon(context: Context, delayMs: Long = 600) {
        pending?.cancel()
        pending = scope.launch {
            delay(delayMs)
            runCatching { TodayWidget().updateAll(context) }
            runCatching { FocusWidget().updateAll(context) }
            runCatching { HeroWidget().updateAll(context) }
        }
    }
}

/** Opens the app on a deep link (lifup://today, lifup://quest/<id>, …). */
internal fun openLink(context: Context, link: String): Action = actionStartActivity(
    Intent(Intent.ACTION_VIEW, Uri.parse("lifup://$link"), context, MainActivity::class.java)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
)

@Composable
internal fun WidgetCard(onClick: Action, content: @Composable ColumnScope.() -> Unit) {
    Column(GlanceModifier.fillMaxSize().background(W_BG).cornerRadius(20.dp).padding(14.dp).clickable(onClick), content = content)
}

@Composable
internal fun Icon(res: Int, tint: Color, size: Dp = 16.dp, modifier: GlanceModifier = GlanceModifier) {
    Image(ImageProvider(res), null, modifier.size(size), colorFilter = ColorFilter.tint(c(tint)))
}

@Composable
internal fun Bar(progress: Float, color: Color, height: Dp = 6.dp) {
    LinearProgressIndicator(
        progress = progress.coerceIn(0f, 1f),
        modifier = GlanceModifier.fillMaxWidth().height(height).cornerRadius(height / 2),
        color = c(color), backgroundColor = c(W_TRACK),
    )
}

@Composable
internal fun Label(text: String, color: Color = W_MUTED, size: Int = 12, bold: Boolean = false, modifier: GlanceModifier = GlanceModifier) {
    Text(text, modifier, style = TextStyle(color = c(color), fontSize = size.sp, fontWeight = if (bold) FontWeight.Bold else FontWeight.Normal), maxLines = 1)
}

/** Flame plus streak count, used in the widget headers. */
@Composable
internal fun StreakChip(streak: Int) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(R.drawable.ic_w_flame, if (streak > 0) W_RED else W_DIM, 14.dp)
        Spacer(GlanceModifier.width(3.dp))
        Label("$streak", W_TEXT, 13, bold = true)
    }
}

/** Rounded tinted square with a letter, like the app's rank badge. */
@Composable
internal fun RankBadge(label: String, color: Color, size: Dp) {
    Box(GlanceModifier.size(size).background(color).cornerRadius(12.dp).padding(2.dp), contentAlignment = Alignment.Center) {
        Box(GlanceModifier.fillMaxSize().background(W_BG).cornerRadius(10.dp), contentAlignment = Alignment.Center) {
            Label(label, color, if (label.length > 1) 16 else 20, bold = true)
        }
    }
}
