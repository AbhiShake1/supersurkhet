# Release and Store Deployment

This repository now ships through version-gated GitHub Actions workflows:

- Mobile (`apps/surkhet`): `.github/workflows/mobile-release.yml`
- Desktop (`apps/electron`): `.github/workflows/electron-release.yml`

Both workflows run on pushes to `main` only when the target app's `package.json` `version` changes.

## 1) Mobile (Expo -> Play Store + App Store)

### Workflow trigger
- Bump `apps/surkhet/package.json` `version`.
- Push to `main`.

### Required GitHub secrets
- `EXPO_TOKEN`
- `EXPO_GOOGLE_SERVICE_ACCOUNT_KEY` (full JSON content as a single secret value)
- `EXPO_APPLE_ID`
- `EXPO_ASC_APP_ID`
- `EXPO_APPLE_TEAM_ID`

### Required Expo/EAS setup (one-time)
- App exists in Expo project `cbd1288f-0638-431e-84ad-d2a22b61b7b1`.
- Android credentials configured in EAS.
- iOS credentials configured in EAS.
- Store listings already created in Google Play Console and App Store Connect.

## 2) Desktop (Electron -> GitHub Releases + Store packages)

### Workflow trigger
- Bump `apps/electron/package.json` `version`.
- Push to `main`.

### What is produced
- macOS: `dmg`, `zip`
- Windows: `nsis`
- Linux: `AppImage`, `deb`, `rpm`, `snap`
- Optional store packages when signing secrets are present:
  - Windows Store candidate: `appx`
  - Mac App Store candidate: `mas`

### Required GitHub secrets (optional for signed/store packages)
- `CSC_LINK`
- `CSC_KEY_PASSWORD`
- `WIN_CSC_LINK`
- `WIN_CSC_KEY_PASSWORD`
- `APPLE_API_KEY`
- `APPLE_API_KEY_ID`
- `APPLE_API_ISSUER`
- `APPLE_TEAM_ID`
- `APPLE_ID`
- `APPLE_APP_SPECIFIC_PASSWORD`

## 3) Manual store submission after CI artifacts

- Microsoft Store: submit generated `.appx/.msix` in Partner Center.
- Mac App Store: submit generated `mas` package via Transporter/Xcode Organizer.
- Linux registries:
  - Snap Store: publish `snap` from a Snapcraft account.
  - Flathub: requires a dedicated Flatpak manifest/repo flow (not part of Electron Builder output).

## 4) Force run without version bump

Use `workflow_dispatch` on either workflow and set `force_release=true`.
