# ELK Explorer Mobile App

Cross-platform mobile application for **ELK Explorer** built with [React Native](https://reactnative.dev/) and [Expo (SDK 54)](https://docs.expo.dev/).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Clone & Pull the Code](#step-1-clone--pull-the-code)
3. [Step 2: Install Dependencies & Configure Environment](#step-2-install-dependencies--configure-environment)
4. [Step 3: Authenticate with Expo & EAS](#step-3-authenticate-with-expo--eas)
5. [Step 4: Verify App Identifiers & EAS Configuration](#step-4-verify-app-identifiers--eas-configuration)
6. [Step 5: Configure Build Credentials (Apple & Google)](#step-5-configure-build-credentials-apple--google)
7. [Step 6: Create Builds with EAS](#step-6-create-builds-with-eas)
8. [Step 7: Submit to App Stores](#step-7-submit-to-app-stores)
9. [Local Development Commands](#local-development-commands)
10. [Troubleshooting & Common Issues](#troubleshooting--common-issues)

---

## Prerequisites

Before starting, make sure you have the following installed on your machine:

- **Node.js**: `v20.x` or `v24.x` (LTS recommended)
- **npm**: `v10.x` or higher (comes with Node.js)
- **Git**: Installed and configured
- **EAS CLI** (Expo Application Services CLI):
  ```bash
  npm install -g eas-cli
  ```
  Verify installation:
  ```bash
  eas --version
  ```
- *(Optional for local iOS/Android builds)*:
  - macOS with **Xcode** (for iOS simulator & local builds)
  - **Android Studio** with Android SDK and emulator (for local Android builds)

---

## Step 1: Clone & Pull the Code

If you haven't cloned the repository yet:

```bash
git clone <REPOSITORY_URL>
cd elkApp
```

If you already have the repository cloned, pull the latest changes from your branch:

```bash
# Switch to the target branch (e.g., main)
git checkout main

# Fetch and pull latest commits
git pull origin main
```

---

## Step 2: Install Dependencies & Configure Environment

### 1. Install Node modules
Install dependencies using `npm`:

```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file in the root directory by copying the sample:

```bash
cp .env.example .env
```

Ensure the `.env` file contains the required endpoints:

```env
EXPO_OS=ios
EXPO_PUBLIC_MBTILES_URL=https://keystoneelkcou.wpenginepowered.com/wp-json/elk/v1/map-download
EXPO_PUBLIC_SITE_URL=https://keystoneelkcou.wpenginepowered.com/
EXPO_PUBLIC_OSRM_URL=https://keystoneelkcou.wpenginepowered.com/wp-json/elk/v1/route
EXPO_PUBLIC_GLYPHS_URL=https://tiles.basemaps.cartocdn.com/fonts/{fontstack}/{range}.pbf
```

---

## Step 3: Authenticate with Expo & EAS

Both Expo and EAS require you to log in with an Expo account that has access to the project organization (`nixonmedias-team`).

### 1. Log in to Expo CLI
```bash
npx expo login
```
Enter your Expo username/email and password.

Verify that you are logged in:
```bash
npx expo whoami
```

### 2. Log in to EAS CLI
```bash
eas login
```
Enter your Expo credentials when prompted.

Verify EAS authentication:
```bash
eas whoami
```

> **Note**: Ensure your Expo user account has been invited or assigned member/admin permissions under the **`nixonmedias-team`** organization on [expo.dev](https://expo.dev).

---

## Step 4: Verify App Identifiers & EAS Configuration

Check `app.json` to verify that the app bundle identifiers and EAS project settings match your intended target store:

```json
{
  "expo": {
    "name": "ELK Explorer",
    "slug": "elkApp",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.experienceelkcountry.elkexplorer"
    },
    "android": {
      "package": "com.experienceelkcountry.elkexplorer"
    },
    "extra": {
      "eas": {
        "projectId": "be837c57-250c-4a1f-8446-422faf910cb2"
      }
    },
    "owner": "nixonmedias-team"
  }
}
```

### Important App Store Connect Checklist (iOS):
1. **Apple Developer Portal**: Ensure the App ID (`com.experienceelkcountry.elkexplorer`) is registered under your Apple Developer Account under **Certificates, Identifiers & Profiles > Identifiers**.
2. **App Store Connect**: Ensure a new app is created with this bundle identifier under [App Store Connect > Apps](https://appstoreconnect.apple.com/apps).

---

## Step 5: Configure Build Credentials (Apple & Google)

EAS handles signing certificates and provisioning profiles in the cloud.

### iOS Credentials Setup:
Run the interactive credentials manager:

```bash
eas credentials -p ios
```

- When prompted, sign in with your **Apple ID** (associated with the Apple Developer Account / Team).
- Select **Set up all credentials** or **Generate a new Apple Distribution Certificate**.
- EAS will automatically generate:
  - Apple Distribution Certificate
  - Apple Provisioning Profile (matching `com.experienceelkcountry.elkexplorer`)
  - App Store Connect API Key (recommended for automated submissions)

### Android Credentials Setup:
```bash
eas credentials -p android
```
- Select **Set up a new keystore** (or let EAS generate and manage the upload keystore automatically).

---

## Step 6: Create Builds with EAS

Build profiles are defined in `eas.json`:
- `production`: Optimized release build for App Store & Google Play Store (AAB for Android, IPA for iOS).
- `preview`: Internal distribution build (e.g. TestFlight, APK, or internal testing link).
- `development`: Build with the Expo Dev Client included for local debugging.

### 1. Production Build (App Store / Play Store)

To build for **iOS**:
```bash
eas build --platform ios --profile production
```

To build for **Android**:
```bash
eas build --platform android --profile production
```

To build for **Both Platforms** simultaneously:
```bash
eas build --platform all --profile production
```

### 2. Preview Build (Internal Distribution / Testing)

```bash
# iOS Preview build
eas build --platform ios --profile preview

# Android APK / Internal preview
eas build --platform android --profile preview
```

### 3. Development Client Build (for local native testing)

```bash
eas build --platform ios --profile development
```

### Monitoring Builds
- The terminal will provide a live URL to follow the build logs on [expo.dev](https://expo.dev).
- Once completed, you can download the `.ipa` (iOS) or `.aab` (Android) artifact directly from the dashboard.

---

## Step 7: Submit to App Stores

Once a build is ready, you can submit it to the stores directly from your terminal using EAS Submit.

### Submit to Apple App Store (TestFlight / App Store Connect):
```bash
eas submit --platform ios
```
EAS will prompt you to select the latest build artifact and upload it directly to TestFlight / App Store Connect.

### Submit to Google Play:
```bash
eas submit --platform android
```

### One-Command Build & Submit:
You can also build and automatically upload to TestFlight upon build completion:
```bash
eas build --platform ios --profile production --auto-submit
```

---

## Local Development Commands

To run and test the app locally:

| Command | Action |
| --- | --- |
| `npm run start` | Start the Expo development server |
| `npx expo start -c` | Start with cache cleared |
| `npm run ios` | Run on local iOS Simulator (requires Xcode) |
| `npm run android` | Run on local Android Emulator (requires Android Studio) |
| `npm run web` | Run web preview |
| `npm run lint` | Run ESLint code checks |
| `npx expo prebuild --clean` | Regenerate local `/ios` and `/android` directories |

---

## Troubleshooting & Common Issues

### 1. `You don't have access to the nixonmedias-team account`
- Ensure your Expo account is added as a member in the `nixonmedias-team` organization on [expo.dev](https://expo.dev).
- Run `eas whoami` to verify you are logged into the right account.

### 2. Bundle Identifier / Provisioning Profile Mismatch (iOS)
- If you recently changed the bundle identifier, run:
  ```bash
  eas credentials -p ios
  ```
- Select your target build configuration and choose **Provisioning Profile** > **Re-generate profile** to link with the new App ID.

### 3. Missing Environment Variables
- Ensure your `.env` file exists and has valid URLs.
- If environment variables change, restart the dev server with `npx expo start -c`.

### 4. Native Sync / Stale Native Cache
If you encounter unexpected build errors after changing bundle identifiers or plugins:
```bash
npx expo prebuild --clean
```
This cleans and regenerates the local native projects based on the updated `app.json`.
