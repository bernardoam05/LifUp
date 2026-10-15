package com.lifup.app.data

import android.util.AtomicFile
import android.util.Log
import com.lifup.app.domain.Content
import com.lifup.app.domain.Ctx
import com.lifup.app.domain.Engine
import com.lifup.app.domain.GameState
import com.lifup.app.domain.Tx
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.File

/**
 * The single source of truth. UI, services, widgets and the quick tile all read [state] and change it
 * only through [dispatch], which runs the pure engine and persists the result atomically.
 */
class GameStore(
    val content: Content,
    private val file: File,
    initial: GameState? = null,
) {
    private val atomic = AtomicFile(file)
    private val mutex = Mutex()
    private val listeners = mutableListOf<(old: GameState, new: GameState) -> Unit>()

    @OptIn(ExperimentalCoroutinesApi::class)
    private val serial = Dispatchers.Default.limitedParallelism(1)
    val scope = CoroutineScope(SupervisorJob() + serial)

    private val _state = MutableStateFlow(initial ?: read() ?: GameState())
    val state: StateFlow<GameState> = _state.asStateFlow()
    val current: GameState get() = _state.value

    val hasSavedState: Boolean get() = file.exists()

    fun addListener(listener: (old: GameState, new: GameState) -> Unit) {
        listeners += listener
    }

    suspend fun dispatch(before: Tx.() -> Unit = {}, action: Tx.() -> Unit = {}): GameState = mutex.withLock {
        val old = _state.value
        val new = withContext(serial) { Engine.run(old, Ctx(content, System.currentTimeMillis()), before, action) }
        if (new != old || !file.exists()) {
            _state.value = new
            withContext(Dispatchers.IO) { write(new) }
            listeners.forEach { runCatching { it(old, new) }.onFailure { e -> Log.e(TAG, "listener failed", e) } }
        }
        new
    }

    /** Fire-and-forget variant for UI callbacks and receivers. */
    fun fire(action: Tx.() -> Unit = {}) {
        scope.launch { dispatch(action) }
    }

    /** Replaces the whole state (backup import / legacy migration / reset). */
    suspend fun replace(state: GameState) = mutex.withLock {
        val old = _state.value
        _state.value = state
        withContext(Dispatchers.IO) { write(state) }
        listeners.forEach { runCatching { it(old, state) } }
    }

    private fun read(): GameState? = runCatching {
        if (!file.exists()) return null
        Content.json.decodeFromString<GameState>(atomic.readFully().decodeToString())
    }.onFailure { Log.e(TAG, "state unreadable, starting fresh", it) }.getOrNull()

    private fun write(state: GameState) {
        val out = atomic.startWrite()
        try {
            out.write(Content.json.encodeToString(GameState.serializer(), state).encodeToByteArray())
            atomic.finishWrite(out)
        } catch (e: Exception) {
            atomic.failWrite(out)
            Log.e(TAG, "state write failed", e)
        }
    }

    companion object {
        private const val TAG = "GameStore"
    }
}
