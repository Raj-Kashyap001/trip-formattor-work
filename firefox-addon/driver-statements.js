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
      special: true,
      text: "Vehicle got offline and vehicle movement is not being tracked. It may be device issue or ignition problem. Action: Please verify the seal/tarpaulin once it get reached on destination."
    }
  ];

  const specialStatements = defaultStatements.filter((statement) => statement.special);

  function isSpecial(statement) {
    return Boolean(statement && statement.special);
  }

  function syncSpecialStatements(statements) {
    const result = [...statements];

    specialStatements.forEach((specialDefault) => {
      const existingIndex = result.findIndex((statement) => statement.id === specialDefault.id);
      if (existingIndex === -1) {
        result.push({ ...specialDefault });
      } else {
        result[existingIndex] = { ...specialDefault };
      }
    });

    return result.filter(
      (statement, index, all) =>
        !isSpecial(statement) ||
        all.findIndex((other) => other.id === statement.id) === index
    );
  }

  async function getStatements() {
    const stored = await chrome.storage.local.get(statementsStorageKey);
    const statements = stored[statementsStorageKey];

    const list = Array.isArray(statements) && statements.length ? statements : [...defaultStatements];
    return syncSpecialStatements(list);
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
    specialStatements,
    isSpecial,
    getStatements,
    saveStatements,
    getSelectedStatementId
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
