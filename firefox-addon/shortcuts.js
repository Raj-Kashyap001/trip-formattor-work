const list = document.getElementById("shortcut-list");
const hint = document.getElementById("shortcut-hint");

function addRow(label, keys) {
  const row = document.createElement("article");
  row.className = "shortcut-row";

  const name = document.createElement("span");
  name.className = "shortcut-name";
  name.textContent = label;

  const key = document.createElement("kbd");
  key.className = "shortcut-keys";
  key.textContent = keys;

  row.append(name, key);
  list.append(row);
}

async function render() {
  list.textContent = "";

  const commands = await chrome.commands.getAll();
  commands
    .filter((command) => command.name && !command.name.startsWith("_"))
    .forEach((command) => {
      addRow(command.description || command.name, command.shortcut || "Not assigned");
    });

  addRow("Format selected text (right-click menu)", "Format Trip Selection / Live Info");
  addRow("Open formatter", "Toolbar popup icon");

  const isFirefox = typeof browser !== "undefined" && Boolean(browser.runtime?.getURL);
  hint.textContent = isFirefox
    ? "To change a shortcut: about:addons → ⚙ → Manage Extension Shortcuts."
    : "To change a shortcut: chrome://extensions/shortcuts.";
}

render();
