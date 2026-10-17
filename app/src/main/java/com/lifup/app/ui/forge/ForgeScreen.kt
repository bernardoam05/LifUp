package com.lifup.app.ui.forge

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material3.Checkbox
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.lifup.app.R
import com.lifup.app.domain.AutoKind
import com.lifup.app.domain.DefKind
import com.lifup.app.domain.QuestDef
import com.lifup.app.domain.QuestType
import com.lifup.app.domain.addDefToToday
import com.lifup.app.domain.deleteCustomDef
import com.lifup.app.domain.plainText
import com.lifup.app.domain.saveCustomDef
import com.lifup.app.domain.setDefEnabled
import com.lifup.app.ui.act
import com.lifup.app.ui.components.ConfirmDialog
import com.lifup.app.ui.components.EmptyNote
import com.lifup.app.ui.components.IconBadge
import com.lifup.app.ui.components.Panel
import com.lifup.app.ui.components.Pill
import com.lifup.app.ui.components.PrimaryButton
import com.lifup.app.ui.components.SectionTitle
import com.lifup.app.ui.content
import com.lifup.app.ui.fmtNum
import com.lifup.app.ui.gameState
import com.lifup.app.ui.lang
import com.lifup.app.ui.local
import com.lifup.app.domain.text
import com.lifup.app.ui.questColor
import com.lifup.app.ui.questIcon
import com.lifup.app.ui.questTypeName
import com.lifup.app.ui.autoName
import com.lifup.app.ui.unitLabel
import androidx.compose.foundation.layout.size
import com.lifup.app.ui.theme.Lif

@Composable
private fun TopBar(title: String, onBack: () -> Unit, action: @Composable () -> Unit = {}) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(4.dp)) {
        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, stringResource(R.string.back)) }
        Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
        action()
    }
}

@Composable
fun ForgeScreen(onBack: () -> Unit, onEdit: (String?) -> Unit) {
    val s = gameState()
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        TopBar(stringResource(R.string.forge), onBack) {
            IconButton(onClick = { onEdit(null) }) { Icon(Icons.Rounded.Add, stringResource(R.string.add), tint = Lif.colors.accent) }
        }
        LazyColumn(contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.navigationBarsPadding()) {
            item { Text(stringResource(R.string.forge_info), style = MaterialTheme.typography.bodySmall, color = Lif.colors.muted) }
            item { SectionTitle(stringResource(R.string.your_missions)) }
            if (s.customDefs.isEmpty()) item { EmptyNote(stringResource(R.string.no_custom)) }
            items(s.customDefs, key = { it.id }) { def -> DefRow(def, enabled = def.id !in s.disabledDefIds, onEdit = { onEdit(def.id) }) }
            // System missions grouped by type so it's clear what each family does.
            QuestType.entries.forEach { type ->
                val defs = content.quests.filter { it.type == type }
                if (defs.isEmpty()) return@forEach
                item(key = "h_$type") {
                    SectionTitle(stringResource(questTypeName(type))) {
                        Text("${defs.count { it.id !in s.disabledDefIds }}/${defs.size}", color = Lif.colors.dim, style = MaterialTheme.typography.labelMedium)
                    }
                }
                items(defs, key = { it.id }) { def -> DefRow(def, enabled = def.id !in s.disabledDefIds, onEdit = null) }
            }
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun DefRow(def: QuestDef, enabled: Boolean, onEdit: (() -> Unit)?) {
    val c = Lif.colors
    val color = questColor(def.type, c)
    val unit = unitLabel(def.unit)
    val dayNames = stringArrayResourceCompat()
    Panel(padding = PaddingValues(12.dp), onClick = onEdit) {
        Row(verticalAlignment = Alignment.Top) {
            IconBadge(questIcon(def.type), if (enabled) color else c.dim, 36.dp)
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(def.title.local(), style = MaterialTheme.typography.titleSmall, color = if (enabled) c.text else c.dim)
                Text(
                    def.description.local().replace("{target}", fmtNum(def.baseTarget)).replace("{unit}", unit),
                    style = MaterialTheme.typography.bodySmall, color = c.muted,
                )
            }
            Switch(checked = enabled, onCheckedChange = { on -> act { setDefEnabled(def.id, on) } })
        }
        Spacer(Modifier.height(6.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Pill(stringResource(questTypeName(def.type)), color)
            Pill(stringResource(if (def.kind == DefKind.CORE) R.string.kind_core else R.string.kind_pool), c.muted)
            def.auto?.let { Pill(stringResource(R.string.auto_badge) + " · " + stringResource(autoName(it)), c.green) }
            Pill("${fmtNum(def.baseTarget)} $unit", c.text)
            if (def.scalingAmount > 0) Pill(
                stringResource(R.string.scaling_chip, (if (def.descending) "−" else "+") + fmtNum(def.scalingAmount), def.scalingInterval), c.muted,
            )
            def.daysOfWeek?.let { days -> Pill(days.sorted().joinToString(" ") { dayNames[it - 1] }, c.muted) }
            Pill("+${def.baseXp} XP · +${def.baseGold}", c.accent)
            if (onEdit != null) Icon(Icons.Rounded.Edit, null, tint = c.muted, modifier = Modifier.size(16.dp))
        }
    }
}

private data class Preset(val label: Int, val xp: Int, val gold: Int)
private val PRESETS = listOf(Preset(R.string.preset_easy, 30, 8), Preset(R.string.preset_medium, 60, 15), Preset(R.string.preset_hard, 100, 30), Preset(R.string.preset_epic, 200, 60))

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DefEditorScreen(id: String?, onBack: () -> Unit) {
    val s = gameState()
    val existing = s.customDefs.firstOrNull { it.id == id }
    val c = Lif.colors
    val lang = lang()
    var title by rememberSaveable { mutableStateOf(existing?.title?.text(lang).orEmpty()) }
    var description by rememberSaveable { mutableStateOf(existing?.description?.text(lang).orEmpty()) }
    var type by rememberSaveable { mutableStateOf(existing?.type ?: QuestType.TRAINING) }
    var core by rememberSaveable { mutableStateOf(existing?.kind != DefKind.POOL) }
    var target by rememberSaveable { mutableStateOf(existing?.baseTarget?.let(::fmtNum) ?: "10") }
    var unit by rememberSaveable { mutableStateOf(existing?.unit ?: "reps") }
    var scaling by rememberSaveable { mutableStateOf(existing?.scalingAmount?.let(::fmtNum) ?: "0") }
    var interval by rememberSaveable { mutableStateOf((existing?.scalingInterval ?: 5).toString()) }
    var preset by rememberSaveable { mutableStateOf(PRESETS.indexOfFirst { it.xp == existing?.baseXp }.takeIf { it >= 0 } ?: 1) }
    val days = remember { mutableStateListOf<Int>().apply { addAll(existing?.daysOfWeek ?: (1..7).toList()) } }
    var addToday by rememberSaveable { mutableStateOf(existing == null) }
    var auto by rememberSaveable { mutableStateOf(existing?.auto) }
    var pomodoro by rememberSaveable { mutableStateOf(existing?.pomodoro ?: false) }
    var confirmDelete by rememberSaveable { mutableStateOf(false) }
    val dayNames = stringArrayResourceCompat()

    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        TopBar(stringResource(if (existing == null) R.string.new_mission else R.string.edit_mission), onBack) {
            if (existing != null) IconButton(onClick = { confirmDelete = true }) { Icon(Icons.Rounded.DeleteOutline, stringResource(R.string.delete), tint = c.red) }
        }
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).navigationBarsPadding(), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            OutlinedTextField(title, { title = it.take(60) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.field_title)) }, singleLine = true)
            OutlinedTextField(description, { description = it.take(240) }, Modifier.fillMaxWidth(), label = { Text(stringResource(R.string.field_description)) }, supportingText = { Text(stringResource(R.string.field_description_hint)) })
            Text(stringResource(R.string.field_auto), style = MaterialTheme.typography.labelLarge, color = c.muted)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = auto == null, onClick = { auto = null }, label = { Text(stringResource(R.string.auto_none)) })
                AutoKind.entries.forEach { k ->
                    FilterChip(selected = auto == k, onClick = {
                        auto = k
                        when (k) {
                            AutoKind.STEPS -> { type = QuestType.TRAINING; unit = "steps"; target = "6000" }
                            AutoKind.WALK_DISTANCE -> { type = QuestType.GPS; unit = "km"; target = "4" }
                            AutoKind.SCREEN_TIME -> { type = QuestType.LIMIT; unit = "h"; target = "3" }
                            AutoKind.DISTRACTION_TIME -> { type = QuestType.LIMIT; unit = "h"; target = "1" }
                        }
                    }, label = { Text(stringResource(autoName(k))) })
                }
            }
            if (auto != null) Text(stringResource(R.string.field_auto_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
            Text(stringResource(R.string.field_type), style = MaterialTheme.typography.labelLarge, color = c.muted)
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                QuestType.entries.forEach { t -> FilterChip(selected = type == t, enabled = auto == null, onClick = { type = t; if (t == QuestType.FOCUS) unit = "min"; if (t == QuestType.GPS) unit = "km" }, label = { Text(stringResource(questTypeName(t))) }) }
            }
            if (type == QuestType.FOCUS) Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = !pomodoro, onClick = { pomodoro = false }, label = { Text(stringResource(R.string.mode_timer)) })
                FilterChip(selected = pomodoro, onClick = { pomodoro = true }, label = { Text(stringResource(R.string.mode_pomodoro)) })
            }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                FilterChip(selected = core, onClick = { core = true }, label = { Text(stringResource(R.string.kind_core)) })
                FilterChip(selected = !core, onClick = { core = false }, label = { Text(stringResource(R.string.kind_pool)) })
            }
            Text(stringResource(if (core) R.string.kind_core_info else R.string.kind_pool_info), style = MaterialTheme.typography.bodySmall, color = c.muted)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(target, { target = it.filter { ch -> ch.isDigit() || ch == '.' }.take(6) }, Modifier.weight(1f), label = { Text(stringResource(R.string.field_target)) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                OutlinedTextField(unit, { unit = it.take(12) }, Modifier.weight(1f), label = { Text(stringResource(R.string.field_unit)) }, singleLine = true, enabled = auto == null && type != QuestType.FOCUS && type != QuestType.GPS)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(scaling, { scaling = it.filter { ch -> ch.isDigit() || ch == '.' }.take(5) }, Modifier.weight(1f), label = { Text(stringResource(R.string.field_scaling)) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                OutlinedTextField(interval, { interval = it.filter(Char::isDigit).take(3) }, Modifier.weight(1f), label = { Text(stringResource(R.string.field_interval)) }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
            }
            Text(stringResource(R.string.field_scaling_hint), style = MaterialTheme.typography.bodySmall, color = c.muted)
            Text(stringResource(R.string.field_reward), style = MaterialTheme.typography.labelLarge, color = c.muted)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                PRESETS.forEachIndexed { i, p -> FilterChip(selected = preset == i, onClick = { preset = i }, label = { Text(stringResource(p.label)) }) }
            }
            Text("+${PRESETS[preset].xp} XP · +${PRESETS[preset].gold}", style = MaterialTheme.typography.labelMedium, color = c.accent)
            Text(stringResource(R.string.field_days), style = MaterialTheme.typography.labelLarge, color = c.muted)
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                (1..7).forEach { d -> FilterChip(selected = d in days, onClick = { if (d in days) days.remove(d) else days.add(d) }, label = { Text(dayNames[d - 1]) }) }
            }
            if (existing == null) Row(verticalAlignment = Alignment.CenterVertically) {
                Checkbox(addToday, { addToday = it })
                Text(stringResource(R.string.add_today), style = MaterialTheme.typography.bodyMedium)
            }
            val valid = title.isNotBlank() && (target.toDoubleOrNull() ?: 0.0) > 0 && days.isNotEmpty()
            PrimaryButton(stringResource(R.string.save), onClick = {
                val def = QuestDef(
                    id = existing?.id ?: "custom_${System.currentTimeMillis()}",
                    kind = if (core) DefKind.CORE else DefKind.POOL,
                    type = type,
                    title = plainText(title.trim()),
                    description = plainText(description.trim().ifEmpty { "{target} {unit}" }),
                    baseTarget = target.toDoubleOrNull() ?: 1.0,
                    scalingAmount = scaling.toDoubleOrNull() ?: 0.0,
                    scalingInterval = (interval.toIntOrNull() ?: 5).coerceAtLeast(1),
                    unit = unit.trim(),
                    baseXp = PRESETS[preset].xp,
                    baseGold = PRESETS[preset].gold,
                    daysOfWeek = days.sorted().takeIf { it.size < 7 },
                    auto = auto,
                    pomodoro = pomodoro && type == QuestType.FOCUS,
                    descending = auto == AutoKind.SCREEN_TIME || auto == AutoKind.DISTRACTION_TIME,
                )
                val today = addToday
                act { saveCustomDef(def); if (today) addDefToToday(def.id) }
                onBack()
            }, enabled = valid, modifier = Modifier.fillMaxWidth())
            Spacer(Modifier.height(24.dp))
        }
    }
    if (confirmDelete && existing != null) ConfirmDialog(
        stringResource(R.string.delete), stringResource(R.string.delete_mission_text), stringResource(R.string.delete),
        onConfirm = { act { deleteCustomDef(existing.id) }; onBack() }, onDismiss = { confirmDelete = false }, danger = true,
    )
}

@Composable
private fun stringArrayResourceCompat(): List<String> = androidx.compose.ui.res.stringArrayResource(R.array.weekdays_short).toList()
