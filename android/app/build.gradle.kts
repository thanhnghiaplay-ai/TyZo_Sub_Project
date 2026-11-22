plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "vn.tyzo.sub.thu"
    compileSdk = 35

    defaultConfig {
        applicationId = "vn.tyzo.sub.thu"
        // AudioPlaybackCapture chỉ có từ Android 10 (API 29).
        minSdk = 29
        targetSdk = 35
        versionCode = 1
        versionName = "0.1-thu"
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}
