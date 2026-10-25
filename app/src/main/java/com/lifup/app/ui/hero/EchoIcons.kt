package com.lifup.app.ui.hero

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.AcUnit
import androidx.compose.material.icons.rounded.AccountBalance
import androidx.compose.material.icons.rounded.Air
import androidx.compose.material.icons.rounded.AllInclusive
import androidx.compose.material.icons.rounded.Architecture
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.AutoFixHigh
import androidx.compose.material.icons.rounded.AutoStories
import androidx.compose.material.icons.rounded.Autorenew
import androidx.compose.material.icons.rounded.Balance
import androidx.compose.material.icons.rounded.Bedtime
import androidx.compose.material.icons.rounded.Bloodtype
import androidx.compose.material.icons.rounded.Bolt
import androidx.compose.material.icons.rounded.Brightness3
import androidx.compose.material.icons.rounded.Brightness4
import androidx.compose.material.icons.rounded.Brightness7
import androidx.compose.material.icons.rounded.Brush
import androidx.compose.material.icons.rounded.BugReport
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Castle
import androidx.compose.material.icons.rounded.Category
import androidx.compose.material.icons.rounded.Cloud
import androidx.compose.material.icons.rounded.CrueltyFree
import androidx.compose.material.icons.rounded.Cyclone
import androidx.compose.material.icons.rounded.Dangerous
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Diamond
import androidx.compose.material.icons.rounded.DoorFront
import androidx.compose.material.icons.rounded.Egg
import androidx.compose.material.icons.rounded.EmojiEvents
import androidx.compose.material.icons.rounded.EmojiNature
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.EventRepeat
import androidx.compose.material.icons.rounded.Explore
import androidx.compose.material.icons.rounded.Fireplace
import androidx.compose.material.icons.rounded.FitnessCenter
import androidx.compose.material.icons.rounded.Flare
import androidx.compose.material.icons.rounded.Forest
import androidx.compose.material.icons.rounded.Fort
import androidx.compose.material.icons.rounded.Gavel
import androidx.compose.material.icons.rounded.Grass
import androidx.compose.material.icons.rounded.Handshake
import androidx.compose.material.icons.rounded.Handyman
import androidx.compose.material.icons.rounded.Hardware
import androidx.compose.material.icons.rounded.Hiking
import androidx.compose.material.icons.rounded.HistoryEdu
import androidx.compose.material.icons.rounded.Hive
import androidx.compose.material.icons.rounded.HourglassBottom
import androidx.compose.material.icons.rounded.HourglassEmpty
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.Landscape
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.Link
import androidx.compose.material.icons.rounded.LocalFireDepartment
import androidx.compose.material.icons.rounded.LocalLibrary
import androidx.compose.material.icons.rounded.MedicalServices
import androidx.compose.material.icons.rounded.Memory
import androidx.compose.material.icons.rounded.MilitaryTech
import androidx.compose.material.icons.rounded.MusicNote
import androidx.compose.material.icons.rounded.Nightlight
import androidx.compose.material.icons.rounded.NightsStay
import androidx.compose.material.icons.rounded.Opacity
import androidx.compose.material.icons.rounded.Paid
import androidx.compose.material.icons.rounded.Park
import androidx.compose.material.icons.rounded.PestControl
import androidx.compose.material.icons.rounded.PestControlRodent
import androidx.compose.material.icons.rounded.Pets
import androidx.compose.material.icons.rounded.Phishing
import androidx.compose.material.icons.rounded.Psychology
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Recycling
import androidx.compose.material.icons.rounded.RocketLaunch
import androidx.compose.material.icons.rounded.Savings
import androidx.compose.material.icons.rounded.School
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Security
import androidx.compose.material.icons.rounded.SelfImprovement
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Shield
import androidx.compose.material.icons.rounded.SmartToy
import androidx.compose.material.icons.rounded.SoupKitchen
import androidx.compose.material.icons.rounded.Spa
import androidx.compose.material.icons.rounded.Speed
import androidx.compose.material.icons.rounded.SportsKabaddi
import androidx.compose.material.icons.rounded.SportsMartialArts
import androidx.compose.material.icons.rounded.SportsMma
import androidx.compose.material.icons.rounded.Stars
import androidx.compose.material.icons.rounded.Terrain
import androidx.compose.material.icons.rounded.TheaterComedy
import androidx.compose.material.icons.rounded.Thunderstorm
import androidx.compose.material.icons.rounded.Translate
import androidx.compose.material.icons.rounded.Visibility
import androidx.compose.material.icons.rounded.VisibilityOff
import androidx.compose.material.icons.rounded.VolunteerActivism
import androidx.compose.material.icons.rounded.Waves
import androidx.compose.material.icons.rounded.WbSunny
import androidx.compose.material.icons.rounded.WbTwilight
import androidx.compose.material.icons.rounded.Whatshot
import androidx.compose.material.icons.rounded.WorkspacePremium
import androidx.compose.ui.graphics.vector.ImageVector
import com.lifup.app.domain.ShadowDef
import com.lifup.app.ui.shadowIcon

/** Generated from shadows.json: the figure each echo shows (its "icon" field). */
private val ECHO_ICONS: Map<String, ImageVector> = mapOf(
    "AcUnit" to Icons.Rounded.AcUnit,
    "AccountBalance" to Icons.Rounded.AccountBalance,
    "Air" to Icons.Rounded.Air,
    "AllInclusive" to Icons.Rounded.AllInclusive,
    "Architecture" to Icons.Rounded.Architecture,
    "AutoAwesome" to Icons.Rounded.AutoAwesome,
    "AutoFixHigh" to Icons.Rounded.AutoFixHigh,
    "AutoStories" to Icons.Rounded.AutoStories,
    "Autorenew" to Icons.Rounded.Autorenew,
    "Balance" to Icons.Rounded.Balance,
    "Bedtime" to Icons.Rounded.Bedtime,
    "Bloodtype" to Icons.Rounded.Bloodtype,
    "Bolt" to Icons.Rounded.Bolt,
    "Brightness3" to Icons.Rounded.Brightness3,
    "Brightness4" to Icons.Rounded.Brightness4,
    "Brightness7" to Icons.Rounded.Brightness7,
    "Brush" to Icons.Rounded.Brush,
    "BugReport" to Icons.Rounded.BugReport,
    "CalendarMonth" to Icons.Rounded.CalendarMonth,
    "Castle" to Icons.Rounded.Castle,
    "Category" to Icons.Rounded.Category,
    "Cloud" to Icons.Rounded.Cloud,
    "CrueltyFree" to Icons.Rounded.CrueltyFree,
    "Cyclone" to Icons.Rounded.Cyclone,
    "Dangerous" to Icons.Rounded.Dangerous,
    "DarkMode" to Icons.Rounded.DarkMode,
    "Diamond" to Icons.Rounded.Diamond,
    "DoorFront" to Icons.Rounded.DoorFront,
    "Egg" to Icons.Rounded.Egg,
    "EmojiEvents" to Icons.Rounded.EmojiEvents,
    "EmojiNature" to Icons.Rounded.EmojiNature,
    "EventAvailable" to Icons.Rounded.EventAvailable,
    "EventRepeat" to Icons.Rounded.EventRepeat,
    "Explore" to Icons.Rounded.Explore,
    "Fireplace" to Icons.Rounded.Fireplace,
    "FitnessCenter" to Icons.Rounded.FitnessCenter,
    "Flare" to Icons.Rounded.Flare,
    "Forest" to Icons.Rounded.Forest,
    "Fort" to Icons.Rounded.Fort,
    "Gavel" to Icons.Rounded.Gavel,
    "Grass" to Icons.Rounded.Grass,
    "Handshake" to Icons.Rounded.Handshake,
    "Handyman" to Icons.Rounded.Handyman,
    "Hardware" to Icons.Rounded.Hardware,
    "Hiking" to Icons.Rounded.Hiking,
    "HistoryEdu" to Icons.Rounded.HistoryEdu,
    "Hive" to Icons.Rounded.Hive,
    "HourglassBottom" to Icons.Rounded.HourglassBottom,
    "HourglassEmpty" to Icons.Rounded.HourglassEmpty,
    "Inventory2" to Icons.Rounded.Inventory2,
    "Landscape" to Icons.Rounded.Landscape,
    "LightMode" to Icons.Rounded.LightMode,
    "Link" to Icons.Rounded.Link,
    "LocalFireDepartment" to Icons.Rounded.LocalFireDepartment,
    "LocalLibrary" to Icons.Rounded.LocalLibrary,
    "MedicalServices" to Icons.Rounded.MedicalServices,
    "Memory" to Icons.Rounded.Memory,
    "MilitaryTech" to Icons.Rounded.MilitaryTech,
    "MusicNote" to Icons.Rounded.MusicNote,
    "Nightlight" to Icons.Rounded.Nightlight,
    "NightsStay" to Icons.Rounded.NightsStay,
    "Opacity" to Icons.Rounded.Opacity,
    "Paid" to Icons.Rounded.Paid,
    "Park" to Icons.Rounded.Park,
    "PestControl" to Icons.Rounded.PestControl,
    "PestControlRodent" to Icons.Rounded.PestControlRodent,
    "Pets" to Icons.Rounded.Pets,
    "Phishing" to Icons.Rounded.Phishing,
    "Psychology" to Icons.Rounded.Psychology,
    "Public" to Icons.Rounded.Public,
    "Recycling" to Icons.Rounded.Recycling,
    "RocketLaunch" to Icons.Rounded.RocketLaunch,
    "Savings" to Icons.Rounded.Savings,
    "School" to Icons.Rounded.School,
    "Science" to Icons.Rounded.Science,
    "Security" to Icons.Rounded.Security,
    "SelfImprovement" to Icons.Rounded.SelfImprovement,
    "Settings" to Icons.Rounded.Settings,
    "Shield" to Icons.Rounded.Shield,
    "SmartToy" to Icons.Rounded.SmartToy,
    "SoupKitchen" to Icons.Rounded.SoupKitchen,
    "Spa" to Icons.Rounded.Spa,
    "Speed" to Icons.Rounded.Speed,
    "SportsKabaddi" to Icons.Rounded.SportsKabaddi,
    "SportsMartialArts" to Icons.Rounded.SportsMartialArts,
    "SportsMma" to Icons.Rounded.SportsMma,
    "Stars" to Icons.Rounded.Stars,
    "Terrain" to Icons.Rounded.Terrain,
    "TheaterComedy" to Icons.Rounded.TheaterComedy,
    "Thunderstorm" to Icons.Rounded.Thunderstorm,
    "Translate" to Icons.Rounded.Translate,
    "Visibility" to Icons.Rounded.Visibility,
    "VisibilityOff" to Icons.Rounded.VisibilityOff,
    "VolunteerActivism" to Icons.Rounded.VolunteerActivism,
    "Waves" to Icons.Rounded.Waves,
    "WbSunny" to Icons.Rounded.WbSunny,
    "WbTwilight" to Icons.Rounded.WbTwilight,
    "Whatshot" to Icons.Rounded.Whatshot,
    "WorkspacePremium" to Icons.Rounded.WorkspacePremium,
)

/** The echo's own figure, or its class's when it has none. */
fun ShadowDef.figure(): ImageVector = icon?.let { ECHO_ICONS[it] } ?: shadowIcon(shadowClass)
