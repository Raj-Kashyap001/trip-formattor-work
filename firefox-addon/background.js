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

async function sendToast(tabId, message) {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      message
    });
  } catch (toastError) {
    // The tab may not have the content script (about:/PDF pages).
  }
}

async function captureTabImage(tabId) {
  try {
    return await chrome.tabs.captureTab(tabId, { format: "png" });
  } catch (captureError) {
    // captureTab requires <all_urls>. Ask for host access and retry once.
    const hasHostAccess = await chrome.permissions.contains({ origins: ["<all_urls>"] });
    if (!hasHostAccess) {
      try {
        await chrome.permissions.request({ origins: ["<all_urls>"] });
        return await chrome.tabs.captureTab(tabId, { format: "png" });
      } catch (permissionError) {
        const error = new Error(
          `${captureError?.message || captureError}. ` +
            'Enable "Access your data for all sites" for Trip Formatter in about:addons, then reload the add-on.'
        );
        throw error;
      }
    }
    throw captureError;
  }
}

async function captureAndCopyScreenshot(tabId) {
  try {
    const dataUrl = await captureTabImage(tabId);

    // Firefox: copy the image from the background page. The page's
    // navigator.clipboard.write() fails on insecure origins and without a
    // user gesture left after the async capture.
    if (typeof chrome.clipboard?.setImageData === "function") {
      const buffer = await (await fetch(dataUrl)).arrayBuffer();
      await chrome.clipboard.setImageData(buffer, "png");
      await sendToast(tabId, "Screenshot copied to clipboard");
      return;
    }

    await chrome.tabs.sendMessage(tabId, {
      type: "COPY_SCREENSHOT",
      dataUrl
    });
  } catch (error) {
    console.error("Screenshot failed:", error);
    await sendToast(tabId, `Screenshot failed: ${error?.message || error}`);
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
    captureAndCopyScreenshot(tab.id);
  } else if (command === "duplicate-tab") {
    try {
      await chrome.tabs.duplicate(tab.id);
    } catch (error) {
      console.warn("Could not duplicate tab:", error);
    }
  }
});
