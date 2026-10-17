package com.lifup.app.domain

import com.lifup.app.data.Snapshots
import org.junit.Assert.assertEquals
import org.junit.Test
import java.nio.file.Files
import java.time.LocalDate

class SnapshotsTest {
    @Test fun `keeps one copy per day for the last seven days`() {
        val dir = Files.createTempDirectory("snap").toFile()
        val snaps = Snapshots(dir)
        val start = LocalDate.parse("2026-10-01")
        repeat(10) { i -> snaps.maybeSave("day $i", i * 86_400_000L, start.plusDays(i.toLong())) }
        snaps.maybeSave("day 9 later", 9 * 86_400_000L + 3_600_000L, start.plusDays(9))
        val list = snaps.list()
        assertEquals(7, list.size)
        assertEquals("2026-10-10", list.first().day)
        assertEquals("day 9 later", list.first().file.readText())
        dir.deleteRecursively()
    }
}
