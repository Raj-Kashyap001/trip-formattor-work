(function (global) {
  const statementsStorageKey = "driverStatements";
  const selectedStorageKey = "selectedDriverStatementId";

  const defaultStatements = [
    {
      id: "driver-overheat",
      name: "Overheat",
      text: "Gadi overheat ho gayi hai, isliye ruki hui hai."
    },
    {
      id: "driver-tyre",
      name: "Tyre issue",
      text: "Gadi me tyre ki problem hai, driver use theek karwa raha hai."
    },
    {
      id: "driver-food",
      name: "Food halt",
      text: "Driver khane ke liye ruka hai, thodi der me gadi aage niklegi."
    },
    {
      id: "driver-no-response",
      name: "No response",
      text: "Driver se contact karne ki koshish ki gayi, lekin abhi call receive nahi hua."
    }
  ];

  async function getStatements() {
    const stored = await chrome.storage.local.get(statementsStorageKey);
    const statements = stored[statementsStorageKey];

    return Array.isArray(statements) && statements.length ? statements : [...defaultStatements];
  }

  async function saveStatements(statements) {
    await chrome.storage.local.set({ [statementsStorageKey]: statements });
  }

  async function getSelectedStatementId() {
    const stored = await chrome.storage.local.get(selectedStorageKey);
    return stored[selectedStorageKey] || "";
  }

  global.DriverStatementStore = {
    statementsStorageKey,
    selectedStorageKey,
    defaultStatements,
    getStatements,
    saveStatements,
    getSelectedStatementId
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
