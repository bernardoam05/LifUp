package com.lifup.app.ui

import com.lifup.app.ui.hero.HeroNav
import com.lifup.app.domain.markItemsSeen
import com.lifup.app.domain.markEchoesSeen
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Badge
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.Paid
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material.icons.rounded.TaskAlt
import androidx.compose.material.icons.rounded.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import kotlinx.coroutines.launch
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.lifup.app.R
import com.lifup.app.domain.GameState
import com.lifup.app.domain.HunterRank
import com.lifup.app.domain.Rules
import com.lifup.app.ui.components.Bar
import com.lifup.app.ui.components.RankBadge
import com.lifup.app.ui.components.rememberNow
import com.lifup.app.ui.focus.FocusScreen
import com.lifup.app.ui.forge.DefEditorScreen
import com.lifup.app.ui.forge.ForgeScreen
import com.lifup.app.ui.hero.HeroScreen
import com.lifup.app.ui.onboarding.OnboardingScreen
import com.lifup.app.ui.rewards.RewardHost
import com.lifup.app.ui.settings.SettingsScreen
import com.lifup.app.ui.shop.ShopScreen
import com.lifup.app.ui.theme.Lif
import com.lifup.app.ui.theme.LifUpTheme
import com.lifup.app.ui.today.TodayScreen

/** Bottom tabs in display order: collect and spend on the left, act and grow on the right, Today in the middle. */
enum class Tab(val route: String, val icon: ImageVector, val label: Int) {
    SHOP("shop", Icons.Rounded.Storefront, R.string.tab_shop),
    ECHOES("echoes", Icons.Rounded.AutoAwesome, R.string.hero_shadows),
    TODAY("today", Icons.Rounded.TaskAlt, R.string.tab_today),
    FOCUS("focus", Icons.Rounded.Psychology, R.string.tab_focus),
    HERO("hero", Icons.Rounded.Person, R.string.tab_hero),
}

/** What's new behind a tab: echoes gained, items gained. */
private fun GameState.badge(t: Tab): Int = when (t) {
    Tab.ECHOES -> newEchoes.size
    Tab.HERO -> newItems.size
    else -> 0
}

val LocalSnackbar = staticCompositionLocalOf { SnackbarHostState() }

/** Lets nested screens switch tabs (e.g. "start focus" from a quest). */
val LocalTabSwitcher = staticCompositionLocalOf<(Tab) -> Unit> { {} }

@Composable
fun AppRoot(deepLink: String?, onDeepLinkConsumed: () -> Unit) {
    val s = gameState()
    LifUpTheme(s.settings.themeRank ?: HunterRank.of(s.player.level)) {
        Box(Modifier.fillMaxSize().background(Lif.colors.bg)) {
            if (!s.onboarded) {
                OnboardingScreen()
                return@Box
            }
            CrashPrompt()
            val nav = rememberNavController()
            NavHost(nav, startDestination = "main") {
                composable("main") {
                    MainScaffold(
                        s, deepLink, onDeepLinkConsumed,
                        openSettings = { nav.navigate("settings") },
                        openForge = { nav.navigate("forge") },
                        openDef = { nav.navigate("forge/$it") },
                    )
                }
                composable("settings") { SettingsScreen(onBack = { nav.popBackStack() }, openForge = { nav.navigate("forge") }) }
                composable("forge") { ForgeScreen(onBack = { nav.popBackStack() }, onEdit = { nav.navigate("forge/${it ?: "new"}") }) }
                composable("forge/{id}") { entry ->
                    DefEditorScreen(entry.arguments?.getString("id")?.takeIf { it != "new" }, onBack = { nav.popBackStack() })
                }
            }
        }
    }
}

@Composable
private fun MainScaffold(
    s: GameState,
    deepLink: String?,
    onDeepLinkConsumed: () -> Unit,
    openSettings: () -> Unit,
    openForge: () -> Unit,
    openDef: (String) -> Unit,
) {
    val pager = rememberPagerState(initialPage = Tab.TODAY.ordinal) { Tab.entries.size }
    val scope = rememberCoroutineScope()
    val tab = Tab.entries[pager.currentPage]
    val goTo: (Tab) -> Unit = { t -> scope.launch { pager.animateScrollToPage(t.ordinal) } }
    var openQuest by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(deepLink) {
        Tab.entries.firstOrNull { it.route == deepLink }?.let { pager.scrollToPage(it.ordinal) }
        if (deepLink == "boss") {
            pager.scrollToPage(Tab.TODAY.ordinal)
            openQuest = s.boss?.challenge?.id
        }
        // From widgets: open one mission, or prepare a focus session for it.
        if (deepLink?.startsWith("quest/") == true) {
            pager.scrollToPage(Tab.TODAY.ordinal)
            openQuest = deepLink.removePrefix("quest/")
        }
        if (deepLink?.startsWith("focus/") == true) {
            com.lifup.app.ui.focus.FocusPrep.questId = deepLink.removePrefix("focus/")
            pager.scrollToPage(Tab.FOCUS.ordinal)
        }
        if (deepLink != null) onDeepLinkConsumed()
    }
    // Leaving a tab marks its novelties as seen.
    var lastPage by remember { mutableStateOf(pager.settledPage) }
    LaunchedEffect(pager.settledPage) {
        when (Tab.entries[lastPage]) {
            Tab.ECHOES -> act { markEchoesSeen() }
            Tab.HERO -> if (HeroNav.section == 0) act { markItemsSeen() }
            else -> Unit
        }
        lastPage = pager.settledPage
    }
    val snackbar = remember { SnackbarHostState() }
    CompositionLocalProvider(LocalSnackbar provides snackbar, LocalTabSwitcher provides goTo) {
        Scaffold(
            containerColor = Lif.colors.bg,
            contentWindowInsets = WindowInsets(0),
            topBar = { Hud(s, openSettings) },
            snackbarHost = { SnackbarHost(snackbar) },
            bottomBar = {
                NavigationBar(containerColor = Lif.colors.panel, tonalElevation = 0.dp) {
                    Tab.entries.forEach { t ->
                        // Hidden on the open tab: its new items are on screen, tagged "new" until you leave.
                        val count = if (tab == t) 0 else s.badge(t)
                        NavigationBarItem(
                            selected = tab == t,
                            onClick = { goTo(t) },
                            icon = {
                                BadgedBox(badge = { if (count > 0) Badge(containerColor = Lif.colors.green, contentColor = Lif.colors.bg) { Text("$count") } }) {
                                    // The home tab gets a filled, slightly larger mark.
                                    if (t == Tab.TODAY) Box(Modifier.size(34.dp).clip(CircleShape).background(if (tab == t) Lif.colors.accent else Lif.colors.accent.copy(alpha = 0.18f)), contentAlignment = Alignment.Center) {
                                        Icon(t.icon, null, tint = if (tab == t) Lif.colors.bg else Lif.colors.accent)
                                    } else Icon(t.icon, null)
                                }
                            },
                            label = { Text(stringResource(t.label).uppercase(), style = MaterialTheme.typography.labelMedium) },
                            colors = NavigationBarItemDefaults.colors(
                                selectedIconColor = Lif.colors.accent,
                                selectedTextColor = Lif.colors.accent,
                                indicatorColor = Lif.colors.accent.copy(alpha = 0.12f),
                                unselectedIconColor = Lif.colors.dim,
                                unselectedTextColor = Lif.colors.dim,
                            ),
                        )
                    }
                }
            },
        ) { padding ->
            // Swipe between tabs; the bottom bar follows the pager.
            HorizontalPager(pager, Modifier.padding(padding).fillMaxSize(), beyondViewportPageCount = 1) { page ->
                when (Tab.entries[page]) {
                    Tab.TODAY -> TodayScreen(s, openForge, openDef, openQuest) { openQuest = null }
                    Tab.FOCUS -> FocusScreen(s)
                    Tab.ECHOES -> com.lifup.app.ui.hero.EchoesScreen(s, active = pager.settledPage == page)
                    Tab.HERO -> HeroScreen(s)
                    Tab.SHOP -> ShopScreen(s)
                }
            }
        }
        RewardHost(s)
        SoundCues(s)
        com.lifup.app.ui.guide.AutoGuide(s, Tab.entries[pager.settledPage])
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Hud(s: GameState, openSettings: () -> Unit) {
    val p = s.player
    val rank = HunterRank.of(p.level)
    val now = rememberNow(30_000)
    Column(Modifier.background(Lif.colors.panel).statusBarsPadding()) {
        Row(Modifier.fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            RankBadge(rank.label, accentRank(rank))
            Spacer(Modifier.width(12.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.Bottom) {
                    // The name gives way first; the level never wraps.
                    Text(p.name.ifBlank { stringResource(R.string.default_hunter) }.uppercase(), style = MaterialTheme.typography.titleMedium, maxLines = 1, overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis, modifier = Modifier.weight(1f, fill = false))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.level_short, p.level), style = MaterialTheme.typography.labelMedium, color = Lif.colors.accent, maxLines = 1, softWrap = false)
                }
                Spacer(Modifier.size(4.dp))
                Bar(p.xp / Rules.xpForLevel(p.level).toFloat(), height = 5.dp)
                Text("${p.xp} / ${Rules.xpForLevel(p.level)} XP", style = MaterialTheme.typography.labelSmall, color = Lif.colors.dim)
            }
            Spacer(Modifier.width(10.dp))
            HudChip(Icons.Rounded.Paid, fmtCompact(p.gold.toLong()), Lif.colors.gold)
            Spacer(Modifier.width(8.dp))
            HudChip(Icons.Rounded.LocalFireDepartment, p.streak.toString(), if (p.streak > 0) Lif.colors.red else Lif.colors.dim)
            IconButton(onClick = openSettings) { Icon(Icons.Rounded.Settings, stringResource(R.string.settings), tint = Lif.colors.muted) }
        }
        if (s.penalty.active) {
            // Wraps instead of squeezing, so large font sizes stay readable.
            FlowRow(
                Modifier.fillMaxWidth().background(Lif.colors.red.copy(alpha = 0.12f)).padding(horizontal = 16.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalArrangement = Arrangement.Center,
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.Warning, null, tint = Lif.colors.red, modifier = Modifier.size(14.dp))
                    Spacer(Modifier.width(8.dp))
                    Text(stringResource(R.string.penalty_banner).uppercase(), style = MaterialTheme.typography.labelMedium, color = Lif.colors.red)
                }
                if (s.penalty.blockEnd > now) {
                    val left = fmtShort(s.penalty.blockEnd - now)
                    Text(
                        stringResource(if (s.settings.blockOnPenalty) R.string.block_ends_in else R.string.penalty_ends_in, left),
                        style = MaterialTheme.typography.labelSmall, color = Lif.colors.red, modifier = Modifier.align(Alignment.CenterVertically),
                    )
                }
            }
        }
    }
}

@Composable
private fun HudChip(icon: ImageVector, value: String, color: androidx.compose.ui.graphics.Color) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = color, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(3.dp))
        Text(value, style = MaterialTheme.typography.labelLarge, color = Lif.colors.text, maxLines = 1, softWrap = false)
    }
}

fun accentRank(rank: HunterRank) = com.lifup.app.ui.theme.accentFor(rank)
