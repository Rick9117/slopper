console.log("Slopper: content script loaded");

const LIMIT_SECONDS = 10 * 60;   // 10 minutes.

// Which 'slop' platform is the current page, or null if it's not 'slop'.
function currentPlatform() {
  const url = location.href;
  // Checks for youtube Shorts
  if (url.includes("/shorts/")) return "youtube";

  // Checks for both /reel/ and /reels/
  if (url.includes("/reel/") || url.includes("/reels/")) return "instagram";

  // Checks if you are on Explore / single videos
  if (url.includes("/video/")) return "tiktok";
  // Checks the For You feed ('Homepage')
  if (bigVideoPlaying()) return "tiktok";

  // Checks for Facebook videos
  if (url.includes("facebook.com") && (url.includes("/watch") || url.includes("/videos/"))) return "facebook";
  
  // Checks for Twitter/X videos
  if (url.includes("twitter.com") || url.includes("x.com")) {
    if (url.includes("/status/") || bigVideoPlaying()) return "twitter";
  }

  return null;
}

// Checks to see if a video is playing in Tiktok's feed.
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

// Settings for the banner that pops up when the time limit is reached.
function showBanner(totalSeconds, times) {
  let overlay = document.getElementById("slopper-banner");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "slopper-banner";
    Object.assign(overlay.style, {
      position: "fixed", top: "0", left: "0",
      width: "100%", height: "100%",
      background: "rgba(0, 0, 0, 0.85)",
      zIndex: "99999",
      display: "flex", justifyContent: "center", alignItems: "center",
    });
    const box = document.createElement("div");
    box.id = "slopper-box";
    Object.assign(box.style, {
      background: "#cc0000", color: "white",
      fontSize: "28px", fontWeight: "bold", textAlign: "center",
      padding: "50px 70px", borderRadius: "16px",
      maxWidth: "600px", lineHeight: "1.5",
    });
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  //Always refreshes the text with live numbers.
  document.getElementById("slopper-box").innerHTML =
    `⏱ You've spent ${Math.floor(totalSeconds / 60)} minutes on slop today.<br>` +
    `YouTube: ${Math.floor(times.youtube / 60)}m &nbsp; ` +
    `Instagram: ${Math.floor(times.instagram / 60)}m &nbsp; ` +
    `TikTok: ${Math.floor(times.tiktok / 60)}m<br>Time for a break!`
    `X: ${Math.floor(times.twitter / 60)}m`;
}

setInterval(async () => {
  const platform = currentPlatform();

  if (platform && document.visibilityState === "visible") {
    //Loads the saved per-site record (or start a fresh one).
    const data = await chrome.storage.local.get("slopTimes");
    const saved = data.slopTimes || {};
    const times = {
      youtube:   saved.youtube   || 0,
      instagram: saved.instagram || 0,
      tiktok:    saved.tiktok    || 0,
      facebook:  saved.facebook  || 0,
      twitter:   saved.twitter   || 0,
    };

    //Adds one second to whichever platform the user is on.
    times[platform]++;
    await chrome.storage.local.set({ slopTimes: times });

    //Sums across all sites for the limit check.
    const total = times.youtube + times.instagram + times.tiktok + times.facebook + times.twitter;
    console.log(`Slop today - total ${total}s`, times);

    if (total >= LIMIT_SECONDS) {
      showBanner(total, times);
    }
  }
}, 1000);