const input = document.getElementById("input");
const output = document.getElementById("output");
const resetButton = document.getElementById("reset");
const copyButton = document.getElementById("copy");
const status = document.getElementById("status");
const driverList = document.getElementById("driver-list");
const manageStatementsButton = document.getElementById("manage-statements");

let driverStatements = [...DriverStatementStore.defaultStatements];
let selectedDriverStatementId = "";

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

function updateOutput() {
  const formatted = WhatsAppTripFormatter.formatTripText(input.value);
  const selectedStatement = driverStatements.find((statement) => statement.id === selectedDriverStatementId);

  if (!selectedStatement) {
    output.value = formatted;
    return;
  }

  const isSpecial = DriverStatementStore.isSpecial(selectedStatement);
  const statementText = isSpecial
    ? WhatsAppTripFormatter.buildOfflineStatement(input.value)
    : selectedStatement.text;

  output.value =
    formatted || isSpecial
      ? formatted
        ? `${formatted}\n*${statementText}*`
        : `*${statementText}*`
      : formatted;
}

function saveDriverState() {
  chrome.storage.local.set({
    [DriverStatementStore.selectedStorageKey]: selectedDriverStatementId
  });
}

function renderDriverStatements() {
  driverList.textContent = "";

  driverStatements.forEach((statement) => {
    const item = document.createElement("label");
    item.className = "driver-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = statement.id === selectedDriverStatementId;
    checkbox.addEventListener("change", () => {
      selectedDriverStatementId = checkbox.checked ? statement.id : "";
      saveDriverState();
      renderDriverStatements();
      updateOutput();
    });

    const body = document.createElement("span");
    body.className = "driver-body";

    const name = document.createElement("span");
    name.className = "driver-name";
    name.textContent = DriverStatementStore.isSpecial(statement)
      ? `${statement.name} (auto) ->`
      : `${statement.name} ->`;

    const text = document.createElement("span");
    text.className = "driver-text";
    text.textContent = statement.text;

    body.append(name, text);
    item.append(checkbox, body);
    driverList.append(item);
  });
}

async function loadDriverState() {
  driverStatements = await DriverStatementStore.getStatements();
  selectedDriverStatementId = await DriverStatementStore.getSelectedStatementId();

  if (!driverStatements.some((statement) => statement.id === selectedDriverStatementId)) {
    selectedDriverStatementId = "";
  }

  renderDriverStatements();
}

function readSelectionFromPage() {
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

async function loadActiveTabSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) {
      return;
    }

    const [selection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: readSelectionFromPage
    });

    const selectedText = selection?.result?.trim();
    if (!selectedText) {
      return;
    }

    input.value = selectedText;
    updateOutput();
    setStatus("Selection loaded");
  } catch (error) {
    // Some Chrome pages do not allow extension scripts.
  }
}

input.addEventListener("input", updateOutput);

manageStatementsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

resetButton.addEventListener("click", () => {
  input.value = "";
  updateOutput();
  input.focus();
  setStatus("Reset");
});

copyButton.addEventListener("click", async () => {
  updateOutput();

  if (!output.value.trim()) {
    setStatus("Nothing to copy");
    return;
  }

  try {
    await navigator.clipboard.writeText(output.value);
    setStatus("Copied to clipboard");
  } catch (error) {
    output.focus();
    output.select();
    document.execCommand("copy");
    setStatus("Copied to clipboard");
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[DriverStatementStore.statementsStorageKey]) {
    return;
  }

  loadDriverState().then(updateOutput);
});

Promise.all([loadDriverState(), loadActiveTabSelection()]).finally(updateOutput);
