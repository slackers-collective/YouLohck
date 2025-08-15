function sanitizeLink(a: HTMLAnchorElement) {
  try {
    const url = new URL(a.href, location.href);
    if (url.searchParams.has("list")) {
      url.searchParams.delete("list");
      a.href = url.toString();
      console.log("[LinkSanitizer] cleaned link:", a.href);
    } else {
      console.log("[LinkSanitizer] link already clean:", a.href);
    }
  } catch {}
}

function removeLinkQuery(e: MouseEvent | FocusEvent | TouchEvent) {
  const a = (e.target as HTMLElement)?.closest?.('a[href*="list="]');
  if (a) {
    sanitizeLink(a as HTMLAnchorElement);
  }
}

function enableFeature() {
  document.addEventListener("mouseover", removeLinkQuery, true);
  document.addEventListener("focusin", removeLinkQuery, true);
  document.addEventListener("touchstart", removeLinkQuery, true);
}

function disableFeature() {
  document.removeEventListener("mouseover", removeLinkQuery, true);
  document.removeEventListener("focusin", removeLinkQuery, true);
  document.removeEventListener("touchstart", removeLinkQuery, true);
}

// init
chrome.storage.sync.get(
  ["extensionEnabled", "options"],
  ({ extensionEnabled, options }) => {
    console.log(options?.removeMix, " initial state received");

    if (extensionEnabled && options?.removeMix) enableFeature();
  }
);
// add or remove the listeners when the thing changes
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && (changes.extensionEnabled || changes.options)) {
    const isEnabled =
      changes.extensionEnabled?.newValue ??
      changes.options?.newValue?.extensionEnabled;
    if (isEnabled) {
      enableFeature();
    } else {
      disableFeature();
    }
  }
});
