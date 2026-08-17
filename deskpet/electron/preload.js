const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("deskpet", {
  onAddPet: (fn) => ipcRenderer.on("add-pet", (_e, species) => fn(species)),
  onRenamePet: (fn) => ipcRenderer.on("rename-pet", (_e, id) => fn(id)),
  onRemovePet: (fn) => ipcRenderer.on("remove-pet", (_e, id) => fn(id)),
  onTogglePetPause: (fn) => ipcRenderer.on("toggle-pet-pause", (_e, id) => fn(id)),
  onClearPets: (fn) => ipcRenderer.on("clear-pets", () => fn()),
  onPaused: (fn) => ipcRenderer.on("set-paused", (_e, paused) => fn(paused)),
  onShowNames: (fn) => ipcRenderer.on("set-show-names", (_e, value) => fn(value)),
  onDisplay: (fn) => ipcRenderer.on("display-info", (_e, info) => fn(info)),
  onCursor: (fn) => ipcRenderer.on("cursor", (_e, point) => fn(point)),
  setIgnoreMouse: (ignore) => ipcRenderer.send("set-ignore-mouse", ignore),
  syncPets: (list) => ipcRenderer.send("pets-changed", list),
  syncShowNames: (value) => ipcRenderer.send("show-names-changed", value),
});
