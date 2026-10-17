package com.lifup.app.ui.today

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.MissionTimer
import com.lifup.app.domain.Quest
import com.lifup.app.domain.QuestOrigin
import com.lifup.app.domain.QuestStatus
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.setProgress
import com.lifup.app.domain.toggleFailed
import com.lifup.app.ui.act
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.fmtDuration
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.lang
import com.lifup.app.ui.questColor
import com.lifup.app.ui.questDetail
import com.lifup.app.ui.questIcon
import com.lifup.app.ui.questTitle
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.unitLabel

@Composable
fun QuestCard(q: Quest, timer: MissionTimer?, now: Long, onClick: () -> Unit) {
    val p = Lif.colors
    val color = questColor(q.type, p)
    val done = q.status == QuestStatus.DONE
    val failed = q.status == QuestStatus.FAILED
    val border = when {
        done -> p.green.copy(alpha = 0.4f)
        failed -> p.red.copy(alpha = 0.5f)
        q.origin == QuestOrigin.PENALTY -> p.red.copy(alpha = 0.6f)
        else -> p.border
    }
    val unit = unitLabel(q.unit)
    Panel(border = border, onClick = onClick, padding = androidx.compose.foundation.layout.PaddingValues(12.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (done) IconBadge(Icons.Rounded.CheckCircle, p.green) else IconBadge(questIcon(q.type), if (failed) p.red else color)
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f).alpha(if (done) 0.6f else 1f)) {
                Text(
                    questTitle(q, lang()),
                    style = MaterialTheme.typography.titleMedium,
                    maxLines = 1, overflow = TextOverflow.Ellipsis,
                    textDecoration = if (done) TextDecoration.LineThrough else null,
                )
                Text(questDetail(q, lang(), unit), style = MaterialTheme.typography.bodySmall, color = p.muted, maxLines = 2, overflow = TextOverflow.Ellipsis)
            }
            Spacer(Modifier.width(8.dp))
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Pill(q.rank.name, color)
                if (q.auto != null) Pill(stringResource(R.string.auto_badge), p.green)
                if (q.xp > 0) Text("+${if (done) q.xpGained else q.xp} XP", style = MaterialTheme.typography.labelSmall, color = p.accent)
            }
        }
        if (timer != null && !done) {
            Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.Timer, null, tint = if (timer.running) p.accent else p.dim, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(4.dp))
                Text(fmtDuration(timer.elapsed(now)), style = MaterialTheme.typography.labelMedium, color = if (timer.running) p.accent else p.dim)
            }
        }
        when (q.type) {
            QuestType.FOCUS, QuestType.GPS, QuestType.TRAINING -> if (!done && (q.type != QuestType.TRAINING || q.auto != null)) {
                Spacer(Modifier.height(8.dp))
                Bar((q.progress / q.target).toFloat(), color)
                Text("${fmtNum(q.progress)} / ${fmtNum(q.target)} $unit", style = MaterialTheme.typography.labelSmall, color = p.dim, modifier = Modifier.padding(top = 2.dp))
            }
            QuestType.LIMIT -> if (!done) LimitControls(q, unit, manual = q.auto == null)
            QuestType.FORBIDDEN -> if (!done) {
                Row(Modifier.padding(top = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        stringResource(if (failed) R.string.forbidden_broken else R.string.forbidden_keep),
                        style = MaterialTheme.typography.labelMedium, color = if (failed) p.red else p.gold, modifier = Modifier.weight(1f),
                    )
                    TextButton(onClick = { act { toggleFailed(q.id) } }) {
                        Text(stringResource(if (failed) R.string.forbidden_undo else R.string.forbidden_fail).uppercase(), color = if (failed) p.muted else p.red, style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
            else -> Unit
        }
    }
}

@Composable
private fun LimitControls(q: Quest, unit: String, manual: Boolean) {
    val p = Lif.colors
    val over = q.progress > q.target
    val step = if (q.unit == "h") 0.5 else 1.0
    Row(Modifier.padding(top = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Bar((q.progress / q.target.coerceAtLeast(0.1)).toFloat(), if (over) p.red else p.muted)
            Text(
                stringResource(R.string.limit_used, fmtNum(q.progress), fmtNum(q.target), unit),
                style = MaterialTheme.typography.labelSmall, color = if (over) p.red else p.dim, modifier = Modifier.padding(top = 2.dp),
            )
        }
        if (manual) {
            IconButton(onClick = { act { setProgress(q.id, q.progress - step) } }) { Icon(Icons.Rounded.Remove, stringResource(R.string.a11y_decrease), tint = p.muted) }
            IconButton(onClick = { act { setProgress(q.id, q.progress + step) } }) { Icon(Icons.Rounded.Add, stringResource(R.string.a11y_increase), tint = if (over) p.red else p.text) }
        }
        if (q.status == QuestStatus.FAILED) Icon(Icons.Rounded.Close, null, tint = p.red)
    }
}
