# 🚀 Local Android Build Setup (Capacitor)

## Prerequisites
- Android Studio installed
- Android SDK (API 31+)
- Java 17+ installed
- Gradle configured

## Build Steps

### 1. Build Web Assets (Do This First!)
```bash
cd frontend
npm run build
```
This creates `dist/` folder with all web code.

### 2. Sync to Android App
```bash
cd ..
npx cap sync android
```
This copies web assets to Android app folder.

### 3. Open in Android Studio
```bash
npx cap open android
```
This opens the Android Studio project automatically.

### 4. Build APK (In Android Studio)
1. Wait for Gradle to finish syncing
2. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK**
3. APK will be created in: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5. Install on Device/Emulator
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## Local Development Workflow

### For Testing Changes:
```bash
# 1. Make code changes in frontend/src/
# 2. Rebuild
npm run build

# 3. Sync to Android
npx cap sync android

# 4. Rebuild APK in Android Studio
```

## Mobile Text Not Showing - Fix

**Problem**: Text appears too small on mobile screens
**Fix**: Update `frontend/src/styles/index.css` with mobile-optimized font sizes

---

## Device-Aware Responsive Updates

Mobile optimizations already applied:
- ✅ Font scaling for mobile
- ✅ Touch-friendly button sizes (min 48px)
- ✅ Safe area padding for notched phones
- ✅ Responsive grid (5/8/12 words per device)
- ✅ Infinite scroll with small batches on mobile

## Environment Check

```bash
# Verify Android SDK
echo $ANDROID_HOME

# If not set, add to .bashrc/.zshrc:
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

---

**Status**: Ready for local Android builds ✅
