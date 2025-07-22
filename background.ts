chrome.webNavigation.onCommitted.addListener(
  function (details) {
    const url = new URL(details.url);
    if (url.hostname === "www.youtube.com" && url.searchParams.has("list")) {
      chrome.storage.sync.get(["removalEnabled"], function (result) {
        if (result.removalEnabled !== false) {
          url.searchParams.delete("list");
          chrome.tabs.update(details.tabId!, { url: url.toString() });
          console.log(
            `[Automix Removal] 'list' parameter removed from: ${details.url}`
          );
          console.log(`[Automix Removal] Redirected to: ${url.toString()}`);
          if (chrome.notifications) {
            chrome.notifications.create({
              type: "basic",
              iconUrl: "popup/icon48.png",
              title: "Mix Removed",
              message: "Mixes were removed from this video.",
            });
          }
        } else {
          console.log("[Automix Removal] Removal is disabled.");
        }
      });
    }
  },
  { url: [{ hostEquals: "www.youtube.com" }] }
);
