const DEBUG = false;   // Needs to be set to 'true' to see console output.
if (DEBUG) console.log("Slopper: content script loaded");

// Mom mode snooze settings
let snoozeUntil = null;
let snoozeCount = 0;      // 0 = not yet dismissed
const SNOOZE_MS = 5 * 60 * 1000;   // 5 minutes

let lastMode = null;    // Clears previous mode's UI when it detects a switch.
let closeAt = null;     // Timestamps when the tab should close during dad mode.

const FIRST_CLOSE_DELAY = 30 * 1000;  // closes the 'slop' tab 30 seconds after the time limit.
const REPEAT_CLOSE_DELAY = 10 * 1000; // Afterwards, Repeatedly closes the 'slop' tab after 10 seconds.

// Works out which platform (if any) the user is currently watching slop on.
// Two strategies are used for this:
//   - URL matching: reliable, used where the site has a distinct URL (such as /shorts/).
//   - Video detection: used for endless feeds (TikTok "For You", Instagram homepage, etc)
//     where the URL never changes as you scroll.
// Returns a platform name ("youtube", "tiktok", ...) or null if this isn't slop.
function currentPlatform() {
  const url = location.href;
  // Checks for youTube Shorts
  if (url.includes("/shorts/")) return "youtube";

  // Checks for Instagram Reels (URL) and if a video plays on the home feed.
  if (url.includes("instagram.com")) {
    if (url.includes("/reel/") || url.includes("/reels/") || bigVideoPlaying()) return "instagram";
  }

  // Checks For TikTok videos.
  if (url.includes("tiktok.com")) {
    if (url.includes("/video/") || bigVideoPlaying()) return "tiktok";
  }

  // Checks for Facebook videos.
  if (url.includes("facebook.com") && (url.includes("/watch") || url.includes("/videos/"))) return "facebook";
  
  // Checks for Twitter/X videos.
  if (url.includes("twitter.com") || url.includes("x.com")) {
    if (url.includes("/status/") || bigVideoPlaying()) return "twitter";
  }

  return null;
}

// Checks if a large video is currently playing (For example, on Instagram, TikTok, Twitter/X, etc).
function bigVideoPlaying() {
  const videos = document.querySelectorAll("video");
  for (const video of videos) {
    const isPlaying = !video.paused && !video.ended && video.currentTime > 0;
    // Checks if the video is tall enough to be the main 'player' (not the explore page overview)
    // NOTE: Small (autoplaying) videos such as on Twitter/X can be the same size as grid previews.
    // Because of this, these may not be counted on the tracker. Clicking on any of these (widen them)
    // will cause the video to get tracked.
    const isLarge = video.clientHeight > window.innerHeight * 0.4;
    if (isPlaying && isLarge) {
      return true;
    }
  }
  return false;
}

// Mutes the audio during dad mode. Re-applied every tick in case the page unmutes.
function muteAllVideos() {
  document.querySelectorAll("video").forEach((v) => { v.muted = true; });
}

function unmuteAllVideos() {
  document.querySelectorAll("video").forEach((v) => { v.muted = false; });
}

// Returns the banner text for the current mode. The NSFW toggle swaps in
// stronger wording without changing any of the behaviour.
function getHeadline(mode, nsfw, snoozed) {
  if (mode === "dad") {
    return nsfw
      ? `ENOUGH! You've watched enough of this fucking slop, turn this shit off!`
      : `No more slop for you today, go do something with your life!`;
  }
  if (snoozed) {
    return nsfw
      ? `Have you finished watching this fucking slop yet?`
      : `Have you finished watching your little videos yet?`;
  }
  return nsfw
    ? `That's enough rotting for today.<br>Stop being so fucking lazy perhaps?`
    : `I think you have seen enough.<br>Maybe you should go do something else?`;
}

// Settings for the banner that pops up when the time limit is reached.
function showBanner(totalSeconds, times, mode, nsfw, secondsLeft, snoozed) {
  let overlay = document.getElementById("slopper-banner");

  const isDad = mode === "dad";
  const headline = getHeadline(mode, nsfw, snoozed);

  // Rebuild if the mode, NSFW setting, or snooze wording changed.
  const stamp = `${mode}-${nsfw}-${snoozed}`;
  if (overlay && overlay.dataset.stamp !== stamp) {
    overlay.remove();
    overlay = null;
  }

  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "slopper-banner";
    overlay.dataset.stamp = stamp;
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0",
      width: "100%", height: "100%",
      background: isDad ? "rgba(0, 0, 0, 0.97)" : "rgba(0, 0, 0, 0.85)",
      zIndex: "99999",
      display: "flex", justifyContent: "center", alignItems: "center",
    });

    const box = document.createElement("div");
    box.id = "slopper-box";
    Object.assign(box.style, {
      background: nsfw ? "#111" : (isDad ? "#b71c1c" : "#2e7d32"),
      color: "white",
      fontSize: "28px", fontWeight: "bold", textAlign: "center",
      padding: "50px 70px", borderRadius: "16px",
      maxWidth: "600px", lineHeight: "1.5",
    });

    const message = document.createElement("div");
    message.id = "slopper-message";
    box.appendChild(message);

    // Only Mom mode gets an escape hatch.
    if (!isDad) {
      const closeBtn = document.createElement("button");
      closeBtn.textContent = snoozed ? "Just 5 more minutes!" : "Continue anyway";
      Object.assign(closeBtn.style, {
        marginTop: "30px", padding: "12px 28px",
        fontSize: "18px", fontWeight: "bold",
        color: nsfw ? "#111" : "#2e7d32", background: "white",
        border: "none", borderRadius: "8px", cursor: "pointer",
      });
      closeBtn.addEventListener("click", () => {
        overlay.remove();
        snoozeUntil = Date.now() + SNOOZE_MS;
        snoozeCount++;
      });
      box.appendChild(closeBtn);
    }

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  const countdown = secondsLeft !== null && secondsLeft !== undefined
    ? `<br><span style="font-size:22px;">Closing this tab in ${secondsLeft}s</span>`
    : ``;

  document.getElementById("slopper-message").innerHTML =
    `${headline}${countdown}<br><br>` +
    `<span style="font-size:20px; font-weight:normal;">` +
    `Total: ${Math.floor(totalSeconds / 60)} min &nbsp;|&nbsp; ` +
    `YouTube: ${Math.floor(times.youtube / 60)}m &nbsp; ` +
    `Instagram: ${Math.floor(times.instagram / 60)}m &nbsp; ` +
    `TikTok: ${Math.floor(times.tiktok / 60)}m &nbsp; ` +
    `Facebook: ${Math.floor(times.facebook / 60)}m &nbsp; ` +
    `X: ${Math.floor(times.twitter / 60)}m</span>`;
}

// Small window in the corner, shows after the Mom mode banner is dismissed.
function showMiniWidget(totalSeconds) {
  let mini = document.getElementById("slopper-mini");

  if (!mini) {
    mini = document.createElement("div");
    mini.id = "slopper-mini";
    Object.assign(mini.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      background: "#2e7d32", // Only appears in Mom mode
      color: "white",
      padding: "12px 18px",
      borderRadius: "10px",
      fontSize: "15px",
      fontWeight: "bold",
      fontFamily: "sans-serif",
      zIndex: "99999",
      boxShadow: "0 2px 10px rgba(0,0,0,0.4)",
      pointerEvents: "none",
    });
    document.body.appendChild(mini);
  }

  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  mini.textContent = `Slop today: ${mins}m ${secs}s`;
}


// The main loop, runs once per second and does four things:
//   1. Reads the user's settings (on/off, mode, NSFW).
//   2. Works out whether the user is actively watching slop right now.
//   3. Adds one second to that platform's daily (total) time and saves it.
//   4. Once past the limit, shows the banner / mini widget, or enforces Dad mode.
setInterval(async () => {
  const settings = await chrome.storage.local.get(["enabled", "mode", "nsfw", "dadTriggered"]);
  const enabled = settings.enabled !== false;
  const mode = settings.mode || "mom";
  const nsfw = settings.nsfw === true;
  const limit = await getLimitSeconds();

  if (!enabled) {
    document.getElementById("slopper-banner")?.remove();
    document.getElementById("slopper-mini")?.remove();
    unmuteAllVideos();
    closeAt = null;
    return;
  }

  // Once the countdown is armed it runs no matter what's on screen.
  if (closeAt !== null && Date.now() >= closeAt) {
    closeAt = null;
    chrome.runtime.sendMessage({ type: "closeTab" });
    return;
  }

  if (mode !== lastMode) {
    document.getElementById("slopper-banner")?.remove();
    document.getElementById("slopper-mini")?.remove();
    unmuteAllVideos();
    snoozeUntil = null;
    snoozeCount = 0;;
    closeAt = null;
    lastMode = mode;
  }

  const platform = currentPlatform();

  if (platform && document.visibilityState === "visible") {
    const data = await chrome.storage.local.get(["slopTimes", "slopDate"]);
    const today = todayKey();
    const saved = data.slopDate === today ? (data.slopTimes || {}) : {};

    if (data.slopDate !== today) {
      document.getElementById("slopper-banner")?.remove();
      document.getElementById("slopper-mini")?.remove();
      unmuteAllVideos();
      snoozeUntil = null;
      snoozeCount = 0;;
      closeAt = null;
      await chrome.storage.local.set({ dadTriggered: false });
    }

    const times = {
      youtube:   saved.youtube   || 0,
      instagram: saved.instagram || 0,
      tiktok:    saved.tiktok    || 0,
      facebook:  saved.facebook  || 0,
      twitter:   saved.twitter   || 0,
    };

    times[platform]++;
    await chrome.storage.local.set({ slopTimes: times, slopDate: today });

    const total = times.youtube + times.instagram + times.tiktok + times.facebook + times.twitter;
    if (DEBUG) console.log(`Slop today - total ${total}s`, times);

    if (total >= limit) {
      if (mode === "dad") {
        muteAllVideos();

        if (closeAt === null) {
          const delay = settings.dadTriggered ? REPEAT_CLOSE_DELAY : FIRST_CLOSE_DELAY;
          closeAt = Date.now() + delay;
          await chrome.storage.local.set({ dadTriggered: true });
        }

        const secondsLeft = Math.ceil((closeAt - Date.now()) / 1000);
        showBanner(total, times, mode, nsfw, secondsLeft, false);

      } else {
        // Mom mode: quiet while snoozing, banner again once the snooze expires.
        const snoozing = snoozeUntil !== null && Date.now() < snoozeUntil;

        if (snoozing) {
          showMiniWidget(total);
        } else {
          document.getElementById("slopper-mini")?.remove();
          showBanner(total, times, mode, nsfw, null, snoozeCount > 0);
        }
      }
    }
  }
}, 1000);