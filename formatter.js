(function (global) {
  function pick(regex, text) {
    const match = text.match(regex);
    return match ? match[1].trim() : "";
  }

  function pickField(label, nextLabels, text) {
    const nextPattern = nextLabels.map((nextLabel) => `${nextLabel}\\s*:`).join("|");
    const regex = new RegExp(
      `(?:^|\\s)${label}\\s*:\\s*(.*?)(?=\\s+(?:${nextPattern})|$)`,
      "is"
    );
    return pick(regex, text);
  }

  function cleanLines(text) {
    return text
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function formatTripText(rawText) {
    const text = String(rawText || "").replace(/\r\n/g, "\n").trim();
    if (!text) {
      return "";
    }

    const vehicle = pick(/Vehicle\s*:-\s*(.*?)(?=Trip\s+No\.?\s*:-|$)/is, text);
    const trip = pick(/Trip\s+No\.?\s*:-\s*(.*?)(?=Route\s*:-|$)/is, text);
    const route = pick(/Route\s*:-\s*(.*?)(?=Trip\s+start\s*:-|Start\s*:|End\s*:|Duration\s*:|Address\s*:|Lat-Lng\s*:|$)/is, text);
    const start =
      pick(/^\s*Start\s*:\s*(.*?)(?=\n|$)/im, text) ||
      pick(/(?:^|\s)(?<!Trip\s)Start\s*:\s*(.*?)(?=\s+End\s*:|$)/is, text);
    const end =
      pick(/^\s*End\s*:\s*(.*?)(?=\n|$)/im, text) ||
      pickField("End", ["Duration", "Address", "Lat-Lng"], text);
    const duration =
      pick(/^\s*Duration\s*:\s*(.*?)(?=\n|$)/im, text) ||
      pickField("Duration", ["Address", "Lat-Lng"], text);
    const address =
      pick(/^\s*Address\s*:\s*(.*?)(?=\n\s*Lat-Lng\s*:|$)/ims, text) ||
      pickField("Address", ["Lat-Lng"], text);
    const latLng =
      pick(/^\s*Lat-Lng\s*:\s*(.*?)(?=\n|$)/im, text) ||
      pickField("Lat-Lng", [], text);

    const output = [];

    if (vehicle || trip) {
      output.push(`*Vehicle :- ${vehicle} Trip No.:-${trip}*`.trim());
    }
    if (route) output.push(`Route:-${route}`);
    if (start) output.push(`Start : ${start}`);
    if (end) output.push(`End : ${end}`);
    if (duration) output.push(`*Duration:${duration}*`);
    if (address) output.push(`Address :${address}`);
    if (latLng) output.push(`Lat-Lng :${latLng}`);

    if (output.length) {
      return output.join("\n");
    }

    return cleanLines(text)
      .filter((line) => !/^(input|output|_+|a|b|normal halt)$/i.test(line))
      .join("\n");
  }

  function formatLiveTrip(rawText) {
    const lines = cleanLines(rawText);
    if (lines.length === 0) return "";
    
    if (lines.length >= 2) {
       let title = lines[0];
       
       let data = [];
       let offlineCount = 0;
       let stoppedIndex = -1;

       for (let i = 2; i < lines.length; i += 2) {
         if (i + 1 < lines.length) {
           let key = lines[i];
           let val = lines[i+1];
           
           if (key.toLowerCase() === "offline") {
             offlineCount += parseInt(val, 10) || 0;
           } else {
             if (key.toLowerCase() === "stopped") {
               stoppedIndex = data.length;
             }
             data.push({ key, val });
           }
         } else {
           data.push({ key: lines[i], val: "" });
         }
       }

       if (offlineCount > 0) {
         if (stoppedIndex !== -1) {
           let currentVal = parseInt(data[stoppedIndex].val, 10) || 0;
           data[stoppedIndex].val = currentVal + offlineCount;
         } else {
           data.push({ key: "Stopped", val: offlineCount });
         }
       }

       let totalCount = 0;
       for (let item of data) {
         let k = String(item.key).toLowerCase();
         if (k === "running" || k === "stopped") {
           totalCount += parseInt(item.val, 10) || 0;
         }
       }

       let output = `*${title} ${totalCount} Vehicles In Trip*`;

       for (let item of data) {
         if (item.val !== "") {
           output += `\n${item.key} ${item.val}`;
         } else {
           output += `\n${item.key}`;
         }
       }

       return output;
    }
    return lines.join("\n");
  }

  function extractOfflineFields(rawText) {
    const text = String(rawText || "").replace(/\r\n/g, "\n").trim();
    if (!text) {
      return { vehicle: "", dateTime: "", location: "" };
    }

    const vehicle = pick(/Vehicle\s*:-\s*(.*?)(?=Trip\s+No\.?\s*:-|\n|$)/is, text);
    const dateTime =
      pick(/^\s*End\s*:\s*(.*?)(?=\n|$)/im, text) ||
      pickField("End", ["Duration", "Address", "Lat-Lng"], text);
    const location =
      pick(/^\s*Address\s*:\s*(.*?)(?=\n\s*Lat-Lng\s*:|$)/ims, text) ||
      pickField("Address", ["Lat-Lng"], text);

    return { vehicle, dateTime, location };
  }

  function buildOfflineStatement(rawText) {
    const { vehicle, dateTime, location } = extractOfflineFields(rawText);

    let head = vehicle ? `Vehicle ${vehicle} got offline` : "Vehicle got offline";
    if (dateTime) head += ` on ${dateTime}`;
    if (location) head += ` from the location ${location}`;

    return (
      `${head} and vehicle movement is not being tracked. ` +
      "It may be device issue or ignition problem. " +
      "Action: Please verify the seal/tarpaulin once it get reached on destination."
    );
  }

  function smartFormat(rawText) {
    const text = String(rawText || "").trim();
    if (!text) return "";

    // If it contains "Vehicle :-" or "Trip No :-", it's likely a Trip Selection
    if (/Vehicle\s*:-|Trip\s+No\.?\s*:-/i.test(text)) {
      return formatTripText(text);
    }

    // Otherwise, try Live Trip formatting
    // A live trip snippet usually has many lines and specific keywords
    if (text.split("\n").length >= 2) {
        const formattedLive = formatLiveTrip(text);
        // If it actually formatted something (added "Vehicles In Trip")
        if (formattedLive.includes("Vehicles In Trip")) {
            return formattedLive;
        }
    }

    // Fallback to Trip Text (which has a generic fallback)
    return formatTripText(text);
  }

  global.WhatsAppTripFormatter = {
    formatTripText,
    formatLiveTrip,
    smartFormat,
    extractOfflineFields,
    buildOfflineStatement
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
