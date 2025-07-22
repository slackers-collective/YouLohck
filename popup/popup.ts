document.addEventListener("DOMContentLoaded", function () {
  const toggle = document.getElementById("toggle-removal") as HTMLInputElement;
  const status = document.getElementById("status")!;
  function setStatusText(isEnabled: boolean) {
    status.textContent = isEnabled ? "Enabled" : "Disabled";
  }
  chrome.storage.sync.get(["removalEnabled"], function (result) {
    toggle.checked = result.removalEnabled !== false;
    setStatusText(toggle.checked);
  });
  toggle.addEventListener("change", function () {
    chrome.storage.sync.set({ removalEnabled: toggle.checked });
    setStatusText(toggle.checked);
  });
});
