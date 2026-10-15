package com.lifup.app.widget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.glance.appwidget.action.actionStartActivity as startActivityIntent
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.LinearProgressIndicator
import androidx.glance.action.actionStartActivity
import androidx.glance.appwidget.cornerRadius
import androidx.glance.appwidget.provideContent
import androidx.glance.appwidget.updateAll
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.width
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider as FixedColor
import com.lifup.app.LifUpApp
import com.lifup.app.MainActivity
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.Rules
import com.lifup.app.domain.text
import com.lifup.app.ui.theme.accentFor
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.util.Locale

private val BG = Color(0xFF0B0D14)
private val TEXT = Color(0xFFE6E7EE)
private val MUTED = Color(0xFF9497A8)
private val GREEN = Color(0xFF22C55E)
private val RED = Color(0xFFEF4444)

private fun c(color: Color) = FixedColor(color)

/** Pushes fresh state to every placed widget, at most every few seconds. */
object Widgets {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    @Volatile private var last = 0L

    fun refresh(context: Context, @Suppress("UNUSED_PARAMETER") s: GameState) {
        val now = System.currentTimeMillis()
        if (now - last < 5_000) return
        last = now
        scope.launch {
            runCatching { TodayWidget().updateAll(context) }
            runCatching { HeroWidget().updateAll(context) }
        }
    }
}

@Composable
private fun Card(content: @Composable () -> Unit) {
    Column(
        GlanceModifier.fillMaxSize().background(BG).cornerRadius(18.dp).padding(14.dp).clickable(actionStartActivity<MainActivity>()),
    ) { content() }
}

class TodayWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val s = LifUpApp.store.current
        val lang = Locale.getDefault().language
        val accent = accentFor(HunterRank.of(s.player.level))
        provideContent {
            Card {
                val daily = s.dailyQuests
                val done = daily.count { it.status == QuestStatus.DONE }
                Row(GlanceModifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(context.getString(R.string.tab_today).uppercase(), style = TextStyle(color = c(accent), fontWeight = FontWeight.Bold, fontSize = 13.sp))
                    Spacer(GlanceModifier.width(8.dp))
                    Text("$done/${daily.size}", style = TextStyle(color = c(TEXT), fontWeight = FontWeight.Bold, fontSize = 13.sp))
                    Spacer(GlanceModifier.defaultWeight())
                    Text("🔥 ${s.player.streak}", style = TextStyle(color = c(TEXT), fontSize = 13.sp))
                }
                if (s.penalty.active) {
                    Text(context.getString(R.string.penalty_banner), style = TextStyle(color = c(RED), fontSize = 12.sp, fontWeight = FontWeight.Bold))
                }
                Spacer(GlanceModifier.height(6.dp))
                val shown = (s.penalty.quests.filter { it.status != QuestStatus.DONE } + daily.sortedBy { it.status == QuestStatus.DONE }).take(5)
                shown.forEach { q ->
                    val ok = q.status == QuestStatus.DONE
                    Text(
                        (if (ok) "✓ " else "• ") + q.title.text(lang),
                        style = TextStyle(color = c(if (ok) GREEN else if (q.status == QuestStatus.FAILED) RED else TEXT), fontSize = 13.sp),
                        maxLines = 1,
                    )
                }
                if (daily.size > shown.size) Text("+${daily.size - shown.size}", style = TextStyle(color = c(MUTED), fontSize = 12.sp))
            }
        }
    }
}

class HeroWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        val s = LifUpApp.store.current
        val lang = Locale.getDefault().language
        val rank = HunterRank.of(s.player.level)
        val accent = accentFor(rank)
        provideContent {
            Card {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(rank.name, style = TextStyle(color = c(accent), fontWeight = FontWeight.Bold, fontSize = 26.sp))
                    Spacer(GlanceModifier.width(10.dp))
                    Column {
                        Text(s.player.name.ifBlank { context.getString(R.string.default_hunter) }.uppercase(), style = TextStyle(color = c(TEXT), fontWeight = FontWeight.Bold, fontSize = 14.sp), maxLines = 1)
                        Text(context.getString(R.string.level_n, s.player.level) + " · 🔥 ${s.player.streak}", style = TextStyle(color = c(MUTED), fontSize = 12.sp))
                    }
                }
                Spacer(GlanceModifier.height(8.dp))
                LinearProgressIndicator(
                    progress = s.player.xp / Rules.xpForLevel(s.player.level).toFloat(),
                    modifier = GlanceModifier.fillMaxWidth().height(6.dp),
                    color = c(accent), backgroundColor = c(Color(0xFF262C3E)),
                )
                s.boss?.let { b ->
                    val def = LifUpApp.store.content.bossById[b.bossId]
                    val openBoss = startActivityIntent(
                        Intent(Intent.ACTION_VIEW, Uri.parse("lifup://boss"), context, MainActivity::class.java)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP),
                    )
                    Spacer(GlanceModifier.height(10.dp))
                    Column(GlanceModifier.fillMaxWidth().clickable(openBoss)) {
                        Text(def?.title?.text(lang).orEmpty(), style = TextStyle(color = c(if (b.defeated) GREEN else RED), fontSize = 12.sp, fontWeight = FontWeight.Bold), maxLines = 1)
                        if (!b.defeated) LinearProgressIndicator(
                            progress = b.hp / b.maxHp.toFloat(),
                            modifier = GlanceModifier.fillMaxWidth().height(5.dp),
                            color = c(RED), backgroundColor = c(Color(0xFF262C3E)),
                        )
                    }
                }
            }
        }
    }
}

class TodayWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = TodayWidget()
}

class HeroWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = HeroWidget()
}

