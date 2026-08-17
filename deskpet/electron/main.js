const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, screen } = require("electron");
const path = require("path");

let overlay;
let tray;
let paused = false;
let petList = [];
let showNames = true;
let cursorTimer;

function unionWorkArea() {
  const displays = screen.getAllDisplays();
  let x = Infinity;
  let y = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const d of displays) {
    const a = d.workArea;
    x = Math.min(x, a.x);
    y = Math.min(y, a.y);
    right = Math.max(right, a.x + a.width);
    bottom = Math.max(bottom, a.y + a.height);
  }
  return { x, y, width: right - x, height: bottom - y };
}

function displayPayload() {
  const origin = unionWorkArea();
  return {
    origin,
    displays: screen.getAllDisplays().map((d) => ({
      id: d.id,
      x: d.workArea.x - origin.x,
      y: d.workArea.y - origin.y,
      w: d.workArea.width,
      h: d.workArea.height,
    })),
  };
}

function layoutOverlay() {
  if (!overlay) return;
  const area = unionWorkArea();
  overlay.setBounds(area);
  overlay.webContents.send("display-info", displayPayload());
}

function createOverlay() {
  const area = unionWorkArea();
  overlay = new BrowserWindow({
    x: area.x,
    y: area.y,
    width: area.width,
    height: area.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    focusable: true,
    acceptFirstMouse: true,
    enableLargerThanScreen: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    ...(process.platform === "darwin" ? { type: "panel" } : {}),
  });

  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: false });
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  overlay.setMenuBarVisibility(false);

  overlay.webContents.on("did-finish-load", () => {
    overlay.webContents.send("display-info", displayPayload());
    overlay.webContents.send("set-paused", paused);
    overlay.webContents.send("set-show-names", showNames);
  });
}

function startCursorBroadcast() {
  clearInterval(cursorTimer);
  cursorTimer = setInterval(() => {
    if (!overlay || overlay.isDestroyed()) return;
    const origin = unionWorkArea();
    const p = screen.getCursorScreenPoint();
    overlay.webContents.send("cursor", {
      x: p.x - origin.x,
      y: p.y - origin.y,
    });
  }, 40);
}

function trayIcon() {
  const iconPath = path.join(__dirname, "..", "icons", "trayTemplate.png");
  const image = nativeImage.createFromPath(iconPath);
  image.setTemplateImage(true);
  return image.isEmpty() ? nativeImage.createEmpty() : image;
}

function buildTray() {
  tray = new Tray(trayIcon());
  tray.setToolTip("DeskPet");
  rebuildMenu();
}

function petSubmenu(pet) {
  return [
    {
      label: "Rename…",
      click: () => overlay?.webContents.send("rename-pet", pet.id),
    },
    {
      label: pet.paused ? "Resume this pet" : "Pause this pet",
      click: () => overlay?.webContents.send("toggle-pet-pause", pet.id),
    },
    {
      label: "Remove",
      click: () => overlay?.webContents.send("remove-pet", pet.id),
    },
  ];
}

function rebuildMenu() {
  const login = app.getLoginItemSettings().openAtLogin;
  const petItems =
    petList.length === 0
      ? [{ label: "No pets yet", enabled: false }]
      : petList.map((pet) => ({
          label: pet.paused ? `${pet.name} (paused)` : pet.name,
          submenu: petSubmenu(pet),
        }));

  const menu = Menu.buildFromTemplate([
    { label: "DeskPet", enabled: false },
    { type: "separator" },
    {
      label: "Add Mochi (cat)…",
      click: () => overlay?.webContents.send("add-pet", "mochi"),
    },
    {
      label: "Add Loaf…",
      click: () => overlay?.webContents.send("add-pet", "loaf"),
    },
    {
      label: "Add Pip (bird)…",
      click: () => overlay?.webContents.send("add-pet", "pip"),
    },
    { type: "separator" },
    { label: "Pets", submenu: petItems },
    { type: "separator" },
    {
      label: paused ? "Resume all" : "Pause all",
      click: () => {
        paused = !paused;
        overlay?.webContents.send("set-paused", paused);
        rebuildMenu();
      },
    },
    {
      label: "Show name tags",
      type: "checkbox",
      checked: showNames,
      click: (item) => {
        showNames = item.checked;
        overlay?.webContents.send("set-show-names", showNames);
      },
    },
    {
      label: "Open at login",
      type: "checkbox",
      checked: login,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          openAsHidden: true,
        });
      },
    },
    {
      label: "Clear pets",
      click: () => overlay?.webContents.send("clear-pets"),
    },
    { type: "separator" },
    { label: "Quit DeskPet", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}

app.whenReady().then(() => {
  if (process.platform === "darwin") app.dock.hide();
  createOverlay();
  buildTray();
  startCursorBroadcast();
  screen.on("display-metrics-changed", layoutOverlay);
  screen.on("display-added", layoutOverlay);
  screen.on("display-removed", layoutOverlay);
});

ipcMain.on("set-ignore-mouse", (_event, ignore) => {
  if (!overlay) return;
  overlay.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on("pets-changed", (_event, list) => {
  petList = Array.isArray(list) ? list : [];
  if (tray) rebuildMenu();
});

ipcMain.on("show-names-changed", (_event, value) => {
  showNames = Boolean(value);
  if (tray) rebuildMenu();
});

app.on("window-all-closed", () => {
  clearInterval(cursorTimer);
  app.quit();
});
