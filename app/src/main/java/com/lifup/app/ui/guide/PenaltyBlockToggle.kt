package com.lifup.app.ui.guide

import com.lifup.app.domain.penaltyBlocks
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.setBlockOnPenalty
import com.lifup.app.system.Permissions
import com.lifup.app.ui.act
import com.lifup.app.ui.focus.AppPickerSheet
import com.lifup.app.ui.focus.PermissionsSheet
import com.lifup.app.ui.focus.ToggleRow
import com.lifup.app.ui.focus.rememberResumeTick

/** "Block apps during penalties", walking the user through permissions and app choice when needed. */
@Composable
fun PenaltyBlockToggle(s: GameState) {
    val context = LocalContext.current
    val tick = rememberResumeTick()
    val ready = remember(tick) { Permissions.blockerReady(context) }
    var showPerms by rememberSaveable { mutableStateOf(false) }
    var pickApps by rememberSaveable { mutableStateOf(false) }
    val info = when {
        !ready -> R.string.block_needs_perms
        s.settings.blockedApps.isEmpty() -> R.string.block_needs_apps
        else -> R.string.block_on_penalty_info
    }
    val consequence = if (s.penaltyBlocks() && ready) "" else " " + stringResource(R.string.penalty_cut_instead)
    ToggleRow(stringResource(R.string.block_on_penalty), stringResource(info) + consequence, s.settings.blockOnPenalty && ready) { on ->
        when {
            on && !ready -> showPerms = true
            on && s.settings.blockedApps.isEmpty() -> { act { setBlockOnPenalty(true) }; pickApps = true }
            else -> act { setBlockOnPenalty(on) }
        }
    }
    if (showPerms) PermissionsSheet(s) { showPerms = false }
    if (pickApps) AppPickerSheet(s.settings.blockedApps) { pickApps = false }
}
