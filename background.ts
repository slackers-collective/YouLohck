const SHORTS_CSS = `.ytd-reel-shelf-renderer, a[href^="/shorts"], .ytd-rich-section-renderer,
ytd-mini-guide-entry-renderer[aria-label="Shorts"],
ytd-guide-entry-renderer [title="Shorts"]{ 
  display: none !important;
 }`;
const HOME_FEED_CSS = `ytd-rich-grid-renderer, ytd-browse[page-subtype="home"] #contents { display: none !important; }`;
const RECOMMENDED_CSS = `ytd-watch-next-secondary-results-renderer, ytd-compact-video-renderer, #related { display: none !important; }`;
const COMMENTS_CSS = `#comments, ytd-comments { display: none !important; }`;
const ALL_CSS = [SHORTS_CSS, HOME_FEED_CSS, RECOMMENDED_CSS, COMMENTS_CSS].join(
  "\n"
);

type Message = {
  action: "TOGGLE_OPTION" | "STATE_CHANGE";
  option: keyof typeof settingsConfig;
  enabled?: boolean;
  tabId: number;
};

interface DNRFeature {
  ruleId: number;
  rule: (enabled?: boolean) => void; //some chrome declarativeNetRequest rule
}

type WebNavigationEventName = Exclude<
  keyof typeof chrome.webNavigation,
  "getFrame" | "getAllFrames"
>;

interface WebNavigationFeature {
  events: WebNavigationEventName[];
  handler: (details: any, enabled?: boolean) => void;
}
type Feature = {
  dnr?: DNRFeature;
  webNavigation?: WebNavigationFeature;
};

type GetListenerDetails<T> = T extends chrome.events.Event<
  (details: infer D, ...args: any) => void
>
  ? D
  : never;

let browser = chrome;

if (typeof browser !== "undefined") {
  browser = chrome;
}

const lastUrlByTab: Record<number, string> = {};

const AUTOMIX_RULE: chrome.declarativeNetRequest.Rule = {
  id: 1,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { transform: { queryTransform: { removeParams: ["list"] } } },
  },
  condition: {
    resourceTypes: ["main_frame", "sub_frame"],
    // urlFilter: "*://www.youtube.com/*",
    regexFilter: "^https?://www\\.youtube\\.com/watch.*list=RD*",
  },
};

//this lets the extension listen to toggles
//in the background, had it in the oncommitted listener but multiple listens
//need to manually populate the details object in the handler
chrome.runtime.onMessage.addListener((message: Message) => {
  chrome.storage.sync.get("extensionEnabled", (data) => {
    if (message.action === "STATE_CHANGE") {
      console.log("State change message received:", message);
      initializeListeners();
    }
    if (!data.extensionEnabled) {
      console.log("Extension is disabled, ignoring toggle.");
      return;
    }

    if (message.action === "TOGGLE_OPTION") {
      console.log("Message received:", message);

      chrome.tabs.query(
        { url: "*://www.youtube.com/*", currentWindow: true },
        (tabs) => {
          // chrome.tabs.get(message.tabId, (tab) => {
          for (const tab of tabs) {
            if (chrome.runtime.lastError) {
              console.error("Error getting tab:", chrome.runtime.lastError);
              return;
            }
            const setting = settingsConfig[message.option];
            if (!setting) {
              console.warn(`No handler found for option: ${message.option}`);
              return;
            }
            if (setting.dnr) {
              setting.dnr.rule(message.enabled);
              return;
            }
            setting.webNavigation?.handler(
              {
                tabId: tab.id,
                url: tab.url,
              } as chrome.webNavigation.WebNavigationTransitionCallbackDetails,
              message.enabled
            );
          }
        }
      );
    }
  });
  return true;
});

/**
 * Applies settings based on the triggered webNavigation event and enabled options.
 *
 * This function retrieves the extension's enabled state and user-configured options from storage.
 * If the extension is enabled, it iterates through the settings configuration. For each setting,
 * if it's enabled and its associated webNavigation feature includes the triggered event name,
 * the corresponding handler function is executed with the event details.
 *
 * @param {T} eventName - The name of the webNavigation event that triggered the function call.
 *                        This is a key of the `chrome.webNavigation` API.
 * @param {GetListenerDetails<(typeof chrome.webNavigation)[T]>} details - The details object
 *                        associated with the triggered webNavigation event. The type of this object
 *                        depends on the specific event that was triggered.
 */
function applyForEventListener<T extends WebNavigationEventName>(
  eventName: T,
  details: GetListenerDetails<(typeof chrome.webNavigation)[T]>
) {
  chrome.storage.sync.get(["extensionEnabled", "options"], function (data) {
    if (!data.extensionEnabled) {
      console.info("[YouLohck] Extension is disabled.");
      return;
    }
    const options = data["options"];
    if (!options) {
      console.log("No options found in storage.");
      return;
    }

    for (const key in settingsConfig) {
      const setting = settingsConfig[key];

      if (setting) {
        const isEnabled = options[key as keyof ExtensionOptions] === true;

        // the idea is that the handler will be called only if the option is enabled
        // since injected styles/js get destroyed on page navs,
        // I can safely not bother about it when its disabled
        if (isEnabled && setting.webNavigation?.events.includes(eventName)) {
          console.log(
            "url" in details ? details.url : details.tabId,
            "details for event",
            eventName
          );
          // console.log(
          //   `Event '${eventName}' triggered for ${key}. Applying settings.`
          // );
          setting.webNavigation.handler(details, isEnabled);
        }
      }
    }
  });
}

const settingsConfig: Record<string, Feature> = {
  hideShorts: {
    webNavigation: {
      handler: createCssHandler(SHORTS_CSS, "Shorts"),
      events: ["onHistoryStateUpdated", "onCommitted"],
    },
  },
  removeMix: {
    dnr: {
      ruleId: AUTOMIX_RULE.id,
      rule: (enabled) => {
        if (enabled) {
          chrome.declarativeNetRequest.updateDynamicRules({
            addRules: [AUTOMIX_RULE],
            removeRuleIds: [AUTOMIX_RULE.id],
          });
          console.log("Automix rule added");
        } else {
          chrome.declarativeNetRequest.updateDynamicRules({
            removeRuleIds: [AUTOMIX_RULE.id],
          });
          console.log("Automix rule removed");
        }
      },
    },
    webNavigation: {
      events: ["onHistoryStateUpdated", "onCommitted"],
      handler: handleRemoveMix,
    },
  },
  hideHomeFeed: {
    webNavigation: {
      events: ["onHistoryStateUpdated", "onCommitted"],
      handler: createCssHandler(HOME_FEED_CSS, "Home Feed"),
    },
  },
  hideRecommended: {
    webNavigation: {
      events: ["onHistoryStateUpdated", "onCommitted"],
      handler: createCssHandler(RECOMMENDED_CSS, "Recommended Videos"),
    },
  },
  disableComments: {
    webNavigation: {
      events: ["onHistoryStateUpdated", "onCommitted"],
      handler: createCssHandler(COMMENTS_CSS, "Comments"),
    },
  },
  // disableAutoPlaylists: {
  //   webNavigation: {
  //     events: ["onBeforeNavigate", "onHistoryStateUpdated"],
  //     handler: handleDisableAutoPlaylists,
  //   },
  // },
  disableAutoplay: {
    webNavigation: {
      events: ["onHistoryStateUpdated", "onCommitted"],
      handler: handleDisableAutoplay,
    },
  },
};

const ALL_SETTINGS = Object.values(settingsConfig);
const DNR_RULES = ALL_SETTINGS.filter((feature) => feature.dnr);

const ALL_WEB_EVENTS = new Set<WebNavigationEventName>();
const activeWebNavigationListeners = new Map<
  WebNavigationEventName,
  (details: any) => void
>();

// const activeeventlisteners = new Map<WebNavigationEventName, Array<keyof ExtensionOptions>>();
async function initializeListeners() {
  const data = await chrome.storage.sync.get(["extensionEnabled", "options"]);
  const options = data["options"];
  console.log(options, "current options");
  console.log(ALL_WEB_EVENTS, "all web events");
  if (!data.extensionEnabled) {
    await cleanUpFeatures();
    console.info(
      "[YouLohck] Extension is disabled. No listeners will be added."
    );
    return;
  }

  // this loops settings and run all dnr rules and gets unique
  // event names to be registered with their listeners
  for (const key in settingsConfig) {
    const feature = settingsConfig[key];
    const isEnabled = options[key as keyof ExtensionOptions] === true;

    if (feature?.dnr) {
      feature.dnr.rule(isEnabled);
    }

    if (feature?.webNavigation?.events) {
      feature.webNavigation.events.forEach((event) => {
        ALL_WEB_EVENTS.add(event);
      });
    }
  }

  // apply the settings immediately once since it wont run until the event listeners also fire
  // helps too if i allow user to toggle options when extension is disabled then they later turn it on
  chrome.tabs.query(
    { url: "*://www.youtube.com/*", currentWindow: true },
    (tabs) => {
      for (const tab of tabs) {
        const activeTab = tab;
        const details = { tabId: activeTab.id, url: activeTab.url };

        for (const key in settingsConfig) {
          const feature = settingsConfig[key as keyof typeof settingsConfig];
          const isEnabled = options[key as keyof ExtensionOptions];

          if (feature?.webNavigation) {
            feature.webNavigation.handler(details, isEnabled);
          }
        }
      }
    }
  );

  //pass all webnavevents names to be registered with its listeners
  ALL_WEB_EVENTS.forEach((eventName) => {
    const event = chrome.webNavigation[eventName];
    if (event && typeof event.addListener === "function") {
      const listener = (details: any) =>
        applyForEventListener(eventName, details);
      event.addListener(listener, { url: [{ hostEquals: "www.youtube.com" }] });
      //without storing a stable reference for the added event listeners
      // removing them will fail and I start seeing multiple logs
      activeWebNavigationListeners.set(eventName, listener);
    }
  });

  console.log("Initializing listeners for events:", ALL_WEB_EVENTS);
}

async function cleanUpFeatures() {
  const allTabs = await chrome.tabs.query({
    currentWindow: true,
    url: "*://www.youtube.com/*",
  });
  // Remove all declarativeNetRequest rules
  if (DNR_RULES.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: DNR_RULES.map((rule) => rule.dnr!.ruleId),
    });
    console.log("All DNR rules removed.");
  }

  for (const key in settingsConfig) {
    const feature = settingsConfig[key];
    if (feature?.webNavigation) {
      for (const tab of allTabs) {
        feature.webNavigation.handler({ tabId: tab.id, url: tab.url }, false);
      }
    }
  }

  if (activeWebNavigationListeners.size > 0) {
    for (const [
      eventName,
      listener,
    ] of activeWebNavigationListeners.entries()) {
      if (chrome.webNavigation[eventName].hasListener(listener)) {
        console.info(
          "cleanup msg: [YouLohck] Removing listener for",
          eventName
        );
      }
      if (chrome.webNavigation[eventName]?.hasListener(listener)) {
        chrome.webNavigation[eventName].removeListener(listener);
      }
    }
    activeWebNavigationListeners.clear();
    console.log("All WebNavigation listeners removed.");
  }
}
// #TODO: not every option can work on onCommited, some are historystateupdated because of spa shit i think
function createCssHandler(css: string, featureName: string) {
  return function (
    details: chrome.webNavigation.WebNavigationCallbackDetails,
    enabled?: boolean
  ) {
    try {
      const tabId = details.tabId;
      if (enabled) {
        console.info(`[YouLohck] Hiding ${featureName}.`);
        chrome.scripting.insertCSS({ target: { tabId }, css });
      } else {
        console.info(`[YouLohck] Showing ${featureName}.`);
        chrome.scripting.removeCSS({ target: { tabId }, css });
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes("No tab with id")) {
        console.error(`[YouLohck] Error toggling ${featureName}:`, error);
      }
    }
  };
}

function handleRemoveMix(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
) {
  console.log(details.transitionQualifiers, "transition qualifiers");
  console.log(details.transitionType, "transition type");
  if (details.transitionQualifiers?.includes("forward_back")) {
    console.log("Ignoring forward_back navigation to prevent redirect loop.");
    return;
  }
  // if (lastUrlByTab[details.tabId] === details.url) {
  //   console.log("Ignoring same url", lastUrlByTab);
  //   return; // Already processed this exact URL for this tab
  // }
  const url = new URL(details.url);
  const playlistId = url.searchParams.get("list");

  if (playlistId && playlistId.startsWith("RD")) {
    lastUrlByTab[details.tabId] = details.url;
    url.searchParams.delete("list");
    //using tab.update creates an extra history entry of the same url
    chrome.scripting.executeScript({
      target: { tabId: details.tabId },
      func: (url) => {
        console.log("Replacing state", url);
        // history.replaceState(history.state, "", url);
        // window.history.pushState({}, "", url);
        history.replaceState(history.state, "", url);
        window.dispatchEvent(new Event("popstate"));
      },
      args: [url.toString()],
    });

    if (chrome.notifications) {
      chrome.notifications.create({
        type: "basic",
        iconUrl: "popup/icon48.png",
        title: "Mix Removed",
        message: "Mixes were removed from this video.",
      });
    }

    console.log(`[YouLohck] Removed 'list' param: ${details.url}`);
  }
}

function handleDisableAutoplay(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
) {
  chrome.scripting.executeScript({
    target: { tabId: details.tabId! },
    func: () => {
      const autoplayToggle = document.querySelector(
        ".ytp-autonav-toggle-button"
      ) as HTMLElement | null;
      if (autoplayToggle?.getAttribute("aria-checked") === "true") {
        autoplayToggle.click();
      }
    },
  });
}

function handleDisableAutoPlaylists(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
) {
  const url = new URL(details.url);
  if (
    url.hostname === "www.youtube.com" &&
    url.pathname === "/playlist" &&
    url.searchParams.get("list")?.startsWith("RD")
  ) {
    chrome.tabs.remove(details.tabId!);
    console.log(`[YouLohck] Blocked auto-generated playlist: ${details.url}`);
  }
}

// initializeListeners();
chrome.runtime.onInstalled.addListener(initializeListeners);
chrome.runtime.onStartup.addListener(() => {
  console.log("YouLohck extension started");
  initializeListeners();
});
