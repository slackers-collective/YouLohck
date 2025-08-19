document.addEventListener("DOMContentLoaded", function () {
  const status = document.getElementById("status")!;
  function setStatusText(isEnabled: boolean) {
    status.textContent = isEnabled ? "Turn off" : "Turn on";
  }
  chrome.storage.sync.get(["extensionEnabled"], function (result) {
    const isEnabled = result.extensionEnabled !== false;
    setStatusText(isEnabled);
  });
  // toggle.addEventListener("click", function () {
  //   chrome.storage.sync.get("extensionEnabled", async function (result) {
  //     console.log(result);
  //     const extensionEnabled = !result.extensionEnabled;
  //     chrome.storage.sync.set({ extensionEnabled }, () => {
  //       setStatusText(extensionEnabled);
  //     });
  //   });
  // });
});

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    document.documentElement.classList.toggle("dark", e.matches);
  });
