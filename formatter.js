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
       let output = `${lines[0]} ${lines[1]} Vehicles In Trip`;
       for (let i = 2; i < lines.length; i += 2) {
         if (i + 1 < lines.length) {
           output += `\n${lines[i]} ${lines[i+1]}`;
         } else {
           output += `\n${lines[i]}`;
         }
       }
       return output;
    }
    return lines.join("\n");
  }

  global.WhatsAppTripFormatter = { formatTripText, formatLiveTrip };
})(typeof globalThis !== "undefined" ? globalThis : window);
