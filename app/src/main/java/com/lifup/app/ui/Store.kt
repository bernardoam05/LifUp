package com.lifup.app.ui

import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.lifup.app.LifUpApp
import com.lifup.app.domain.Content
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Tx

@Composable
fun gameState(): GameState {
    val s by LifUpApp.store.state.collectAsStateWithLifecycle()
    return s
}

val content: Content get() = LifUpApp.store.content

/** Runs an engine action from a UI callback. */
fun act(action: Tx.() -> Unit) = LifUpApp.store.fire(action)
