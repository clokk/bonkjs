const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('bonkDesktop', {
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
