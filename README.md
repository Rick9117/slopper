# Slopper (Slop/Brainrot stopper)
This is a (personal) activity tracker that monitors on what and how much time you spend on your computer;
More specifically on 'slop/brainrot' content. Currently it runs on the following websites:
| Status | Website | Notes |
|------|------|------|
| Works | Youtube Shorts |
| Works | Instagram Reels |
| Works| Tiktok |
| Works | Facebook |
| Partially | Twitter/X | The small (autoplaying) videos are the same size as grid previews, causing them to not be counted on the tracker.

Slopper has two halves that work together: a **Python tracker** that watches
your desktop applications (Currently still Work in progress), and a **Chrome extension** that watches your browser
and that *will* step in when you've been scrolling too long (Only for Youtube Shorts at the moment).

## Current status: v0.1
The first working version. 
What it does:

- **Desktop tracking (Python):** logs the active window — the application and
  window title currently in focus — using the Windows API.
- **Shorts tracker (Chrome extension):** detects when you're watching YouTube
  Shorts, counts the time you *actively* spend on them (ignoring background
  tabs), and saves the running total so it survives browser restarts.
- **Intervention:** once you pass a time limit, a full-screen banner appears
  over the Short as a nudge to stop.

## How it works

| Part | Tech | Job |
|------|------|-----|
| `tracker.py` | Python, pywin32, psutil | Tracks the active desktop window |
| `extension/` | JavaScript (Manifest V3) | Tracks & limits YouTube Shorts in-browser |

The browser can't be tracked from the OS level and the desktop can't be tracked
from inside the browser, so Slopper uses the right tool for each: Python for the
computer, a Chrome extension for the web.

## Running it

**Desktop tracker:**
```bash
pip install pywin32 psutil
python tracker.py
```

**Chrome extension:**
1. Go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select the `extension/` folder
4. Browse to YouTube Shorts - the timer runs automatically

## Roadmap

- [X] ~~**Get the project up and running in its basic form**~~
- [ ] **Track other sites**
  - [X] ~~Instagram Reels~~
  - [X] ~~TikTok~~
  - [X] ~~Facebook~~
  - [X] ~~Twitter/X~~
- [ ] **Add two modes ('Mom' & 'Dad')**
  - [ ] 'Mom' mode: suggests you turn off the slop
  - [ ] 'Dad' mode: forcefully turns it off for you (real enforcement — block scrolling / close the tab, not just a warning)
    - [ ] Optional NSFW version that's more aggressive/verbal
- [ ] **Tracker Customization**
  - [ ] Allows the user to change the time of the tracker (and colour of the pop-up?)
- [ ] **A dashboard with daily and weekly activity graphs (similar to ActivityWatch)**
  - [ ] Categorize activity (work, social, entertainment, etc.)
  - [ ] Predict future usage from past patterns