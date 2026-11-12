package com.lifup.app.ui.today

import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.RadioButtonUnchecked
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.StarterTask
import com.lifup.app.domain.claimStarter
import com.lifup.app.domain.starterDone
import com.lifup.app.ui.act
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.theme.Lif

private fun StarterTask.label() = when (this) {
    StarterTask.MISSION -> R.string.starter_mission
    StarterTask.SIDE -> R.string.starter_side
    StarterTask.FOCUS -> R.string.starter_focus
}

/** Day one's first steps: three small things to try, each paying a little gold once done. */
@Composable
fun StarterCard(s: GameState) {
    val p = Lif.colors
    Panel(border = p.accent.copy(alpha = 0.6f), background = p.accent.copy(alpha = 0.06f)) {
        // The Core shows the way on day one.
        Row(verticalAlignment = Alignment.CenterVertically) {
            com.lifup.app.ui.components.CoreAvatar(com.lifup.app.domain.Core.stage(s), com.lifup.app.domain.CoreMood.HAPPY, 56.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(stringResource(R.string.starter_title), style = MaterialTheme.typography.titleMedium)
                Spacer(Modifier.size(4.dp))
                com.lifup.app.ui.guide.SpeechBubble(stringResource(R.string.starter_hint), p.accent)
            }
        }
        Spacer(Modifier.size(6.dp))
        StarterTask.entries.forEach { t ->
            val claimed = t in s.starterClaimed
            val done = s.starterDone(t)
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(vertical = 2.dp)) {
                Icon(
                    if (claimed || done) Icons.Rounded.CheckCircle else Icons.Rounded.RadioButtonUnchecked, null,
                    tint = if (claimed) p.dim else if (done) p.green else p.dim, modifier = Modifier.size(18.dp),
                )
                Spacer(Modifier.width(10.dp))
                Text(stringResource(t.label()), style = MaterialTheme.typography.bodyMedium, color = if (claimed) p.dim else p.text, modifier = Modifier.weight(1f))
                when {
                    claimed -> Text("+${t.gold}", style = MaterialTheme.typography.labelMedium, color = p.dim)
                    done -> TextButton(onClick = { act { claimStarter(t) } }) { Text(stringResource(R.string.starter_claim, t.gold), color = p.gold) }
                    else -> Text("+${t.gold}", style = MaterialTheme.typography.labelMedium, color = p.gold)
                }
            }
        }
    }
}
