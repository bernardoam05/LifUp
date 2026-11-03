package com.lifup.app.domain

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class PatchNotesTest {
    private val dir = File("../release-notes")

    @Test fun `a line splits into kind, headline and details`() {
        val l = PatchNotes.parse("- [fix] The button stays on screen. Only the content scrolls.").single()
        assertEquals(NoteKind.FIX, l.kind)
        assertEquals("The button stays on screen.", l.lead)
        assertEquals("Only the content scrolls.", l.rest)
        val plain = PatchNotes.parse("- One sentence only.").single()
        assertEquals(NoteKind.OTHER, plain.kind)
        assertEquals("One sentence only.", plain.lead)
        assertEquals("", plain.rest)
        // A number like 2.0 isn't the end of a sentence.
        assertEquals("Version 2.0 is out.", PatchNotes.parse("- Version 2.0 is out.").single().lead)
    }

    @Test fun `an update shows every release since the last one seen`() {
        val all = listOf("2.0.4", "2.0.10", "2.0.8", "2.0.9", "README.md")
        assertEquals(listOf("2.0.10", "2.0.9", "2.0.8", "2.0.4"), PatchNotes.sorted(all))
        assertEquals(listOf("2.0.10", "2.0.9"), PatchNotes.sinceSeen(all, "2.0.8", "2.0.10"))
        assertEquals(listOf("2.0.9"), PatchNotes.sinceSeen(all, null, "2.0.9"))
    }

    @Test fun `every release has its notes in all five languages, line for line`() {
        val versions = dir.listFiles { f -> f.isDirectory && PatchNotes.isVersion(f.name) }.orEmpty()
        assertTrue(versions.isNotEmpty())
        versions.forEach { v ->
            val counts = listOf("en", "pt", "es", "fr", "de").associateWith { l ->
                val f = File(v, "$l.md")
                assertTrue("missing ${f.path}", f.exists())
                val lines = f.readLines().filter { it.isNotBlank() }
                assertTrue("${f.path}: every line starts with '- '", lines.all { it.startsWith("- ") })
                PatchNotes.parse(f.readText()).map { it.kind }
            }
            assertEquals("${v.name}: same changes and tags in every language", 1, counts.values.toSet().size)
        }
    }
}
