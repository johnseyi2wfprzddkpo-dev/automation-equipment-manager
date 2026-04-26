export function buildEquipmentQrPayload(equipment) {
  return `AEM:EQUIPMENT:${equipment.equipment_code}`;
}

export function parseEquipmentQrPayload(value) {
  const text = String(value || "").trim();
  if (!text) {
    return "";
  }

  const marker = "AEM:EQUIPMENT:";
  if (text.startsWith(marker)) {
    return text.slice(marker.length).trim();
  }

  try {
    const url = new URL(text);
    return url.searchParams.get("equipment_code") || url.searchParams.get("code") || "";
  } catch {
    return text;
  }
}
