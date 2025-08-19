// function sanitizeLink(a: HTMLAnchorElement) {
//   try {
//     const url = new URL(a.href, location.href);
//     if (url.searchParams.has("list")) {
//       url.searchParams.delete("list");
//       a.href = url.toString();
//       console.log("[LinkSanitizer] cleaned link:", a.href);
//     } else {
//       console.log("[LinkSanitizer] link already clean:", a.href);
//     }
//   } catch {}
// }
// function sanitizeUrl(urlString: string): string {
//   try {
//     // Use location.href as a base for relative URLs
//     const url = new URL(urlString, location.href);
//     if (url.searchParams.has("list")) {
//       url.searchParams.delete("list");
//       return url.toString();
//     }
//   } catch (e) {
//     // Ignore invalid URLs
//   }
//   return urlString;
// }
// function removeLinkQuery(e: MouseEvent | FocusEvent | TouchEvent) {
//   const a = (e.target as HTMLElement)?.closest?.('a[href*="list="]');
//   if (a) {
//     sanitizeLink(a as HTMLAnchorElement);
//   }
// }

// function enableFeature() {
//   document.addEventListener("mouseover", removeLinkQuery, true);
//   document.addEventListener("focusin", removeLinkQuery, true);
//   document.addEventListener("touchstart", removeLinkQuery, true);
//   patchHistory();
//   document.addEventListener("click", (e) => {
//     console.log("click intercepted", e.target);
//     const link = (e.target as HTMLElement).closest(
//       'a[href*="list="]'
//     ) as HTMLAnchorElement | null;
//     console.log("link found:", link);
//     if (!link) return;

//     const cleanHref = sanitizeUrl(link.href);
//     if (cleanHref !== link.href) {
//       e.preventDefault();
//       history.pushState({}, "", cleanHref);
//       console.log("[LinkSanitizer] intercepted click →", cleanHref);
//       window.dispatchEvent(new Event("popstate"));
//     }
//   });
// }

// function disableFeature() {
//   document.removeEventListener("mouseover", removeLinkQuery, true);
//   document.removeEventListener("focusin", removeLinkQuery, true);
//   document.removeEventListener("touchstart", removeLinkQuery, true);
// }

// const originalPushState = history.pushState;
// const originalReplaceState = history.replaceState;
// let isPatched = false;

// /**
//  * Wraps the history API to sanitize URLs before they are pushed
//  * or replaced in the browser's history.
//  */
// function patchHistory() {
//   if (isPatched) return;

//   history.pushState = function (
//     state: any,
//     title: string,
//     url?: string | URL | null
//   ) {
//     const finalUrl = url ? sanitizeUrl(url.toString()) : url;
//     console.log(finalUrl, "finalUrl");
//     return originalPushState.call(this, state, title, finalUrl);
//   };
//   history.replaceState = function (
//     state: any,
//     title: string,
//     url?: string | URL | null
//   ) {
//     const finalUrl = url ? sanitizeUrl(url.toString()) : url;
//     return originalReplaceState.call(this, state, title, finalUrl);
//   };

//   isPatched = true;
//   console.log("[LinkSanitizer] History API patched.");
// }

// function unpatchHistory() {
//   if (!isPatched) return;
//   history.pushState = originalPushState;
//   history.replaceState = originalReplaceState;
//   isPatched = false;
//   console.log("[LinkSanitizer] History API unpatched.");
// }
// // init
// chrome.storage.sync.get(
//   ["extensionEnabled", "options"],
//   ({ extensionEnabled, options }) => {
//     console.log(options?.removeMix, " initial state received");

//     if (extensionEnabled && options?.removeMix) enableFeature();
//     // interceptClicks(extensionEnabled, options);
//   }
// );
// // add or remove the listeners when the thing changes
// function interceptClicks(extensionEnabled, options) {
//   document.addEventListener(
//     "click",
//     (e) => {
//       console.log("click intercepted", e.target);
//       const link = (e.target as HTMLElement).closest(
//         'a[href*="list="]'
//       ) as HTMLAnchorElement | null;
//       console.log("link found:", link);
//       if (!link) return;

//       const cleanHref = sanitizeUrl(link.href);
//       if (cleanHref !== link.href) {
//         e.preventDefault();
//         history.pushState({}, "", cleanHref);
//         console.log("[LinkSanitizer] intercepted click →", cleanHref);
//         window.dispatchEvent(new Event("popstate"));
//       }
//     },
//     { capture: true, passive: true }
//   );
// }
// chrome.storage.onChanged.addListener((changes, area) => {
//   if (area === "sync" && (changes.extensionEnabled || changes.options)) {
//     const isEnabled =
//       changes.extensionEnabled?.newValue ??
//       changes.options?.newValue?.extensionEnabled;
//     if (isEnabled) {
//       enableFeature();
//     } else {
//       disableFeature();
//     }
//   }
// });
