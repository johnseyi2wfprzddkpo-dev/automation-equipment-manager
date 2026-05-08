import { useEffect, useMemo, useState } from "react";

import {
  createMaintenanceLog,
  deleteMaintenanceLog,
  downloadBlob,
  downloadMaintenanceTemplate,
  exportMaintenanceExcel,
  getEquipmentList,
  getMaintenanceList,
  getMaintenanceReminders,
  importMaintenanceExcel,
  updateMaintenanceLog,
} from "../api/client.js";
import Pagination, { getTotalPages, paginateItems } from "../components/Pagination.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate } from "../utils/datetime.js";

const maintenanceTypes = ["日常保养", "周保养", "月保养", "年度保养", "临时保养"];

const emptyForm = {
  equipment_id: "",
  maintenance_type: "日常保养",
  maintenance_content: "",
  plan_date: "",
  actual_date: "",
  maintainer: "",
  result: "",
  next_date: "",
  remark: "",
};

function normalizeMaintenance(form) {
  return {
    maintenance_type: form.maintenance_type,
    maintenance_content: form.maintenance_content,
    plan_date: form.plan_date || null,
    actual_date: form.actual_date || null,
    maintainer: form.maintainer || null,
    result: form.result || null,
    next_date: form.next_date || null,
    remark: form.remark || null,
  };
}

export default function MaintenanceList() {
  const [logs, setLogs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [logPage, setLogPage] = useState(1);
  const [logPageSize, setLogPageSize] = useState(10);
  const [reminderPage, setReminderPage] = useState(1);
  const [reminderPageSize, setReminderPageSize] = useState(10);
  const pagedLogs = useMemo(() => paginateItems(logs, logPage, logPageSize), [logs, logPage, logPageSize]);
  const pagedReminders = useMemo(() => paginateItems(reminders, reminderPage, reminderPageSize), [reminders, reminderPage, reminderPageSize]);

  function loadData() {
    setLoading(true);
    setError("");
    Promise.all([getMaintenanceList(), getEquipmentList(), getMaintenanceReminders(7)])
      .then(([maintenanceData, equipmentData, reminderData]) => {
        setLogs(maintenanceData);
        setLogPage(1);
        setEquipment(equipmentData);
        setReminders(reminderData);
        setReminderPage(1);
        if (!form.equipment_id && equipmentData.length > 0) {
          setForm((current) => ({ ...current, equipment_id: String(equipmentData[0].id) }));
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setLogPage((current) => Math.min(current, getTotalPages(logs.length, logPageSize)));
  }, [logs.length, logPageSize]);

  useEffect(() => {
    setReminderPage((current) => Math.min(current, getTotalPages(reminders.length, reminderPageSize)));
  }, [reminders.length, reminderPageSize]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(log) {
    setEditingId(log.id);
    setForm({
      equipment_id: String(log.equipment_id),
      maintenance_type: log.maintenance_type,
      maintenance_content: log.maintenance_content,
      plan_date: log.plan_date || "",
      actual_date: log.actual_date || "",
      maintainer: log.maintainer || "",
      result: log.result || "",
      next_date: log.next_date || "",
      remark: log.remark || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    setSaving(true);
    try {
      const payload = normalizeMaintenance(form);
      if (editingId) {
        await updateMaintenanceLog(editingId, payload);
        setMessage("保养记录已更新。");
      } else {
        await createMaintenanceLog(form.equipment_id, payload);
        setMessage("保养记录已新增。");
      }
      setEditingId(null);
      setForm((current) => ({ ...emptyForm, equipment_id: current.equipment_id }));
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDownloadTemplate() {
    setError("");
    setActionLoading("template");
    try {
      const blob = await downloadMaintenanceTemplate();
      downloadBlob(blob, "保养记录导入模板.xlsx");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  async function handleExport() {
    setError("");
    setActionLoading("export");
    try {
      const blob = await exportMaintenanceExcel();
      downloadBlob(blob, "保养记录导出.xlsx");
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setError("");
    setMessage("");
    setActionLoading("import");
    try {
      const result = await importMaintenanceExcel(file);
      setMessage(`导入完成：新增 ${result.created_count} 条，跳过 ${result.skipped_count} 条。`);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  async function handleDelete(log) {
    const ok = window.confirm(`确定要删除 ${log.equipment_code} 的这条保养记录吗？`);
    if (!ok) {
      return;
    }

    setError("");
    setMessage("");
    setActionLoading(`delete-${log.id}`);
    try {
      await deleteMaintenanceLog(log.id);
      if (editingId === log.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setMessage("保养记录已删除。");
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">保养记录</p>
          <h2>设备保养记录</h2>
        </div>
        <div className="action-row">
          <button className="secondary-button" disabled={Boolean(actionLoading) || loading || saving} onClick={handleDownloadTemplate} type="button">
            {actionLoading === "template" ? "下载中..." : "下载模板"}
          </button>
          <label className={`file-button ${actionLoading || loading || saving ? "disabled" : ""}`}>
            {actionLoading === "import" ? "导入中..." : "导入Excel"}
            <input accept=".xlsx" disabled={Boolean(actionLoading) || loading || saving} onChange={handleImport} type="file" />
          </label>
          <button className="secondary-button" disabled={Boolean(actionLoading) || loading || saving} onClick={handleExport} type="button">
            {actionLoading === "export" ? "导出中..." : "导出Excel"}
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success-alert">{message}</div>}

      <section className="panel reminder-panel">
        <div className="panel-header">
          <h3>未来 7 天保养提醒</h3>
        </div>
        {loading ? (
          <div className="empty-state loading-state">正在加载保养提醒...</div>
        ) : reminders.length === 0 ? (
          <div className="empty-state">暂无到期或即将到期的保养任务。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table maintenance-reminder-table">
              <thead>
                <tr>
                  <th>设备编号</th>
                  <th>设备名称</th>
                  <th>保养类型</th>
                  <th>保养内容</th>
                  <th>上次保养</th>
                  <th>下次保养</th>
                  <th>状态</th>
                  <th>保养人</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedReminders.map((item) => (
                  <tr key={item.id}>
                    <td>{item.equipment_code}</td>
                    <td>{item.equipment_name}</td>
                    <td>{item.maintenance_type}</td>
                    <td>{item.maintenance_content}</td>
                    <td>{formatDate(item.last_actual_date)}</td>
                    <td>{formatDate(item.next_date)}</td>
                    <td>
                      <StatusBadge tone={item.days_until_due < 0 ? "danger" : item.days_until_due === 0 ? "warning" : "default"}>
                        {item.reminder_status}
                      </StatusBadge>
                    </td>
                    <td>{item.maintainer || "-"}</td>
                    <td>
                      <button className="text-button" type="button" onClick={() => {
                        setEditingId(null);
                        setForm({
                          ...emptyForm,
                          equipment_id: String(item.equipment_id),
                          maintenance_type: item.maintenance_type,
                          maintenance_content: item.maintenance_content,
                        });
                      }}>
                        登记保养
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={reminderPage}
              pageSize={reminderPageSize}
              total={reminders.length}
              onPageChange={setReminderPage}
              onPageSizeChange={(size) => {
                setReminderPageSize(size);
                setReminderPage(1);
              }}
            />
          </div>
        )}
      </section>

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            设备
            <select className="form-control" value={form.equipment_id} onChange={(event) => updateField("equipment_id", event.target.value)} required disabled={Boolean(editingId)}>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.equipment_code} {item.equipment_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            保养类型
            <select className="form-control" value={form.maintenance_type} onChange={(event) => updateField("maintenance_type", event.target.value)}>
              {maintenanceTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>
          <label>
            计划日期
            <input className="form-control" type="date" value={form.plan_date} onChange={(event) => updateField("plan_date", event.target.value)} />
          </label>
          <label>
            实际日期
            <input className="form-control" type="date" value={form.actual_date} onChange={(event) => updateField("actual_date", event.target.value)} />
          </label>
          <label>
            保养人
            <input className="form-control" value={form.maintainer} onChange={(event) => updateField("maintainer", event.target.value)} />
          </label>
          <label>
            保养结果
            <input className="form-control" value={form.result} onChange={(event) => updateField("result", event.target.value)} placeholder="正常 / 异常" />
          </label>
          <label>
            下次保养
            <input className="form-control" type="date" value={form.next_date} onChange={(event) => updateField("next_date", event.target.value)} />
          </label>
          <label className="form-wide">
            保养内容
            <textarea className="form-control" value={form.maintenance_content} onChange={(event) => updateField("maintenance_content", event.target.value)} required />
          </label>
          <label className="form-wide">
            备注
            <textarea className="form-control" value={form.remark} onChange={(event) => updateField("remark", event.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}
          <button className="primary-button" disabled={saving || loading} type="submit">
            {saving ? "保存中..." : editingId ? "保存修改" : "新增保养记录"}
          </button>
        </div>
      </form>

      <section className="panel table-panel">
        {loading ? (
          <div className="empty-state loading-state">正在加载保养记录...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">暂无保养记录。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>设备编号</th>
                  <th>设备名称</th>
                  <th>保养类型</th>
                  <th>计划日期</th>
                  <th>实际日期</th>
                  <th>保养人</th>
                  <th>结果</th>
                  <th>下次保养</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.equipment_code}</td>
                    <td>{log.equipment_name}</td>
                    <td>{log.maintenance_type}</td>
                    <td>{formatDate(log.plan_date)}</td>
                    <td>{formatDate(log.actual_date)}</td>
                    <td>{log.maintainer || "-"}</td>
                    <td>{log.result || "-"}</td>
                    <td>{formatDate(log.next_date)}</td>
                    <td>
                      <div className="action-row">
                        <button className="text-button" type="button" onClick={() => startEdit(log)}>编辑</button>
                        <button className="text-button danger" disabled={actionLoading === `delete-${log.id}`} type="button" onClick={() => handleDelete(log)}>
                          {actionLoading === `delete-${log.id}` ? "删除中..." : "删除"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={logPage}
              pageSize={logPageSize}
              total={logs.length}
              onPageChange={setLogPage}
              onPageSizeChange={(size) => {
                setLogPageSize(size);
                setLogPage(1);
              }}
            />
          </div>
        )}
      </section>
    </section>
  );
}
