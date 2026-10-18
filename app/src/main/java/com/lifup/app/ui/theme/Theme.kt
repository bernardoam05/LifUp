package com.lifup.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.lifup.app.R
import com.lifup.app.domain.HunterRank

val Rajdhani = FontFamily(
    Font(R.font.rajdhani_regular, FontWeight.Normal),
    Font(R.font.rajdhani_medium, FontWeight.Medium),
    Font(R.font.rajdhani_bold, FontWeight.Bold),
)

@Immutable
data class Palette(
    val bg: Color = Color(0xFF0B0D14),
    val panel: Color = Color(0xFF141824),
    val panelHigh: Color = Color(0xFF1B2030),
    val border: Color = Color(0xFF262C3E),
    val text: Color = Color(0xFFE6E7EE),
    val muted: Color = Color(0xFF9497A8),
    val dim: Color = Color(0xFF7A7F93),
    val accent: Color = Color(0xFF00D4FF),
    val red: Color = Color(0xFFEF4444),
    val gold: Color = Color(0xFFF5B342),
    val green: Color = Color(0xFF22C55E),
    val purple: Color = Color(0xFFA855F7),
    val blue: Color = Color(0xFF3B82F6),
    /** Training missions: energetic without reading as danger, which red is kept for. */
    val orange: Color = Color(0xFFFF8A4C),
)

/** Each hunter rank tints the interface with its own accent. */
fun accentFor(rank: HunterRank): Color = when (rank) {
    HunterRank.E -> Color(0xFF00D4FF)
    HunterRank.D -> Color(0xFF10D9A0)
    HunterRank.C -> Color(0xFF4F8CFF)
    HunterRank.B -> Color(0xFFA27BFF)
    HunterRank.A -> Color(0xFFFFA53D)
    HunterRank.S -> Color(0xFFFF4D5E)
    HunterRank.N -> Color(0xFFFFD866)
}

val LocalPalette = staticCompositionLocalOf { Palette() }

object Lif {
    val colors: Palette @Composable get() = LocalPalette.current
}

private fun typography(): Typography {
    val display = TextStyle(fontFamily = Rajdhani, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
    return Typography(
        displaySmall = display.copy(fontSize = 34.sp),
        headlineSmall = display.copy(fontSize = 24.sp),
        titleLarge = display.copy(fontSize = 20.sp),
        titleMedium = display.copy(fontSize = 17.sp, letterSpacing = 0.5.sp),
        titleSmall = display.copy(fontSize = 14.sp, letterSpacing = 1.2.sp),
        labelLarge = TextStyle(fontFamily = Rajdhani, fontWeight = FontWeight.Bold, fontSize = 15.sp, letterSpacing = 1.sp),
        labelMedium = TextStyle(fontFamily = Rajdhani, fontWeight = FontWeight.Medium, fontSize = 13.sp, letterSpacing = 0.8.sp),
        labelSmall = TextStyle(fontFamily = Rajdhani, fontWeight = FontWeight.Medium, fontSize = 11.sp, letterSpacing = 0.8.sp),
        bodyLarge = TextStyle(fontSize = 15.sp, lineHeight = 21.sp),
        bodyMedium = TextStyle(fontSize = 14.sp, lineHeight = 19.sp),
        bodySmall = TextStyle(fontSize = 12.sp, lineHeight = 16.sp),
    )
}

@Composable
fun LifUpTheme(rank: HunterRank, content: @Composable () -> Unit) {
    val palette = Palette(accent = accentFor(rank))
    val scheme = darkColorScheme(
        primary = palette.accent,
        onPrimary = Color(0xFF071018),
        secondary = palette.purple,
        background = palette.bg,
        onBackground = palette.text,
        surface = palette.panel,
        onSurface = palette.text,
        surfaceVariant = palette.panelHigh,
        onSurfaceVariant = palette.muted,
        surfaceContainer = palette.panel,
        surfaceContainerHigh = palette.panelHigh,
        surfaceContainerHighest = palette.panelHigh,
        surfaceContainerLow = palette.panel,
        outline = palette.border,
        outlineVariant = palette.border,
        error = palette.red,
    )
    CompositionLocalProvider(LocalPalette provides palette, androidx.compose.material3.LocalContentColor provides palette.text) {
        MaterialTheme(colorScheme = scheme, typography = typography(), content = content)
    }
}
