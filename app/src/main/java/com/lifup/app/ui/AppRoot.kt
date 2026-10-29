package com.lifup.app.ui

import com.lifup.app.domain.penaltyBlocks
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
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.draw.shadow
import androidx.compose.foundation.layout.height
import androidx.compose.ui.res.pluralStringResource
import com.lifup.app.domain.FlameKind
import com.lifup.app.domain.flame
import com.lifup.app.domain.dayGoal
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
            WhatsNew()
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
    // With the app open across midnight the day closes on the dot, report included, instead of waiting for the
    // alarm (late on phones that delay it) or for the next tap, which would close it silently and land on the new day.
    LaunchedEffect(s.day) {
        val nextDay = java.time.LocalDate.now().plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli()
        kotlinx.coroutines.delay((nextDay - System.currentTimeMillis()).coerceAtLeast(0) + 1_000)
        act { }
    }
    LaunchedEffect(deepLink) {
        Tab.entries.firstOrNull { it.route == deepLink }?.let { pager.scrollToPage(it.ordinal) }
        if (deepLink == "boss") {
            pager.scrollToPage(Tab.TODAY.ordinal)
            openQuest = s.boss?.let { b -> b.second?.takeIf { it.status == com.lifup.app.domain.QuestStatus.OPEN }?.id ?: b.challenge.id }
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
                    Tab.FOCUS -> FocusScreen(s, active = pager.settledPage == page)
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
            StreakFlame(s)
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
                        stringResource(if (s.penaltyBlocks()) R.string.block_ends_in else R.string.penalty_ends_in, left),
                        style = MaterialTheme.typography.labelSmall, color = Lif.colors.red, modifier = Modifier.align(Alignment.CenterVertically),
                    )
                }
            }
        }
    }
}

/**
 * The streak in the HUD, coloured by how today stands (see [FlameKind]): an ember until the day
 * counts, lit once it does (with tonight's number), gold when every mission is kept, a flickering
 * blue while a lost streak can still be recovered. Getting hotter plays a burst; a tap explains it.
 */
@Composable
private fun StreakFlame(s: GameState) {
    val c = Lif.colors
    val flame = s.flame()
    var shown by remember { mutableStateOf(flame.kind) }
    val bump = remember { Animatable(1f) }
    val burst = remember { Animatable(1f) }
    LaunchedEffect(flame.kind) {
        if (flame.kind > shown && flame.kind >= FlameKind.SAFE) {
            launch { burst.snapTo(0f); burst.animateTo(1f, tween(800)) }
            bump.animateTo(1.8f, tween(160))
            bump.animateTo(1f, spring(dampingRatio = 0.3f, stiffness = 300f))
        }
        shown = flame.kind
    }
    val flicker by rememberInfiniteTransition(label = "flame").animateFloat(0.35f, 1f, infiniteRepeatable(tween(650), RepeatMode.Reverse), label = "flicker")
    val color = when (flame.kind) {
        FlameKind.REST -> c.purple
        FlameKind.RECOVERING -> c.blue
        FlameKind.PENDING -> c.dim
        FlameKind.SAFE -> c.orange
        FlameKind.PERFECT -> c.gold
    }
    var open by remember { mutableStateOf(false) }
    LaunchedEffect(open) { if (open) { kotlinx.coroutines.delay(6_000); open = false } }
    if (open) androidx.compose.ui.window.Popup(
        alignment = Alignment.TopEnd,
        offset = androidx.compose.ui.unit.IntOffset(0, with(androidx.compose.ui.platform.LocalDensity.current) { 32.dp.roundToPx() }),
        onDismissRequest = { open = false },
        properties = androidx.compose.ui.window.PopupProperties(focusable = true),
    ) { FlameCard(s, flame, color) { open = false } }
    Row(
        Modifier.clip(RoundedCornerShape(8.dp)).clickable { open = !open }.padding(horizontal = 2.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Fixed size: the glow and the burst are scaled, so changing state never moves the HUD.
        Box(Modifier.size(16.dp), contentAlignment = Alignment.Center) {
            if (flame.kind == FlameKind.PERFECT) Box(
                Modifier.size(16.dp).graphicsLayer { scaleX = 1.6f; scaleY = 1.6f }
                    .background(Brush.radialGradient(listOf(color.copy(alpha = 0.45f), Color.Transparent)), CircleShape),
            )
            if (burst.value < 1f) Box(
                Modifier.size(16.dp).graphicsLayer { scaleX = 1 + 2.2f * burst.value; scaleY = 1 + 2.2f * burst.value; alpha = 1 - burst.value }
                    .border(2.dp, color, CircleShape),
            )
            Icon(
                if (flame.kind == FlameKind.REST) Icons.Rounded.Bedtime else Icons.Rounded.LocalFireDepartment, null,
                tint = color.copy(alpha = if (flame.kind == FlameKind.RECOVERING) flicker else 1f),
                modifier = Modifier.size(16.dp).graphicsLayer { scaleX = bump.value; scaleY = bump.value },
            )
        }
        Spacer(Modifier.width(3.dp))
        AnimatedContent(flame.days, transitionSpec = { (slideInVertically { it } + fadeIn()) togetherWith (slideOutVertically { -it } + fadeOut()) }, label = "days") { d ->
            Text(d.toString(), style = MaterialTheme.typography.labelLarge, color = Lif.colors.text, maxLines = 1, softWrap = false)
        }
    }
}

/** What the flame means today: its state, what to do next and today's missions against the streak's minimum. */
@Composable
private fun FlameCard(s: GameState, flame: com.lifup.app.domain.Flame, color: Color, onClose: () -> Unit) {
    val c = Lif.colors
    val goal = s.dayGoal()
    val (title, body) = when (flame.kind) {
        FlameKind.REST -> R.string.flame_title_rest to stringResource(R.string.flame_rest)
        FlameKind.RECOVERING -> R.string.flame_title_recovering to stringResource(R.string.flame_recovering)
        FlameKind.PENDING -> R.string.flame_title_pending to (goal.needed - goal.kept).let { pluralStringResource(R.plurals.flame_pending, it, it) }
        FlameKind.SAFE -> R.string.flame_title_safe to stringResource(R.string.flame_safe)
        FlameKind.PERFECT -> R.string.flame_title_perfect to stringResource(R.string.flame_perfect)
    }
    Column(
        Modifier.padding(end = 8.dp).width(280.dp).shadow(12.dp, RoundedCornerShape(16.dp)).clip(RoundedCornerShape(16.dp))
            .background(c.panelHigh).border(1.dp, color.copy(alpha = 0.6f), RoundedCornerShape(16.dp)).clickable(onClick = onClose).padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(36.dp).background(color.copy(alpha = 0.16f), CircleShape), contentAlignment = Alignment.Center) {
                Icon(if (flame.kind == FlameKind.REST) Icons.Rounded.Bedtime else Icons.Rounded.LocalFireDepartment, null, tint = color, modifier = Modifier.size(22.dp))
            }
            Spacer(Modifier.width(10.dp))
            Column {
                Text(stringResource(title), style = MaterialTheme.typography.titleSmall, color = color)
                Text(pluralStringResource(R.plurals.flame_days, flame.days, flame.days), style = MaterialTheme.typography.labelMedium, color = c.muted)
            }
        }
        Text(body, style = MaterialTheme.typography.bodySmall, color = c.text)
        if (goal.total > 0 && flame.kind != FlameKind.REST) {
            // Today's missions, with a tick where the streak starts to count.
            Box(Modifier.fillMaxWidth()) {
                Bar(goal.kept / goal.total.toFloat(), color, height = 6.dp)
                Box(Modifier.fillMaxWidth(goal.needed / goal.total.toFloat()).height(6.dp), contentAlignment = Alignment.CenterEnd) {
                    Box(Modifier.width(2.dp).height(10.dp).background(c.text))
                }
            }
            Text(stringResource(R.string.flame_progress, goal.kept, goal.total), style = MaterialTheme.typography.labelSmall, color = c.dim)
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
