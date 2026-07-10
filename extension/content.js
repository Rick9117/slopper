console.log("Slopper: content script loaded on YouTube");

const LIMIT_SECONDS = 15;   // TESTING for 15s. Change to 10 * 60 later.

function isOnShorts() {
  return location.href.includes("/shorts/");
}

function showBanner(seconds) {
  let overlay = document.getElementById("slopper-banner");

  // Creates the overlay + box if it doesn't exist yet.
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
    // An id for the box so it can be found it.
    box.id = "slopper-box";
    Object.assign(box.style, {
      background: "#cc0000", color: "white",
      fontSize: "32px", fontWeight: "bold", textAlign: "center",
      padding: "50px 70px", borderRadius: "16px",
      maxWidth: "600px", lineHeight: "1.4",
    });

    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }

  // ALWAYS updates the text, whether it was just made or already existed.
  const box = document.getElementById("slopper-box");
  box.textContent =
    `⏱ You've watched ${Math.floor(seconds / 60)} minutes of Shorts. Time for a break!`;
}

setInterval(async () => {
  if (isOnShorts() && document.visibilityState === "visible") {
    const data = await chrome.storage.local.get("shortsSeconds");
    const total = (data.shortsSeconds || 0) + 1;
    await chrome.storage.local.set({ shortsSeconds: total });

    console.log(`Shorts watch time today: ${total}s`);

    if (total >= LIMIT_SECONDS) {
      showBanner(total);
    }
  }
}, 1000);