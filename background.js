chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "format-trip-selection",
    title: "Format trip text and copy",
    contexts: ["selection"]
  });
  chrome.contextMenus.create({
    id: "format-live-trip",
    title: "Format as live trip info",
    contexts: ["selection"]
  });
});

async function sendFormatMessage(tabId, type, selectionText) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type,
      selectionText
    });
  } catch (error) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ["formatter.js", "content.js"]
      });
      await chrome.tabs.sendMessage(tabId, {
        type,
        selectionText
      });
    } catch (injectionError) {
      console.warn("Could not format selection:", injectionError);
    }
  }
}

async function captureAndCopyScreenshot(tabId, windowId) {
  try {
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    await chrome.tabs.sendMessage(tabId, {
      type: "COPY_SCREENSHOT",
      dataUrl
    });
  } catch (error) {
    console.error("Screenshot failed:", error);
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "format-trip-selection") {
    sendFormatMessage(tab.id, "FORMAT_TRIP_SELECTION", info.selectionText || "");
  } else if (info.menuItemId === "format-live-trip") {
    sendFormatMessage(tab.id, "FORMAT_LIVE_TRIP", info.selectionText || "");
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === "format-selection") {
    sendFormatMessage(tab.id, "FORMAT_TRIP_SELECTION", "");
  } else if (command === "format-live-trip") {
    sendFormatMessage(tab.id, "FORMAT_LIVE_TRIP", "");
  } else if (command === "quick-snip") {
    captureAndCopyScreenshot(tab.id, tab.windowId);
  }
});
