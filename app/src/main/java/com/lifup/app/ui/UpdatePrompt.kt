package com.lifup.app.ui

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import com.lifup.app.R
import com.lifup.app.system.Updater
import kotlinx.coroutines.launch

/** A newer release is out (GitHub build only): say so on opening, and download only if the player agrees. */
@Composable
fun UpdatePrompt() {
    val state by Updater.state.collectAsState()
    val av = state as? Updater.State.Available ?: return
    val context = LocalContext.current.applicationContext
    val scope = rememberCoroutineScope()
    AlertDialog(
        onDismissRequest = { Updater.later(context, av) },
        title = { Text(stringResource(R.string.update_prompt_title, av.version)) },
        text = { Text(stringResource(R.string.update_prompt_text)) },
        confirmButton = { TextButton(onClick = { scope.launch { Updater.install(context, av) } }) { Text(stringResource(R.string.update_now).uppercase()) } },
        dismissButton = { TextButton(onClick = { Updater.later(context, av) }) { Text(stringResource(R.string.update_later).uppercase()) } },
    )
}
