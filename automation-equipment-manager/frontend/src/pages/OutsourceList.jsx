import { useEffect, useMemo, useState } from "react";

import {
  downloadBlob,
  downloadOutsourceTemplate,
  exportOutsourceExcel,
  getOutsourceList,
  importOutsourceExcel,
  returnOutsourceLog,
} from "../api/client.js";
import Pagination, { getTotalPages, paginateItems } from "../components/Pagination.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate, toDateInput } from "../utils/datetime.js";

export default function OutsourceList() {
  const [logs, setLogs] = useState([]);
  const [returnForms, setReturnForms] = useState({});
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pagedLogs = useMemo(() => paginateItems(logs, page, pageSize), [logs, page, pageSize]);

  function loadLogs() {
    setLoading(true);
    setError("");
    getOutsourceList()
      .then((data) => {
        setLogs(data);
        setPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadLogs();
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, getTotalPages(logs.length, pageSize)));
  }, [logs.length, pageSize]);

  function updateReturnForm(id, field, value) {
    setReturnForms((current) => ({
      ...current,
      [id]: {
        actual_return_date: toDateInput(),
        new_status: "待用",
        operator: "",
        remark: "",
        ...(current[id] ?? {}),
        [field]: value,
      },
    }));
  }

  async function handleReturn(log) {
    const form = returnForms[log.id] ?? {
      actual_return_date: toDateInput(),
      new_status: "待用",
      operator: "",
      remark: "",
    };

    setError("");
    setMessage("");
    setActionLoading(`return-${log.id}`);
    try {
      await returnOutsourceLog(log.id, {
        actual_return_date: form.actual_return_date,
        new_status: form.new_status,
        operator: form.operator || null,
        remark: form.remark || null,
      });
      setMessage(`${log.equipment_code} 已登记返回。`);
      loadLogs();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading("");
    }
  }

  async function handleDownloadTemplate() {
    setError("");
    setActionLoading("template");
    try {
      const blob = await downloadOutsourceTemplate();
      downloadBlob(blob, "外发记录导入模板.xlsx");
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
      const blob = await exportOutsourceExcel();
      downloadBlob(blob, "外发记录导出.xlsx");
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
      const result = await importOutsourceExcel(file);
      setMessage(`导入完成：新增 ${result.created_count} 条，登记返回 ${result.returned_count} 条，跳过 ${result.skipped_count} 条。`);
      loadLogs();
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
          <p className="eyebrow">外发管理</p>
          <h2>外发记录</h2>
        </div>
        <div className="action-row">
          <button className="secondary-button" disabled={Boolean(actionLoading) || loading} onClick={handleDownloadTemplate} type="button">
            {actionLoading === "template" ? "下载中..." : "下载模板"}
          </button>
          <label className={`file-button ${actionLoading || loading ? "disabled" : ""}`}>
            {actionLoading === "import" ? "导入中..." : "导入Excel"}
            <input accept=".xlsx" disabled={Boolean(actionLoading) || loading} onChange={handleImport} type="file" />
          </label>
          <button className="secondary-button" disabled={Boolean(actionLoading) || loading} onClick={handleExport} type="button">
            {actionLoading === "export" ? "导出中..." : "导出Excel"}
          </button>
          <button className="secondary-button" disabled={loading} onClick={loadLogs} type="button">
            {loading ? "刷新中..." : "刷新"}
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success-alert">{message}</div>}

      <section className="panel table-panel">
        {loading ? (
          <div className="empty-state loading-state">正在加载外发记录...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">暂无外发记录，可在设备详情页登记外发。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table outsource-table">
              <thead>
                <tr>
                  <th>设备编号</th>
                  <th>设备名称</th>
                  <th>外发单位</th>
                  <th>外发原因</th>
                  <th>外发日期</th>
                  <th>预计返回</th>
                  <th>实际返回</th>
                  <th>状态</th>
                  <th>是否超期</th>
                  <th>登记返回</th>
                </tr>
              </thead>
              <tbody>
                {pagedLogs.map((log) => {
                  const form = returnForms[log.id] ?? {
                    actual_return_date: toDateInput(),
                    new_status: "待用",
                    operator: "",
                    remark: "",
                  };
                  return (
                    <tr key={log.id}>
                      <td>{log.equipment_code}</td>
                      <td>{log.equipment_name}</td>
                      <td>{log.outsource_company}</td>
                      <td>{log.outsource_reason || "-"}</td>
                      <td>{formatDate(log.outsource_date)}</td>
                      <td>{formatDate(log.expected_return_date)}</td>
                      <td>{formatDate(log.actual_return_date)}</td>
                      <td>
                        <StatusBadge tone={log.status === "外发中" ? "warning" : "success"}>{log.status}</StatusBadge>
                      </td>
                      <td>
                        {log.is_overdue ? <StatusBadge tone="danger">已超期</StatusBadge> : <span className="muted-text">否</span>}
                      </td>
                      <td>
                        {log.actual_return_date ? (
                          <span className="muted-text">已返回</span>
                        ) : (
                          <div className="inline-return-form">
                            <input
                              className="form-control"
                              type="date"
                              value={form.actual_return_date}
                              onChange={(event) => updateReturnForm(log.id, "actual_return_date", event.target.value)}
                            />
                            <select
                              className="form-control"
                              value={form.new_status}
                              onChange={(event) => updateReturnForm(log.id, "new_status", event.target.value)}
                            >
                              <option value="待用">待用</option>
                              <option value="调试中">调试中</option>
                              <option value="生产中">生产中</option>
                            </select>
                            <button className="primary-button" disabled={actionLoading === `return-${log.id}`} onClick={() => handleReturn(log)} type="button">
                              {actionLoading === `return-${log.id}` ? "登记中..." : "返回"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
