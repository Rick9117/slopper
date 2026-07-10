# WORK IN PROGRESS — browser tracking has moved to the extension.

import time
import win32gui
import win32process
import psutil

CHECK_EVERY = 2  # In Seconds


def get_active_window():
    """Gets the (app_name, title) of the window currently in focus."""
    hwnd = win32gui.GetForegroundWindow()
    title = win32gui.GetWindowText(hwnd)
    _, pid = win32process.GetWindowThreadProcessId(hwnd)
    try:
        app_name = psutil.Process(pid).name()
    except (psutil.NoSuchProcess, psutil.AccessDenied, ValueError):
        app_name = "unknown"
    return app_name, title


def main():
    print("Slopper desktop tracker running. Press Ctrl+C to stop.\n")
    last = None
    try:
        while True:
            app_name, title = get_active_window()
            # Only reports when the window changes.
            if (app_name, title) != last:
                print(f"{app_name:<20} | {title}")
                last = (app_name, title)
            time.sleep(CHECK_EVERY)
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()