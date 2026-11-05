const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktopCat", {
  getState: () => ipcRenderer.invoke("state"),
  settings: (value) => ipcRenderer.invoke("settings", value),
  command: (value) => ipcRenderer.invoke("command", value),
  telemetry: (value) => ipcRenderer.send("telemetry", value),
  onState: (fn) => {
    const cb = (_, v) => fn(v);
    ipcRenderer.on("state", cb);
    return () => ipcRenderer.removeListener("state", cb);
  },
  onInput: (fn) => {
    const cb = (_, v) => fn(v);
    ipcRenderer.on("input", cb);
    return () => ipcRenderer.removeListener("input", cb);
  },
});
