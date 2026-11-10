// Ponte segura entre as telas (HTML) e o programa
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("arena", {
  on: (canal, fn) => ipcRenderer.on(canal, (_e, dados) => fn(dados)),
  invocar: (canal, dados) => ipcRenderer.invoke(canal, dados),
});
