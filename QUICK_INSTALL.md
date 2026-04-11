# Windows: Quick APK Installation Guide

## The Fastest Way

### 1. Open PowerShell on Windows
- Press `Win + X`
- Click "Windows PowerShell" or "Terminal"

### 2. Copy & Paste This:

```powershell
adb uninstall com.lextro.app
adb install -r "F:\Git floder(Project)\AuthorCompanion\frontend\android\app\build\outputs\apk\release\app-release.apk"
```

Press Enter and wait for **"Success"**

### 3. Go to Your Phone
- Tap the app icon on home screen (Gradient circle icon)
- Or swipe up to app drawer to find "Lextro"

### 4. Check
- ✅ Icon should be visible
- ✅ App launches immediately
- ✅ No splash screen

---

## If You Get "adb: not found"

You need to install Android SDK Platform Tools:

1. Download from: https://developer.android.com/studio/releases/platform-tools
2. Extract the ZIP file
3. Inside, you'll find `adb.exe`
4. Add this folder to Windows PATH:
   - Right-click "This PC" → Properties
   - Advanced system settings
   - Environment Variables
   - Add the platform-tools folder path

---

## If You Get "device not found"

On your **Android Phone:**

1. **Settings** → **About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings**
4. **Developer Options** → Turn ON
5. **USB Debugging** → Turn ON
6. Connect phone to PC with USB cable
7. Accept the debugging prompt on phone
8. Try the install command again

---

## The APK File Location

```
F:\Git floder(Project)\AuthorCompanion\frontend\android\app\build\outputs\apk\release\app-release.apk
```

---

## Troubleshooting Commands

```powershell
# Check if adb is installed
adb version

# Check if phone is connected
adb devices

# See connected devices details
adb devices -l

# View installation logs
adb logcat

# Uninstall app
adb uninstall com.lextro.app

# Install APK
adb install -r "F:\Git floder(Project)\AuthorCompanion\frontend\android\app\build\outputs\apk\release\app-release.apk"

# Launch app after install
adb shell am start -n com.lextro.app/.MainActivity

# Clear app cache
adb shell pm clear com.lextro.app
```

---

## What You Should See

**Success Output:**
```
Success
```

**Then on your phone:**
- Beautiful gradient icon (Teal → Violet)
- Label: "Lextro"
- App launches immediately
- No splash screen

---

## That's It!

The app icon is now visible and the app launches directly without any splash screen hiding it. 🎉
