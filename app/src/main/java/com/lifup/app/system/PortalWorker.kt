package com.lifup.app.system

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.lifup.app.LifUpApp
import com.lifup.app.domain.rollPortal
import java.util.concurrent.TimeUnit

/** Hourly roll for timed portals (also rolled whenever the app comes to the foreground). */
class PortalWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        LifUpApp.store.dispatch { rollPortal() }
        return Result.success()
    }

    companion object {
        fun schedule(context: Context) {
            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                "portal-roll", ExistingPeriodicWorkPolicy.KEEP,
                PeriodicWorkRequestBuilder<PortalWorker>(1, TimeUnit.HOURS).build(),
            )
        }
    }
}
