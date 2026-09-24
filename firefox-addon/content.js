(function () {
  if (window.__whatsappTripFormatterContentLoaded) {
    return;
  }
  window.__whatsappTripFormatterContentLoaded = true;

  function getSelectedText() {
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "TEXTAREA" ||
        (active.tagName === "INPUT" && /^(text|search|url|tel|email|number)?$/i.test(active.type)))
    ) {
      return active.value.slice(active.selectionStart || 0, active.selectionEnd || 0);
    }

    return String(window.getSelection() || "");
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.top = "-999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }

  function showToast(message) {
    const existing = document.getElementById("whatsapp-trip-formatter-toast");
    if (existing) {
      existing.remove();
    }

    const toast = document.createElement("div");
    toast.id = "whatsapp-trip-formatter-toast";
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      right: "18px",
      bottom: "18px",
      zIndex: "2147483647",
      padding: "10px 14px",
      borderRadius: "8px",
      background: "#17202a",
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
      fontSize: "13px",
      lineHeight: "1.3",
      maxWidth: "min(520px, calc(100vw - 36px))",
      maxHeight: "60vh",
      overflow: "auto",
      whiteSpace: "pre-wrap",
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.24)",
      transition: "opacity 180ms ease, transform 180ms ease"
    });

    document.body.appendChild(toast);

    window.setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      window.setTimeout(() => toast.remove(), 220);
    }, 1800);
  }

  async function copyImageToClipboard(dataUrl) {
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      showToast("Screenshot copied to clipboard");
    } catch (err) {
      console.error(err);
      showToast("Failed to copy screenshot");
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === "SHOW_TOAST") {
      showToast(message.message || "");
      return;
    }

    if (message?.type === "COPY_SCREENSHOT") {
      copyImageToClipboard(message.dataUrl);
      return;
    }

    if (message?.type === "FORMAT_SMART") {
      const sourceText = getSelectedText() || message.selectionText;
      const formatted = WhatsAppTripFormatter.smartFormat(sourceText);

      if (!formatted) {
        showToast("No valid trip text found to format");
        return;
      }

      copyText(formatted)
        .then(() => showToast(`Copied formatted text\n\n${formatted}`))
        .catch(() => showToast("Copy failed"));
      return;
    }

    if (message?.type === "FORMAT_TRIP_SELECTION") {
      const sourceText = getSelectedText() || message.selectionText;
      const formatted = WhatsAppTripFormatter.formatTripText(sourceText);

      if (!formatted) {
        showToast("No selected trip text found");
        return;
      }

      copyText(formatted)
        .then(() => showToast(`Copied to clipboard\n\n${formatted}`))
        .catch(() => showToast("Copy failed"));
      return;
    }

    if (message?.type === "FORMAT_LIVE_TRIP") {
      const sourceText = getSelectedText() || message.selectionText;
      const formatted = WhatsAppTripFormatter.formatLiveTrip(sourceText);

      if (!formatted) {
        showToast("No selected live trip text found");
        return;
      }

      copyText(formatted)
        .then(() => showToast(`Copied live trip info\n\n${formatted}`))
        .catch(() => showToast("Copy failed"));
      return;
    }
  });
})();
