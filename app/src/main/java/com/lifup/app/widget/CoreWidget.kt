package com.lifup.app.widget

import android.content.Context
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.glance.ColorFilter
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.SizeMode
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Box
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.layout.size
import androidx.glance.action.clickable
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.unit.ColorProvider
import com.lifup.app.LifUpApp
import com.lifup.app.R
import com.lifup.app.domain.Core
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.countedQuests
import com.lifup.app.domain.shownPaint
import com.lifup.app.ui.components.coreSprite
import java.time.LocalTime

/** CoreQuest+: the Core on the home screen, in its form and with today's face, and today's missions under it. */
class CoreWidget : GlanceAppWidget() {
    override val sizeMode = SizeMode.Responsive(setOf(DpSize(110.dp, 110.dp), DpSize(180.dp, 180.dp)))

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val s by LifUpApp.store.state.collectAsState()
            val large = LocalSize.current.height >= 180.dp && LocalSize.current.width >= 150.dp
            val side = if (large) 112.dp else 68.dp
            Box(
                GlanceModifier.fillMaxSize().background(W_BG).cornerRadius(20.dp).clickable(openLink(context, "today")),
                contentAlignment = Alignment.Center,
            ) {
                Column(GlanceModifier.fillMaxWidth().padding(horizontal = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Image(
                        ImageProvider(coreSprite(Core.stage(s), Core.mood(s, LocalTime.now().hour), s.shownPaint)), null,
                        modifier = GlanceModifier.size(side),
                        colorFilter = if (s.plus) null else ColorFilter.tint(ColorProvider(W_TRACK)),
                    )
                    Spacer(GlanceModifier.height(4.dp))
                    if (s.plus) {
                        val counted = s.countedQuests()
                        Label("${counted.count { it.status == QuestStatus.DONE }} / ${counted.size}", W_TEXT, 14, bold = true)
                        if (large) {
                            Spacer(GlanceModifier.height(5.dp))
                            Bar(counted.count { it.status == QuestStatus.DONE } / counted.size.coerceAtLeast(1).toFloat(), W_PURPLE, 5.dp)
                        }
                    } else Label(context.getString(R.string.widget_core_plus), W_MUTED, 11)
                }
            }
        }
    }
}

class CoreWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CoreWidget()
}
