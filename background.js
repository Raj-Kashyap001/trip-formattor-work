chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "smart-format-trip",
    title: "Format Trip Selection / Live Info",
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
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "SHOW_TOAST",
        message: `Screenshot failed: ${error?.message || error}`
      });
    } catch (toastError) {
      // The tab may not have the content script (about:/PDF pages).
    }
  }
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === "smart-format-trip") {
    sendFormatMessage(tab.id, "FORMAT_SMART", info.selectionText || "");
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  if (command === "format-selection") {
    sendFormatMessage(tab.id, "FORMAT_SMART", "");
  } else if (command === "format-live-trip") {
    sendFormatMessage(tab.id, "FORMAT_SMART", "");
  } else if (command === "quick-snip") {
    captureAndCopyScreenshot(tab.id, tab.windowId);
  }
});
