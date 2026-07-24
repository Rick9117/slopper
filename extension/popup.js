// Eight colour stages up to the limit, then black once it's reached said limit.
const STAGES = [
  "#8bc34a",  // light green
  "#2e7d32",  // dark green
  "#ffee58",  // light yellow
  "#fbc02d",  // dark yellow
  "#ffb74d",  // light orange
  "#ef6c00",  // dark orange
  "#ef5350",  // light red
  "#b71c1c",  // dark red
];

// Storage keys mapped to the names shown in the breakdown.
const SITE_NAMES = {
  youtube:   "YouTube",
  instagram: "Instagram",
  tiktok:    "TikTok",
  facebook:  "Facebook",
  twitter:   "X (Twitter)",
};

// For the time slider.
const limitSlider = document.getElementById("limit-slider");
const limitValue = document.getElementById("limit-value");

// References to the controls in popup.html.
const radios = document.querySelectorAll('input[name="mode"]');
const power = document.getElementById("power");
const powerLabel = document.getElementById("power-label");
const nsfwBox = document.getElementById("nsfw");

// The three paint functions only handle appearance, they add or remove the "selected" CSS class.
// Saving happens separately in the listeners below.
function paintMode(mode) {
  document.getElementById("mom-card").classList.toggle("selected", mode === "mom");
  document.getElementById("dad-card").classList.toggle("selected", mode === "dad");
}

// Turns the NSFW card black when the toggle is on.
function paintNsfw(on) {
  document.getElementById("nsfw-card").classList.toggle("selected", on);
}

// Swaps the label between ON/OFF and recolours it (green/red) via the CSS class.
function paintPower(enabled) {
  powerLabel.textContent = enabled ? "ON" : "OFF";
  powerLabel.className = enabled ? "on" : "off";
}

// Runs when the popup opens: loads the saved settings from storage and makes the controls match them,
// so the user's choices persist between sessions.
chrome.storage.local.get(["mode", "enabled", "nsfw", "limitSeconds"]).then((data) => {
  const mode = data.mode || "mom";
  const enabled = data.enabled !== false;
  const nsfwOn = data.nsfw === true;

  // The slider works in minutes, storage holds seconds.
  const savedMinutes = Math.round((data.limitSeconds || DEFAULT_LIMIT_SECONDS) / 60);
  limitSlider.value = savedMinutes;
  limitValue.textContent = `${savedMinutes} min`;

  document.querySelector(`input[value="${mode}"]`).checked = true;
  power.checked = enabled;
  nsfwBox.checked = nsfwOn;
  paintMode(mode);
  paintPower(enabled);
  paintNsfw(nsfwOn);
});

// Each control saves to chrome.storage the moment it changes.
// content.js reads that same storage every second, so changes take effect without a reload.
radios.forEach((radio) => {
  radio.addEventListener("change", async () => {
    await chrome.storage.local.set({ mode: radio.value });
    paintMode(radio.value);
  });
});

// Saves the on/off state when toggled.
power.addEventListener("change", async () => {
  await chrome.storage.local.set({ enabled: power.checked });
  paintPower(power.checked);
});

// Saves the NSFW language toggle when switched.
nsfwBox.addEventListener("change", async () => {
  await chrome.storage.local.set({ nsfw: nsfwBox.checked });
  paintNsfw(nsfwBox.checked);
});

// Daily timer bar
function formatTime(sec) {
  return `${Math.floor(sec / 60)}m ${Math.floor(sec % 60)}s`;
}

// Readable form for the breakdown in the time extension, Example: "1 minute, 10 seconds".
function formatLong(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const parts = [];
  if (m > 0) parts.push(`${m} minute${m === 1 ? "" : "s"}`);
  if (s > 0 || m === 0) parts.push(`${s} second${s === 1 ? "" : "s"}`);
  return parts.join(", ");
}

// Picks a colour from how far through the limit you are (0 = start, 1 = limit).
function barColour(fraction) {
  if (fraction >= 1) return "#000000";
  const i = Math.min(STAGES.length - 1, Math.floor(fraction * STAGES.length));
  return STAGES[i];
}

async function paintTimer() {
  const limit = await getLimitSeconds();
  const data = await chrome.storage.local.get(["slopTimes", "slopDate"]);
  // Ignore yesterday's totals, exactly like content.js does.
  const t = (data.slopDate === todayKey() && data.slopTimes) ? data.slopTimes : {};
  const total = (t.youtube || 0) + (t.instagram || 0) + (t.tiktok || 0)
              + (t.facebook || 0) + (t.twitter || 0);

  const fraction = total / limit;

  document.getElementById("timer-time").textContent = formatTime(total);
  document.getElementById("timer-limit").textContent = `/ ${formatTime(limit)}`;

  const fill = document.getElementById("bar-fill");
  fill.style.width = Math.min(100, fraction * 100) + "%";
  fill.style.background = barColour(fraction);

  // Builds the per-site breakdown: only sites with time, biggest first.
  const rows = Object.keys(SITE_NAMES)
    .map((key) => [SITE_NAMES[key], t[key] || 0])
    .filter(([, sec]) => sec > 0)
    .sort((a, b) => b[1] - a[1]);

  document.getElementById("breakdown").innerHTML = rows.length
    ? rows.map(([name, sec]) =>
        `<div class="breakdown-row"><span>${name}</span><span>${formatLong(sec)}</span></div>`
      ).join("")
    : `<div class="breakdown-empty">No slop tracked today.</div>`;
}

// Clicking the timer expands or collapses the per-site breakdown.
document.getElementById("timer-toggle").addEventListener("click", () => {
  const open = document.getElementById("breakdown").classList.toggle("open");
  document.getElementById("timer-arrow").classList.toggle("open", open);
});

// Live label update while dragging (fires continuously).
limitSlider.addEventListener("input", () => {
  limitValue.textContent = `${limitSlider.value} min`;
});

// Saves only when the user lets go of the slider, then refresh the bar against the new limit.
limitSlider.addEventListener("change", async () => {
  await chrome.storage.local.set({ limitSeconds: Number(limitSlider.value) * 60 });
  paintTimer();
});

paintTimer();
setInterval(paintTimer, 1000);   // Makes sure it keeps ticking while the popup is open.