package com.lifup.app.system

import android.content.Context
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.android.gms.fitness.FitnessLocal
import com.google.android.gms.fitness.LocalRecordingClient
import com.google.android.gms.fitness.data.LocalDataType
import com.google.android.gms.fitness.data.LocalField
import com.google.android.gms.fitness.request.LocalDataReadRequest
import kotlinx.coroutines.tasks.await
import java.time.LocalDate
import java.time.ZoneId
import java.util.concurrent.TimeUnit

/**
 * Steps recorded in the background by Google Play services (Recording API): it keeps counting
 * while the app is closed, with no service or notification of ours, and keeps 10 days of history.
 */
object StepHistory {
    @Volatile private var subscribed = false

    private fun supported(c: Context) = runCatching {
        GoogleApiAvailability.getInstance()
            .isGooglePlayServicesAvailable(c, LocalRecordingClient.LOCAL_RECORDING_CLIENT_MIN_VERSION_CODE) == ConnectionResult.SUCCESS
    }.getOrDefault(false)

    /** Starts recording (idempotent). Needs the activity-recognition permission. */
    private suspend fun subscribe(c: Context): Boolean {
        if (!subscribed) subscribed = runCatching {
            FitnessLocal.getLocalRecordingClient(c).subscribe(LocalDataType.TYPE_STEP_COUNT_DELTA).await(); true
        }.getOrDefault(false)
        return subscribed
    }

    /** Steps recorded on [day] up to now, or null when Play services can't provide them. */
    suspend fun steps(c: Context, day: LocalDate): Int? {
        if (!AutoTracker.stepsAvailable(c) || !supported(c) || !subscribe(c)) return null
        val zone = ZoneId.systemDefault()
        val start = day.atStartOfDay(zone).toEpochSecond()
        val end = minOf(day.plusDays(1).atStartOfDay(zone).toEpochSecond(), System.currentTimeMillis() / 1000)
        if (end <= start) return 0
        val request = LocalDataReadRequest.Builder()
            .aggregate(LocalDataType.TYPE_STEP_COUNT_DELTA)
            .bucketByTime(1, TimeUnit.DAYS)
            .setTimeRange(start, end, TimeUnit.SECONDS)
            .build()
        return runCatching {
            FitnessLocal.getLocalRecordingClient(c).readData(request).await().buckets
                .flatMap { it.dataSets }.flatMap { it.dataPoints }
                .sumOf { it.getValue(LocalField.FIELD_STEPS).asInt() }
        }.getOrNull()
    }
}
