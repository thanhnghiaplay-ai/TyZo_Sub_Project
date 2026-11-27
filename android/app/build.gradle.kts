plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Địa chỉ web mặc định điền sẵn trong ứng dụng. Đặt bằng biến TYZO_WEB_URL khi đóng gói (GitHub: Settings → Variables).
// Để trống thì khách tự gõ một lần.
val webUrl: String = (System.getenv("TYZO_WEB_URL") ?: "").trim().trimEnd('/')

// Khóa ký cố định (để cài bản mới đè bản cũ). Chỉ có khi máy đóng gói được cấp bí mật; không có thì ký khóa thử.
val keystorePath: String? = System.getenv("ANDROID_KEYSTORE_PATH")?.takeIf { it.isNotBlank() && file(it).exists() }

android {
    namespace = "vn.tyzo.sub"
    compileSdk = 35

    defaultConfig {
        applicationId = "vn.tyzo.sub"
        // Thu âm ứng dụng khác (AudioPlaybackCapture) chỉ có từ Android 10 (API 29).
        minSdk = 29
        targetSdk = 35
        versionCode = 13
        versionName = "0.13"
        buildConfigField("String", "WEB_URL", "\"$webUrl\"")
    }

    buildFeatures {
        buildConfig = true
    }

    signingConfigs {
        if (keystorePath != null) {
            create("tyzo") {
                storeFile = file(keystorePath)
                storePassword = System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias = System.getenv("ANDROID_KEY_ALIAS")
                keyPassword = System.getenv("ANDROID_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = false
            signingConfig = if (keystorePath != null) signingConfigs.getByName("tyzo") else signingConfigs.getByName("debug")
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

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
}
