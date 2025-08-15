const SHORTS_CSS = `.ytd-reel-shelf-renderer, a[href^="/shorts"], .ytd-rich-section-renderer,
ytd-mini-guide-entry-renderer[aria-label="Shorts"],
ytd-guide-entry-renderer [title="Shorts"]{ 
  display: none !important;
 }`;
const HOME_FEED_CSS = `ytd-rich-grid-renderer, ytd-browse[page-subtype="home"] #contents { display: none !important; }`;
const RECOMMENDED_CSS = `ytd-watch-next-secondary-results-renderer, ytd-compact-video-renderer, #related { display: none !important; }`;
const COMMENTS_CSS = `#comments, ytd-comments { display: none !important; }`;

type Message = {
  action: string;
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

//this lets the extension listen to toggles
//in the background, had it in the oncommitted listener but multiple listens
//need to manually populate the details object in the handler
chrome.runtime.onMessage.addListener((message: Message) => {
  if (message.action === "toggleOption") {
    console.log("Message received:", message);
    chrome.tabs.get(message.tabId, (tab) => {
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
          tabId: message.tabId,
          url: tab.url,
        } as chrome.webNavigation.WebNavigationTransitionCallbackDetails,
        message.enabled
      );
    });
  }
  return true;
});

function applyForEventListener<T extends WebNavigationEventName>(
  eventName: T,
  details: GetListenerDetails<(typeof chrome.webNavigation)[T]>
) {
  chrome.storage.sync.get(["extensionEnabled", "options"], function (data) {
    if (!data.extensionEnabled) {
      console.log("[YouLohck] Extension is disabled.");
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
        console.log("key", key);

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

async function initializeListeners() {
  const data = await chrome.storage.sync.get(["extensionEnabled", "options"]);
  const options = data["options"];
  const allSettings = Object.values(settingsConfig);
  const dnrrules = allSettings.filter((feature) => feature.dnr);

  const allWebEvents = new Set<WebNavigationEventName>();

  if (!data.extensionEnabled) {
    const ruleIdsToRemove = dnrrules.map((dnr) => dnr.dnr!.ruleId);

    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: ruleIdsToRemove,
    });
    return;
  }

  for (const key in settingsConfig) {
    const feature = settingsConfig[key];
    const isEnabled = options[key as keyof ExtensionOptions] === true;

    if (feature?.dnr) {
      feature.dnr.rule(isEnabled);
    }
    if (feature?.webNavigation?.events) {
      feature.webNavigation.events.forEach((event) => {
        allWebEvents.add(event);
      });
    }
  }
  //pass all webnavevents names to be registered with its listeners
  allWebEvents.forEach((eventName) => {
    const event = chrome.webNavigation[eventName];
    if (event && typeof event.addListener === "function") {
      event.addListener(
        (details) => {
          applyForEventListener(eventName, details);
        },
        { url: [{ hostEquals: "www.youtube.com" }] }
      );
    }
  });

  console.log("Initializing listeners for events:", allWebEvents);
}

// #TODO: not every option can work on onCommited, some are historystateupdated because of spa shit i think

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
  if (url.searchParams.has("list")) {
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

function handleHideHomeFeed(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
) {
  chrome.scripting.insertCSS({
    target: { tabId: details.tabId! },
    css: `ytd-rich-grid-renderer, ytd-browse[page-subtype="home"] #contents { display: none !important; }`,
  });
}

function handleHideShorts(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
  enabled?: boolean
) {
  try {
    if (enabled) {
      console.info("removing shorts");

      chrome.scripting.insertCSS({
        target: { tabId: details.tabId },
        css: SHORTS_CSS,
      });
    } else {
      console.log("Shorts removal is disabled");
      chrome.scripting.removeCSS({
        target: { tabId: details.tabId },
        css: SHORTS_CSS,
      });
      return;
    }
  } catch (error) {
    console.error("Error removing shorts:", error);
  }
}

function handleHideRecommended(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
) {
  chrome.scripting.insertCSS({
    target: { tabId: details.tabId! },
    css: `ytd-watch-next-secondary-results-renderer, ytd-compact-video-renderer, #related { display: none !important; }`,
  });
}

function handleDisableComments(
  details: chrome.webNavigation.WebNavigationTransitionCallbackDetails
) {
  chrome.scripting.insertCSS({
    target: { tabId: details.tabId! },
    css: `#comments, ytd-comments { display: none !important; }`,
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

const AUTOMIX_RULE: chrome.declarativeNetRequest.Rule = {
  id: 1,
  priority: 1,
  action: {
    type: "redirect",
    redirect: { transform: { queryTransform: { removeParams: ["list"] } } },
  },
  condition: {
    resourceTypes: ["main_frame"],
    urlFilter: "*://www.youtube.com/*",
  },
};

const settingsConfig: Record<string, Feature> = {
  hideShorts: {
    webNavigation: {
      handler: handleHideShorts,
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
      events: ["onHistoryStateUpdated"],
      handler: handleRemoveMix,
    },
  },
  // hideHomeFeed: {
  //   events: ["onHistoryStateUpdated", "onCommitted"],
  //   handler: handleHideHomeFeed,
  // },
  // hideRecommended: {
  //   events: ["onHistoryStateUpdated", "onCommitted"],
  //   handler: handleHideRecommended,
  // },
  // disableComments: {
  //   events: ["onHistoryStateUpdated", "onCommitted"],
  //   handler: handleDisableComments,
  // },
  // disableAutoPlaylists: {
  //   events: ["onBeforeNavigate", "onHistoryStateUpdated"],
  //   handler: handleDisableAutoPlaylists,
  // },
  // disableAutoplay: {
  //   events: ["onHistoryStateUpdated", "onCommitted"],
  //   handler: handleDisableAutoplay,
  // },
};

const settingsHandlers: Record<
  string,
  (
    details: chrome.webNavigation.WebNavigationTransitionCallbackDetails,
    enabled?: boolean
  ) => void
> = {
  hideShorts: handleHideShorts,
  removeMix: handleRemoveMix,
  // hideHomeFeed: handleHideHomeFeed,
  // hideRecommended: handleHideRecommended,
  // disableComments: handleDisableComments,
  // disableAutoPlaylists: handleDisableAutoPlaylists,
  // disableAutoplay: handleDisableAutoplay,
};
chrome.runtime.onInstalled.addListener(initializeListeners);
chrome.runtime.onStartup.addListener(initializeListeners);
