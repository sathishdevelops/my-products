# DeskPet

Mac menu-bar pets that walk the edges of your displays, chase a still cursor, and stay click-through everywhere else.

This is a **Mac app** (Electron overlay), not a Chrome extension.

## Run from source

```bash
cd /Users/sathishlohadhas/Projects/my-products/deskpet
npm install
npm run icons
npm start
```

## Ship a .app / .dmg

```bash
npm run dist
```

Unsigned builds land in `release/mac-arm64/DeskPet.app` and `release/DeskPet-1.1.0-arm64.dmg`. Open the app once via Right-click → Open if Gatekeeper warns.

## Use

- Drag a pet onto another edge or display. Click for a hop and a heart. Double-click to rename.
- Right-click a pet (or the menu-bar paw → **Pets**) to rename, pause, or remove that one.
- Menu bar: add Mochi / Loaf / Pip, show or hide name tags, **Open at login**, pause all, quit.
- Pets walk the floor, menu-bar edge, and sides of each screen’s work area (above the Dock). Names and positions persist.

Needs macOS. The app does not control other programs and does not sit on other windows’ title bars yet.
