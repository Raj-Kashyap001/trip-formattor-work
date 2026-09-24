(function (global) {
  const statementsStorageKey = "driverStatements";
  const selectedStorageKey = "selectedDriverStatementId";

  const defaultStatements = [
    {
      id: "driver-overheat",
      name: "Overheat",
      text: "Driver Statement:- Gadi overheat ho gayi hai, isliye ruki hui hai."
    },
    {
      id: "driver-food",
      name: "Food halt",
      text: "Driver Statement:- Driver khane ke liye ruka hai."
    },
    {
      id: "driver-no-response",
      name: "No response",
      text: "Note:- Driver ko multiple times call lagaya gaya lekin phone nahi uthaye."
    },
    {
      id: "offline-vehicle",
      name: "Offline",
      text: "Vehicle [vehicle number] got offline on date[] time[], from the location[detail] and vehicle movement not being tracked. It may be device issue or ignition problem. Action: Please verify the seal/tarpaulin once it get reached on destination."
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
