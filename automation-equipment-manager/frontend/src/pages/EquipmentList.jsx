import { useEffect, useState } from "react";

import {
  deleteEquipment,
  downloadBlob,
  downloadEquipmentTemplate,
  exportEquipmentExcel,
  getEquipmentList,
  importEquipmentExcel,
} from "../api/client.js";
import SearchBar from "../components/SearchBar.jsx";
import EquipmentQrCode from "../components/EquipmentQrCode.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDateTime } from "../utils/datetime.js";

const statusOptions = ["", "生产中", "待用", "调试中", "维修中", "保养中", "外发中", "待验收", "停用", "报废"];

export default function EquipmentList({ onCreate, onEdit, onView }) {
  const [equipment, setEquipment] = useState([]);
  const [filters, setFilters] = useState({
    keyword: "",
    status: "",
    equipment_type: "",
    manager: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [qrEquipment, setQrEquipment] = useState(null);

  function loadEquipment() {
    setLoading(true);
    setError("");
    getEquipmentList(filters)
      .then(setEquipment)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadEquipment();
  }, []);

  async function handleDelete(id) {
    const ok = window.confirm("确定要停用这台设备吗？");
    if (!ok) {
      return;
    }

    try {
      await deleteEquipment(id);
      loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDownloadTemplate() {
    setError("");
    try {
      const blob = await downloadEquipmentTemplate();
      downloadBlob(blob, "设备台账导入模板.xlsx");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleExport() {
    setError("");
    try {
      const blob = await exportEquipmentExcel(filters);
      downloadBlob(blob, "设备台账导出.xlsx");
    } catch (err) {
      setError(err.message);
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
    try {
      const result = await importEquipmentExcel(file);
      setMessage(`导入完成：新增 ${result.created_count} 条，更新 ${result.updated_count} 条，跳过 ${result.skipped_count} 条。`);
      loadEquipment();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">设备台账</p>
          <h2>设备列表</h2>
        </div>
        <div className="action-row">
          <button className="secondary-button" onClick={handleDownloadTemplate} type="button">
            下载模板
          </button>
          <label className="file-button">
            导入Excel
            <input accept=".xlsx" onChange={handleImport} type="file" />
          </label>
          <button className="secondary-button" onClick={handleExport} type="button">
            导出Excel
          </button>
          <button className="primary-button" onClick={onCreate} type="button">
            新增设备
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="filter-grid">
          <SearchBar
            value={filters.keyword}
            onChange={(value) => setFilters((current) => ({ ...current, keyword: value }))}
            placeholder="搜索编号、名称、类型、位置、负责人"
          />
          <select
            className="form-control"
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
          >
            {statusOptions.map((status) => (
              <option key={status || "all"} value={status}>
                {status || "全部状态"}
              </option>
            ))}
          </select>
          <input
            className="form-control"
            value={filters.equipment_type}
            onChange={(event) => setFilters((current) => ({ ...current, equipment_type: event.target.value }))}
            placeholder="设备类型"
          />
          <input
            className="form-control"
            value={filters.manager}
            onChange={(event) => setFilters((current) => ({ ...current, manager: event.target.value }))}
            placeholder="负责人"
          />
          <button className="secondary-button" onClick={loadEquipment} type="button">
            查询
          </button>
        </div>
      </section>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success-alert">{message}</div>}
      {qrEquipment && (
        <div className="modal-backdrop" role="presentation" onClick={() => setQrEquipment(null)}>
          <div className="modal-panel qr-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>设备二维码</h3>
              <button className="text-button" onClick={() => setQrEquipment(null)} type="button">
                关闭
              </button>
            </div>
            <EquipmentQrCode equipment={qrEquipment} />
          </div>
        </div>
      )}

      <section className="panel table-panel">
        {loading ? (
          <div className="empty-state">正在加载设备台账...</div>
        ) : equipment.length === 0 ? (
          <div className="empty-state">暂无设备，请先新增一台设备。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>设备编号</th>
                  <th>设备名称</th>
                  <th>类型</th>
                  <th>状态</th>
                  <th>位置</th>
                  <th>当前货号</th>
                  <th>负责人</th>
                  <th>更新时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id}>
                    <td>{item.equipment_code}</td>
                    <td>{item.equipment_name}</td>
                    <td>{item.equipment_type}</td>
                    <td>
                      <StatusBadge>{item.current_status}</StatusBadge>
                    </td>
                    <td>{item.current_location || "-"}</td>
                    <td>{item.current_product_code || "-"}</td>
                    <td>{item.manager || "-"}</td>
                    <td>{formatDateTime(item.updated_at)}</td>
                    <td>
                      <div className="action-row">
                        <button className="text-button" onClick={() => onView(item.id)} type="button">
                          详情
                        </button>
                        <button className="text-button" onClick={() => setQrEquipment(item)} type="button">
                          二维码
                        </button>
                        <button className="text-button" onClick={() => onEdit(item.id)} type="button">
                          编辑
                        </button>
                        <button className="text-button danger" onClick={() => handleDelete(item.id)} type="button">
                          停用
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
