plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("org.jetbrains.kotlin.plugin.serialization")
}

android {
    namespace = "com.lifup.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.lifup.app"
        minSdk = 26
        targetSdk = 36
        // Release builds take the version from the tag (-PappVersion=2.1.0); the code follows it, so 2.1.0 is 20100.
        val appVersion = (findProperty("appVersion") as String?)?.removePrefix("v") ?: "2.0.0"
        val (major, minor, patch) = (appVersion.split('.').map { it.toInt() } + listOf(0, 0)).take(3)
        versionCode = major * 10_000 + minor * 100 + patch
        versionName = appVersion
        // Pair quests' Firebase project (docs/PAIRS.md, section 5). Not secrets: the key only works for this app,
        // and the security rules decide what any client may do.
        buildConfigField("String", "FIREBASE_PROJECT", "\"questborn-38f2a\"")
        buildConfigField("String", "FIREBASE_APP_ID", "\"1:382154712615:android:79cd702cd5c23e3fd4d002\"")
        buildConfigField("String", "FIREBASE_API_KEY", "\"AIzaSyD-0xUx5exVsBbFFckaUDBSZaaerGP8ju8\"")
    }

    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
        // Google Play: the upload key, from the environment (a CI secret or a local file); Play re-signs with its own.
        create("upload") {
            System.getenv("UPLOAD_KEYSTORE")?.let { storeFile = file(it) }
            storePassword = System.getenv("UPLOAD_KEYSTORE_PASSWORD")
            keyAlias = System.getenv("UPLOAD_KEY_ALIAS")
            keyPassword = System.getenv("UPLOAD_KEY_PASSWORD")
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }

    // Where the app is distributed. github: APKs on GitHub releases that update themselves (signed with the key
    // the installed base already has). play: the Play Store, which updates it; no self-updater, no install permission.
    flavorDimensions += "store"
    productFlavors {
        create("github") {
            dimension = "store"
            isDefault = true
            buildConfigField("boolean", "SELF_UPDATE", "true")
            signingConfig = signingConfigs.getByName("debug")
        }
        create("play") {
            dimension = "store"
            buildConfigField("boolean", "SELF_UPDATE", "false")
            signingConfig = signingConfigs.getByName(if (System.getenv("UPLOAD_KEYSTORE") != null) "upload" else "debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures { compose = true; buildConfig = true }
    testOptions { unitTests.isReturnDefaultValues = true }
}

/** Copies release-notes/<version>/<lang>.md into the APK's assets, so every release's notes ship with the app. */
abstract class BundleReleaseNotes : DefaultTask() {
    @get:InputDirectory
    @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val notes: DirectoryProperty

    @get:OutputDirectory
    abstract val outputDir: DirectoryProperty

    @TaskAction
    fun copy() {
        val out = outputDir.get().asFile.resolve("release-notes")
        out.deleteRecursively()
        notes.get().asFile.listFiles { f -> f.isDirectory }?.forEach { dir ->
            dir.listFiles { f -> f.extension == "md" }?.forEach { it.copyTo(out.resolve("${dir.name}/${it.name}"), overwrite = true) }
        }
    }
}

val bundleReleaseNotes = tasks.register<BundleReleaseNotes>("bundleReleaseNotes") {
    notes.set(rootProject.layout.projectDirectory.dir("release-notes"))
}

androidComponents {
    onVariants { variant ->
        variant.sources.assets?.addGeneratedSourceDirectory(bundleReleaseNotes, BundleReleaseNotes::outputDir)
    }
}

kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2025.10.00")
    implementation(composeBom)
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.activity:activity-compose:1.11.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.9.4")
    implementation("androidx.lifecycle:lifecycle-process:2.9.4")
    implementation("androidx.navigation:navigation-compose:2.9.5")
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.work:work-runtime-ktx:2.10.5")
    implementation("androidx.glance:glance-appwidget:1.1.1")
    implementation("androidx.glance:glance-material3:1.1.1")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.9.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-play-services:1.10.2")
    implementation("com.google.android.gms:play-services-fitness:21.2.0")
    // Pair quests only; started by hand (no google-services plugin), and only once someone uses them.
    implementation(platform("com.google.firebase:firebase-bom:34.5.0"))
    implementation("com.google.firebase:firebase-auth")
    implementation("com.google.firebase:firebase-firestore")
    // LifUp+ through Google Play Billing: only the Play build sells anything.
    "playImplementation"("com.android.billingclient:billing:8.0.0")
    debugImplementation("androidx.compose.ui:ui-tooling")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
}
