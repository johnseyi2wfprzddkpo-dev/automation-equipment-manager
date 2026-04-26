const DEFAULT_API_BASE_URL = import.meta.env.DEV
  ? "http://127.0.0.1:8000"
  : "https://automation-equipment-manager-api.onrender.com";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? DEFAULT_API_BASE_URL).replace(/\/$/, "");
const TOKEN_KEY = "aem_access_token";

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const isFormData = options.body instanceof FormData;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = "请求失败";
    try {
      const data = await response.json();
      message = data.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.json();
}

async function requestBlob(path, options = {}) {
  const token = getStoredToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = "请求失败";
    try {
      const data = await response.json();
      message = data.detail ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }

  return response.blob();
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  return params.toString();
}

export async function getHealth() {
  return request("/api/health");
}

export async function login(username, password) {
  const data = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setStoredToken(data.access_token);
  return data.user;
}

export function getMe() {
  return request("/api/auth/me");
}

export function getUsers() {
  return request("/api/auth/users");
}

export function createUser(payload) {
  return request("/api/auth/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEquipmentList(filters = {}) {
  const query = buildQuery(filters);
  return request(`/api/equipment${query ? `?${query}` : ""}`);
}

export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function getAssetUrl(path) {
  if (!path) {
    return "";
  }
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_BASE_URL}${path}`;
}

export function downloadEquipmentTemplate() {
  return requestBlob("/api/equipment/excel/template");
}

export function exportEquipmentExcel(filters = {}) {
  const query = buildQuery(filters);
  return requestBlob(`/api/equipment/excel/export${query ? `?${query}` : ""}`);
}

export function importEquipmentExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/equipment/excel/import", {
    method: "POST",
    body: formData,
  });
}

export function getEquipment(id) {
  return request(`/api/equipment/${id}`);
}

export function getEquipmentImages(id) {
  return request(`/api/equipment/${id}/images`);
}

export function uploadEquipmentImage(id, file) {
  const formData = new FormData();
  formData.append("file", file);
  return request(`/api/equipment/${id}/images`, {
    method: "POST",
    body: formData,
  });
}

export function deleteEquipmentImage(equipmentId, imageId) {
  return request(`/api/equipment/${equipmentId}/images/${imageId}`, {
    method: "DELETE",
  });
}

export function createEquipment(payload) {
  return request("/api/equipment", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEquipment(id, payload) {
  return request(`/api/equipment/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteEquipment(id) {
  return request(`/api/equipment/${id}`, {
    method: "DELETE",
  });
}

export function updateEquipmentStatus(id, payload) {
  return request(`/api/equipment/${id}/status`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEquipmentStatusLogs(id) {
  return request(`/api/equipment/${id}/status-logs`);
}

export function updateEquipmentLocation(id, payload) {
  return request(`/api/equipment/${id}/location`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getEquipmentLocationLogs(id) {
  return request(`/api/equipment/${id}/location-logs`);
}

export function getOutsourceList() {
  return request("/api/outsource");
}

export function downloadOutsourceTemplate() {
  return requestBlob("/api/outsource/excel/template");
}

export function exportOutsourceExcel() {
  return requestBlob("/api/outsource/excel/export");
}

export function importOutsourceExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/outsource/excel/import", {
    method: "POST",
    body: formData,
  });
}

export function createOutsourceLog(id, payload) {
  return request(`/api/equipment/${id}/outsource`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function returnOutsourceLog(id, payload) {
  return request(`/api/outsource/${id}/return`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getEquipmentOutsourceLogs(id) {
  return request(`/api/equipment/${id}/outsource-logs`);
}

export function getProductionList() {
  return request("/api/production");
}

export function downloadProductionTemplate() {
  return requestBlob("/api/production/excel/template");
}

export function exportProductionExcel() {
  return requestBlob("/api/production/excel/export");
}

export function importProductionExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/production/excel/import", {
    method: "POST",
    body: formData,
  });
}

export function createProductionLog(id, payload) {
  return request(`/api/equipment/${id}/production`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProductionLog(id, payload) {
  return request(`/api/production/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getEquipmentProductionLogs(id) {
  return request(`/api/equipment/${id}/production-logs`);
}

export function getRepairList() {
  return request("/api/repair");
}

export function downloadRepairTemplate() {
  return requestBlob("/api/repair/excel/template");
}

export function exportRepairExcel() {
  return requestBlob("/api/repair/excel/export");
}

export function importRepairExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/repair/excel/import", {
    method: "POST",
    body: formData,
  });
}

export function createRepairLog(id, payload) {
  return request(`/api/equipment/${id}/repair`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateRepairLog(id, payload) {
  return request(`/api/repair/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteRepairLog(id) {
  return request(`/api/repair/${id}`, {
    method: "DELETE",
  });
}

export function getEquipmentRepairLogs(id) {
  return request(`/api/equipment/${id}/repair-logs`);
}

export function getMaintenanceList() {
  return request("/api/maintenance");
}

export function getMaintenanceReminders(days = 7) {
  return request(`/api/maintenance/reminders?days=${days}`);
}

export function downloadMaintenanceTemplate() {
  return requestBlob("/api/maintenance/excel/template");
}

export function exportMaintenanceExcel() {
  return requestBlob("/api/maintenance/excel/export");
}

export function importMaintenanceExcel(file) {
  const formData = new FormData();
  formData.append("file", file);
  return request("/api/maintenance/excel/import", {
    method: "POST",
    body: formData,
  });
}

export function createMaintenanceLog(id, payload) {
  return request(`/api/equipment/${id}/maintenance`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMaintenanceLog(id, payload) {
  return request(`/api/maintenance/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deleteMaintenanceLog(id) {
  return request(`/api/maintenance/${id}`, {
    method: "DELETE",
  });
}

export function getEquipmentMaintenanceLogs(id) {
  return request(`/api/equipment/${id}/maintenance-logs`);
}

export function getDashboardSummary() {
  return request("/api/dashboard/summary");
}

export function getDashboardUtilization(filters = {}) {
  const query = buildQuery(filters);
  return request(`/api/dashboard/utilization${query ? `?${query}` : ""}`);
}

export function normalizeEquipmentPayload(form) {
  const payload = {};
  Object.entries(form).forEach(([key, value]) => {
    payload[key] = value === "" ? null : value;
  });

  if (payload.purchase_price !== null) {
    payload.purchase_price = Number(payload.purchase_price);
  }

  return payload;
}
