import Alpine from "@alpinejs/csp";
import type { Alpine as AlpineType } from "alpinejs";

declare global {
  interface Window {
    Alpine: AlpineType;
  }
}

const ytTweaks = {
  options: [
    { id: "hideHomeFeed", label: "Hide Home Feed", enabled: false },
    { id: "removeMix", label: "Remove Mix", enabled: false },
    { id: "hideShorts", label: "Hide Shorts", enabled: false },
    { id: "hideRecommended", label: "Hide Recommended", enabled: false },
    { id: "disableComments", label: "Disable Comments", enabled: false },
    {
      id: "disableAutoPlaylists",
      label: "Disable Auto-generated Playlists",
      enabled: false,
    },
    { id: "disableAutoplay", label: "Disable Autoplay", enabled: false },
  ],
};

Alpine.data("ytTweaks", () => ({
  options: ytTweaks.options,
  extensionEnabled: false,
  get statusClass() {
    return this.extensionEnabled ? "bg-green-400" : "bg-red-400";
  },
  get statusText() {
    return this.extensionEnabled ? "Turn off" : "Turn on";
  },
  async toggle() {
    this.extensionEnabled = !this.extensionEnabled;
    chrome.storage.sync.set({ extensionEnabled: this.extensionEnabled });
    chrome.runtime.sendMessage({
      action: "GET_EXTENSION_STATE",
      enabled: this.extensionEnabled,
    });
  },
  selected: {},
  async init() {
    console.log("ytTweaks initialized");
    console.log(await chrome.storage.sync.getKeys());

    chrome.storage.sync.get("extensionEnabled", (result) => {
      this.extensionEnabled = result.extensionEnabled;
    });
    chrome.storage.sync.get(
      "options",
      (items: { options?: { [key: string]: boolean } }) => {
        if (!items.options) {
          return;
        }
        this.options.forEach((o) => {
          // o.enabled = Boolean(items[o.id]);
          o.enabled = Boolean(items.options?.[o.id]);
          Object.assign(this.selected, {
            [o.id]: o.enabled,
          });
        });
      }
    );
  },
  save(opt: Event) {
    const { name, checked } = opt.target as HTMLInputElement;
    console.log("Saving option:", name, checked);
    Object.assign(this.selected, { [name]: checked });
    // chrome.storage.sync.set({ [name]: checked }); // if i decide to save it raw
    chrome.storage.sync.set({ options: this.selected });

    chrome.tabs.query(
      { url: "*://www.youtube.com/*", currentWindow: true },
      (tabs) => {
        for (const tab of tabs) {
          chrome.runtime.sendMessage({
            action: "toggleOption",
            option: name,
            enabled: checked,
            tabId: tab.id,
          });
        }
      }
    );
  },
}));

// Alpine.store("idk", {
//   options: [
//     { id: "removeMix", label: "Remove Mix", enabled: false },
//     { id: "hideShorts", label: "Hide Shorts", enabled: false },
//     { id: "autoLike", label: "Auto Like", enabled: false },
//     { id: "pauseOnLoad", label: "Pause on Load", enabled: false },
//     { id: "hideComments", label: "Hide Comments", enabled: false },
//     { id: "hideSidebar", label: "Hide Sidebar", enabled: false },
//     { id: "autoFullscreen", label: "Auto Fullscreen", enabled: false },
//   ],

//   async init() {
//     console.log("ytTweaks initialized");
//     console.log(await chrome.storage.sync.getKeys());
//     // const input = form.elements.namedItem(key);

//     const keys = this.options.map((o) => o.id);

//     chrome.storage.sync.get(keys, (items) => {
//       this.options.forEach((o) => {
//         o.enabled = Boolean(items[o.id]);
//       });
//       console.log(items);
//     });
//   },
//   save(opt: { id: number; label: string; enabled: boolean }) {
//     const { name, checked } = opt.target;
//     console.log("Saving option:", name, checked);

//     console.log("Saving option:", opt);
//     chrome.storage.sync.set({ [name]: checked });
//     // Save logic here
//   },
// });

Alpine.start();
