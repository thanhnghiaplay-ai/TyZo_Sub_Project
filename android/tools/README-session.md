# Android session/API regression checks

Run `android/tools/check-session.sh` with Kotlin JVM 2.0.21, Java 17+ and `TYZO_ANDROID_TEST_LIBS` pointing to test-only Maven jars: org.json/json 20240303, okhttp 4.12.0, okio-jvm 3.6.0. These dependencies stay outside the application/repository; production dependencies and lockfiles are unchanged. The script compiles actual Session.kt against a minimal filesystem Context adapter, then actual Api.kt against a loopback HTTP server. It never calls a provider, uses customer data, or accesses device/account secrets.

Checks: origin/account isolation; a late sync cannot overwrite a newer save or resurrect a cleared file; rejected sync remains retryable; acknowledgement is persisted only on the same revision; old unscoped files remain untouched; corrupt storage and failed writes are reported; SRT/VTT/TXT formatting is preserved; saved=false/missing receipt/offline or failed unlink are errors; stable userId is required for new linking.

The Context and Api stubs under session-check are JVM test adapters, not APK sources. api-check uses real OkHttp and a local JDK HTTP server. Device lifecycle, MediaProjection, permissions, Android filesystem durability, and installation are not established by these checks.

The new app requires `/api/app-me` and `/api/app-link` to return authenticated `userId`. Update the web before distributing this APK. Old app clients tolerate the additive response field. Historical `phien-gan-nhat.json` has no reliable owner; it is retained and quarantined, never attributed or uploaded automatically. Recovery/import needs trustworthy ownership evidence before production acceptance.
