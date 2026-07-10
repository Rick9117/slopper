// Activates when you switch to a different TAB.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  console.log("Switched:", tab.title, "|", tab.url);
});

// Activates when a tab navigates to a new URL.
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    console.log("Navigated:", tab.title, "|", changeInfo.url);
  }
});