function pad(value) {
  return String(value).padStart(2, "0");
}

export function toDateInput(value = new Date()) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }
  return String(value).slice(0, 10);
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const text = String(value);
  const [datePart, rawTimePart = ""] = text.split("T");
  const timePart = rawTimePart.split(/[.+Z]/)[0];
  if (!datePart || !timePart) {
    return text;
  }

  return `${datePart} ${timePart.slice(0, 8)}`;
}
