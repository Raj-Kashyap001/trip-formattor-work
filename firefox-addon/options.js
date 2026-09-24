const list = document.getElementById("statement-list");
const formTitle = document.getElementById("form-title");
const statementId = document.getElementById("statement-id");
const statementName = document.getElementById("statement-name");
const statementText = document.getElementById("statement-text");
const saveButton = document.getElementById("save-statement");
const cancelButton = document.getElementById("cancel-edit");
const resetButton = document.getElementById("reset-defaults");
const status = document.getElementById("status");

let statements = [];

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    status.textContent = "";
  }, 1800);
}

function clearForm() {
  statementId.value = "";
  statementName.value = "";
  statementText.value = "";
  formTitle.textContent = "Add Statement";
  saveButton.textContent = "Save statement";
}

function renderStatements() {
  list.textContent = "";

  statements.forEach((statement) => {
    const item = document.createElement("article");
    item.className = "statement-card";

    const content = document.createElement("div");
    content.className = "statement-content";

    const title = document.createElement("h2");
    title.textContent = statement.name;

    const text = document.createElement("p");
    text.textContent = statement.text;

    content.append(title, text);

    if (DriverStatementStore.isSpecial(statement)) {
      const badge = document.createElement("span");
      badge.className = "statement-badge";
      badge.textContent = "Fixed · auto-filled from input";
      content.append(badge);
      item.append(content);
      list.append(item);
      return;
    }

    const actions = document.createElement("div");
    actions.className = "card-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => {
      statementId.value = statement.id;
      statementName.value = statement.name;
      statementText.value = statement.text;
      formTitle.textContent = "Edit Statement";
      saveButton.textContent = "Update statement";
      statementName.focus();
    });

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "danger";
    removeButton.textContent = "Remove";
    removeButton.addEventListener("click", async () => {
      if (DriverStatementStore.isSpecial(statement)) {
        setStatus("Offline statement is fixed");
        return;
      }

      statements = statements.filter((itemToKeep) => itemToKeep.id !== statement.id);
      await DriverStatementStore.saveStatements(statements);

      const selectedId = await DriverStatementStore.getSelectedStatementId();
      if (selectedId === statement.id) {
        await chrome.storage.local.set({ [DriverStatementStore.selectedStorageKey]: "" });
      }

      clearForm();
      renderStatements();
      setStatus("Statement removed");
    });

    content.append(title, text);
    actions.append(editButton, removeButton);
    item.append(content, actions);
    list.append(item);
  });
}

async function loadStatements() {
  statements = await DriverStatementStore.getStatements();
  renderStatements();
}

saveButton.addEventListener("click", async () => {
  const id = statementId.value;
  const name = statementName.value.trim();
  const text = statementText.value.trim();

  if (!name || !text) {
    setStatus("Topic and description are required");
    return;
  }

  if (id && DriverStatementStore.isSpecial(statements.find((statement) => statement.id === id))) {
    setStatus("Offline statement is fixed");
    return;
  }

  if (id) {
    statements = statements.map((statement) =>
      statement.id === id ? { ...statement, name, text } : statement
    );
    setStatus("Statement updated");
  } else {
    statements.push({
      id: `statement-${Date.now()}`,
      name,
      text
    });
    setStatus("Statement added");
  }

  await DriverStatementStore.saveStatements(statements);
  clearForm();
  renderStatements();
});

cancelButton.addEventListener("click", clearForm);

document.getElementById("open-shortcuts").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("shortcuts.html") });
});

resetButton.addEventListener("click", async () => {
  statements = [...DriverStatementStore.defaultStatements];
  await DriverStatementStore.saveStatements(statements);
  await chrome.storage.local.set({ [DriverStatementStore.selectedStorageKey]: "" });
  clearForm();
  renderStatements();
  setStatus("Defaults restored");
});

loadStatements();
