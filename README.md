# YouTube Automix Removal Extension
[![Download Extension](https://img.shields.io/badge/Download-Release-blue?logo=google-chrome)](https://github.com/slackers-collective/youtube-automix/releases/latest)

This browser extension automatically disables the YouTube automix feature

## Installation & Debugging

1. Download and extract the .zip from [releases](https://github.com/slackers-collective/youtube-automix/releases/latest).
2.  Go to `chrome://extensions` in Chrome.
3. Enable Developer mode.
4. Click **Load unpacked** and select this project folder, or drag and the drop the folder onto the extension page.
5. The extension will be active and show a popup when clicked.

## Automated Debugging

You can automate loading the extension using Chrome's remote debugging and VS Code's launch.json. See below for a sample configuration:

```
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome", //or msedge
      "request": "launch",
      "name": "Debug Chrome Extension",
      "url": "https://www.youtube.com",
      "webRoot": "${workspaceFolder}",
      "runtimeArgs": [
        "--load-extension=${workspaceFolder}"
      ]
    }
  ]
}
```

Place this in `.vscode/launch.json` and use the "Debug Chrome Extension" configuration to launch Chrome with the extension loaded.
