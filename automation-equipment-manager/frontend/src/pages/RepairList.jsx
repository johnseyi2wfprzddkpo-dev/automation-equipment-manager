import { useEffect, useMemo, useState } from "react";

import {
  createRepairLog,
  deleteRepairLog,
  downloadBlob,
  downloadRepairTemplate,
  exportRepairExcel,
  getEquipmentList,
  getRepairList,
  importRepairExcel,
  updateRepairLog,
} from "../api/client.js";
import Pagination, { getTotalPages, paginateItems } from "../components/Pagination.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDateTime } from "../utils/datetime.js";

const issueLevels = ["轻微", "一般", "严重", "重大"];
const repairStatuses = ["待处理", "处理中", "已解决", "需外发"];

const emptyForm = {
  equipment_id: "",
  issue_time: "",
  issue_description: "",
  issue_level: "一般",
  reporter: "",
  handler: "",
  repair_status: "待处理",
  repair_method: "",
  finish_time: "",
  downtime_minutes: "",
  remark: "",
};

function normalizeRepair(form) {
  return {
    issue_time: form.issue_time || null,
    issue_description: form.issue_description,
    issue_level: form.issue_level,
    reporter: form.reporter || null,
    handler: form.handler || null,
    repair_status: form.repair_status,
    repair_method: form.repair_method || null,
    finish_time: form.finish_time || null,
    downtime_minutes: form.downtime_minutes === "" ? null : Number(form.downtime_minutes),
    remark: form.remark || null,
  };
}

export default function RepairList() {
  const [logs, setLogs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pagedLogs = useMemo(() => paginateItems(logs, page, pageSize), [logs, page, pageSize]);

  function loadData() {
    setLoading(true);
    setError("");
    Promise.all([getRepairList(), getEquipmentList()])
      .then(([repairData, equipmentData]) => {
        setLogs(repairData);
        setPage(1);
        setEquipment(equipmentData);
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
    setPage((current) => Math.min(current, getTotalPages(logs.length, pageSize)));
  }, [logs.length, pageSize]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(log) {
    setEditingId(log.id);
    setForm({
      equipment_id: String(log.equipment_id),
      issue_time: log.issue_time ? log.issue_time.slice(0, 16) : "",
      issue_description: log.issue_description,
      issue_level: log.issue_level,
      reporter: log.reporter || "",
      handler: log.handler || "",
      repair_status: log.repair_status,
      repair_method: log.repair_method || "",
      finish_time: log.finish_time ? log.finish_time.slice(0, 16) : "",
      downtime_minutes: log.downtime_minutes ?? "",
      remark: log.remark || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    setSaving(true);
    try {
      const payload = normalizeRepair(form);
      if (editingId) {
        await updateRepairLog(editingId, payload);
        setMessage("维修异常记录已更新。");
      } else {
        await createRepairLog(form.equipment_id, payload);
        setMessage("维修异常记录已新增。");
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
      const blob = await downloadRepairTemplate();
      downloadBlob(blob, "维修异常导入模板.xlsx");
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
      const blob = await exportRepairExcel();
      downloadBlob(blob, "维修异常导出.xlsx");
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
      const result = await importRepairExcel(file);
      setMessage(`导入完成：新增 ${result.created_count} 条，跳过 ${result.skipped_count} 条。`);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  async function handleDelete(log) {
    const ok = window.confirm(`确定要删除 ${log.equipment_code} 的这条维修异常记录吗？`);
    if (!ok) {
      return;
    }

    setError("");
    setMessage("");
    setActionLoading(`delete-${log.id}`);
    try {
      await deleteRepairLog(log.id);
      if (editingId === log.id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setMessage("维修异常记录已删除。");
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
          <p className="eyebrow">维修异常</p>
          <h2>维修异常记录</h2>
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
            异常时间
            <input className="form-control" type="datetime-local" value={form.issue_time} onChange={(event) => updateField("issue_time", event.target.value)} />
          </label>
          <label>
            异常等级
            <select className="form-control" value={form.issue_level} onChange={(event) => updateField("issue_level", event.target.value)}>
              {issueLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </label>
          <label>
            处理状态
            <select className="form-control" value={form.repair_status} onChange={(event) => updateField("repair_status", event.target.value)}>
              {repairStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            反馈人
            <input className="form-control" value={form.reporter} onChange={(event) => updateField("reporter", event.target.value)} />
          </label>
          <label>
            处理人
            <input className="form-control" value={form.handler} onChange={(event) => updateField("handler", event.target.value)} />
          </label>
          <label>
            完成时间
            <input className="form-control" type="datetime-local" value={form.finish_time} onChange={(event) => updateField("finish_time", event.target.value)} />
          </label>
          <label>
            停机分钟数
            <input className="form-control" min="0" type="number" value={form.downtime_minutes} onChange={(event) => updateField("downtime_minutes", event.target.value)} />
          </label>
          <label className="form-wide">
            异常描述
            <textarea className="form-control" value={form.issue_description} onChange={(event) => updateField("issue_description", event.target.value)} required />
          </label>
          <label className="form-wide">
            处理方法
            <textarea className="form-control" value={form.repair_method} onChange={(event) => updateField("repair_method", event.target.value)} />
          </label>
          <label className="form-wide">
            备注
            <textarea className="form-control" value={form.remark} onChange={(event) => updateField("remark", event.target.value)} />
          </label>
        </div>
        <div className="form-actions">
          {editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>取消编辑</button>}
          <button className="primary-button" disabled={saving || loading} type="submit">
            {saving ? "保存中..." : editingId ? "保存修改" : "新增维修记录"}
          </button>
        </div>
      </form>

      <section className="panel table-panel">
        {loading ? (
          <div className="empty-state loading-state">正在加载维修异常记录...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">暂无维修异常记录。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>设备编号</th>
                  <th>设备名称</th>
                  <th>异常描述</th>
                  <th>等级</th>
                  <th>反馈人</th>
                  <th>处理人</th>
                  <th>状态</th>
                  <th>异常时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.equipment_code}</td>
                    <td>{log.equipment_name}</td>
                    <td>{log.issue_description}</td>
                    <td>{log.issue_level}</td>
                    <td>{log.reporter || "-"}</td>
                    <td>{log.handler || "-"}</td>
                    <td><StatusBadge tone={log.repair_status === "已解决" ? "success" : "danger"}>{log.repair_status}</StatusBadge></td>
                    <td>{formatDateTime(log.issue_time)}</td>
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
              page={page}
              pageSize={pageSize}
              total={logs.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        )}
      </section>
    </section>
  );
}
