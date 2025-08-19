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
    { id: "removeMix", label: "Remove Mix Playlists", enabled: false },
    { id: "hideShorts", label: "Hide Shorts", enabled: false },
    { id: "hideRecommended", label: "Hide Recommended", enabled: false },
    { id: "disableComments", label: "Disable Comments", enabled: false },
    // {
    //   id: "disableAutoPlaylists",
    //   label: "Disable Auto-generated Playlists",
    //   enabled: false,
    // },
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
    await chrome.storage.sync.set({ extensionEnabled: this.extensionEnabled });
    chrome.runtime.sendMessage({
      action: "STATE_CHANGE",
      enabled: this.extensionEnabled,
    });
  },
  selected: {},
  async init() {
    console.log("ytTweaks initialized");
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
    // console.log("Saving option:", name, checked);
    Object.assign(this.selected, { [name]: checked });
    // chrome.storage.sync.set({ [name]: checked }); // if i decide to save it raw
    chrome.storage.sync.set({ options: this.selected });
    chrome.runtime.sendMessage({
      action: "TOGGLE_OPTION",
      option: name,
      enabled: checked,
      // tabId: tab.id,
    });
  },
}));

Alpine.start();
