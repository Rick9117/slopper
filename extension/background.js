// Closes the 'slop' tab when content.js asks for it.
// This currently is only done during Dad mode.
// Requires the "tabs" permission in manifest.json for chrome.tabs.remove().
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "closeTab" && sender.tab) {
    chrome.tabs.remove(sender.tab.id);
  }
});