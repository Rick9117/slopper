// Shared by content.js and popup.js.

const DEFAULT_LIMIT_SECONDS = 10 * 60;   // 10 minutes.

// The user's limit, or the default if they haven't set one.
async function getLimitSeconds() {
  const data = await chrome.storage.local.get("limitSeconds");
  return data.limitSeconds || DEFAULT_LIMIT_SECONDS;
}

// Today's date as a string in the EU format ("18-7-2026") Resets the totals at midnight.
function todayKey() {
  const d = new Date();
  return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
}