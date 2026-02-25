# iOS Push Notifications Setup Guide

## Overview

This guide covers how to set up push notifications for iOS using Capacitor with your existing Firebase Cloud Messaging backend.

## Architecture

- **iOS App**: Uses native APNS (Apple Push Notification Service)
- **Backend**: Firebase Cloud Messaging for token management and sending notifications
- **Bridge**: Capacitor Push Notifications plugin connects native iOS to Firebase

## Prerequisites

1. Apple Developer Account (for push notification certificates)
2. Firebase project (already configured)
3. Xcode installed on macOS
4. Physical iOS device (push notifications don't work in simulator)

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@capacitor/core`
- `@capacitor/ios`
- `@capacitor/push-notifications`
- `@capacitor/cli`

### 2. Sync Capacitor

Build your web app and sync it with the iOS project:

```bash
npm run build
npx cap sync ios
```

### 3. Configure iOS Project in Xcode

Open the iOS project in Xcode:

```bash
npx cap open ios
```

#### 3.1 Enable Push Notifications Capability

1. In Xcode, select your project in the navigator
2. Select your app target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Push Notifications**
6. Add **Background Modes** and check:
   - Remote notifications

#### 3.2 Configure Bundle Identifier

1. Make sure your Bundle Identifier matches: `com.sparify.app`
2. Select your development team

### 4. Firebase APNs Configuration

#### 4.1 Generate APNs Authentication Key (Recommended)

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Keys** from the sidebar
4. Click the **+** button to create a new key
5. Give it a name (e.g., "Sparify Push Notifications")
6. Check **Apple Push Notifications service (APNs)**
7. Click **Continue** and then **Register**
8. **Download the .p8 file** (you can only download it once!)
9. Note the **Key ID** and your **Team ID**

#### 4.2 Upload APNs Key to Firebase

1. Open [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `sparify-4db02`
3. Go to **Project Settings** (⚙️) → **Cloud Messaging** tab
4. Scroll to **Apple app configuration**
5. Click **Upload** under APNs Authentication Key
6. Upload your .p8 file
7. Enter your Key ID and Team ID
8. Click **Upload**

### 5. Update Info.plist (if needed)

The iOS project should have the following in `Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

This is usually added automatically when you enable Background Modes in Xcode.

### 6. Build and Run on Device

#### 6.1 Connect Your iPhone

1. Connect your iPhone via USB
2. Trust the computer if prompted
3. In Xcode, select your device from the device dropdown

#### 6.2 Build and Run

1. Click the **Run** button (▶️) in Xcode
2. Wait for the build to complete
3. The app will install and launch on your device

### 7. Test Push Notifications

1. Log in to your Sparify account in the app
2. Go to Settings → Enable Push Notifications
3. Grant permission when prompted
4. The FCM token will be saved to your Supabase database

#### 7.1 Send a Test Notification

Your existing Edge Function `send-transaction-push` will automatically send notifications when new transactions are added. To test:

1. Add a new transaction to a piggy bank
2. You should receive a push notification on your iPhone

## How It Works

### Token Registration Flow

```
iOS App (Capacitor)
    ↓
1. Request permission via PushNotifications.requestPermissions()
    ↓
2. Register with APNS via PushNotifications.register()
    ↓
3. APNS returns device token
    ↓
4. Firebase SDK converts to FCM token
    ↓
5. Save FCM token to Supabase fcm_tokens table
```

### Notification Delivery Flow

```
Backend (Supabase Edge Function)
    ↓
1. Trigger: New transaction added
    ↓
2. Fetch user's FCM tokens from database
    ↓
3. Send notification via Firebase Admin SDK
    ↓
4. Firebase routes to APNS
    ↓
5. APNS delivers to iOS device
    ↓
6. Capacitor triggers pushNotificationReceived event
    ↓
7. App displays notification
```

## Code Structure

### Files Created/Modified

1. **capacitor.config.ts** - Capacitor configuration
2. **lib/nativePushNotifications.ts** - Native push notification handlers
3. **lib/usePushNotifications.ts** - Updated to support both web and native
4. **package.json** - Added Capacitor dependencies

### Platform Detection

The app automatically detects the platform:
- **iOS/Android**: Uses Capacitor native push
- **Web Browser**: Uses Firebase web push (existing functionality)

```typescript
import { isNativePlatform, getPlatform } from './lib/nativePushNotifications';

if (isNativePlatform()) {
  // Use Capacitor native push
} else {
  // Use Firebase web push
}
```

## Troubleshooting

### Push Notifications Not Received

1. **Check device is connected to internet**
2. **Verify FCM token is saved** in Supabase `fcm_tokens` table
3. **Check Xcode console** for errors when app is running
4. **Verify APNs key** is correctly uploaded to Firebase
5. **Test in production build**, not debug build sometimes

### Permission Not Granted

- Make sure you're testing on a physical device (not simulator)
- Check iOS Settings → Sparify → Notifications are enabled
- Try uninstalling and reinstalling the app

### Token Not Saving

- Check Supabase RLS policies allow inserting to `fcm_tokens`
- Verify user is authenticated
- Check browser/Xcode console for errors

### Firebase Errors

- Verify Firebase APNs configuration is correct
- Check Firebase Console → Cloud Messaging for any errors
- Ensure your Firebase project has the iOS app registered

## Production Checklist

Before releasing to the App Store:

- [ ] APNs Authentication Key uploaded to Firebase
- [ ] Push Notifications capability enabled
- [ ] Background Modes enabled with remote-notification
- [ ] Tested on multiple iOS devices
- [ ] App Store Connect entry has correct Bundle ID
- [ ] Push Notification entitlement is active

## Additional Resources

- [Capacitor Push Notifications Plugin](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Apple Push Notification Service](https://developer.apple.com/documentation/usernotifications)
- [Capacitor iOS Documentation](https://capacitorjs.com/docs/ios)

## Support

If you encounter issues:
1. Check the console logs in Xcode
2. Verify all setup steps were completed
3. Test with Firebase Cloud Messaging console
4. Check Supabase logs for Edge Function errors
