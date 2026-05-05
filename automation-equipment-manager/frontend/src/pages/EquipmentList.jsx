import { useEffect, useState } from "react";

import {
  deleteEquipment,
  downloadBlob,
  downloadEquipmentTemplate,
  exportEquipmentExcel,
  getEquipmentList,
  importEquipmentLedgerExcel,
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
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

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

  async function handleImportSubmit() {
    if (!importFile) {
      setError("请先选择 .xlsx 文件");
      return;
    }

    setError("");
    setMessage("");
    setImportResult(null);
    setImporting(true);
    try {
      const result = await importEquipmentLedgerExcel(importFile);
      setImportResult(result);
      setMessage(
        `导入完成：新增 ${result.created_count} 条，生产记录 ${result.production_created_count ?? 0} 条，外发记录 ${result.outsource_created_count ?? 0} 条，维修记录 ${result.repair_created_count ?? 0} 条，重复跳过 ${result.duplicate_skipped_count ?? 0} 条，失败 ${result.failed_count} 条。`
      );
      loadEquipment();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
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
          <button className="secondary-button" onClick={() => setImportModalOpen(true)} type="button">
            Excel导入
          </button>
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
      {importModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setImportModalOpen(false)}>
          <div className="modal-panel import-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="panel-kicker">Excel Import</p>
                <h3>设备台账批量导入</h3>
              </div>
              <button className="text-button" onClick={() => setImportModalOpen(false)} type="button">
                关闭
              </button>
            </div>

            <div className="import-modal-grid">
              <section className="import-upload-card">
                <p className="import-section-title">选择文件</p>
                <label className="file-button import-file-button">
                  {importFile ? importFile.name : "选择 .xlsx 文件"}
                  <input
                    accept=".xlsx"
                    onChange={(event) => {
                      setImportFile(event.target.files?.[0] ?? null);
                      setImportResult(null);
                    }}
                    type="file"
                  />
                </label>
                <button className="primary-button" disabled={importing || !importFile} onClick={handleImportSubmit} type="button">
                  {importing ? "导入中..." : "上传并导入"}
                </button>
                <p className="muted-text">第一行为表头，系统从第二行开始读取数据。登记编号和名称不能为空。</p>
              </section>

              <section className="import-help-card">
                <p className="import-section-title">字段映射说明</p>
                <div className="mapping-list">
                  <span>登记编号 → 设备编号</span>
                  <span>名称 → 设备名称</span>
                  <span>二级类别 → 设备类型</span>
                  <span>品牌厂家 → 品牌 / 供应商</span>
                  <span>责任人 → 负责人</span>
                  <span>使用状态 → 当前状态</span>
                  <span>目前所在位置 → 当前位置</span>
                  <span>货号 → 当前生产货号</span>
                </div>
                <p className="muted-text">状态会自动转换：正常使用=生产中，备用=待用，维修=维修中，未知状态=待用。</p>
              </section>
            </div>

            {importResult && (
              <section className="import-result">
                <p className="import-section-title">导入结果</p>
                <div className="import-stats-grid">
                  <article><span>总行数</span><strong>{importResult.total_count}</strong></article>
                  <article><span>新增</span><strong>{importResult.created_count}</strong></article>
                  <article><span>生产记录</span><strong>{importResult.production_created_count ?? 0}</strong></article>
                  <article><span>外发记录</span><strong>{importResult.outsource_created_count ?? 0}</strong></article>
                  <article><span>维修记录</span><strong>{importResult.repair_created_count ?? 0}</strong></article>
                  <article><span>重复跳过</span><strong>{importResult.duplicate_skipped_count ?? 0}</strong></article>
                  <article><span>空行跳过</span><strong>{importResult.skipped_count - (importResult.duplicate_skipped_count ?? 0)}</strong></article>
                  <article><span>失败</span><strong>{importResult.failed_count}</strong></article>
                </div>

                {importResult.failures?.length > 0 ? (
                  <div className="import-failures">
                    <p>失败明细</p>
                    <ul>
                      {importResult.failures.map((failure, index) => (
                        <li key={`${failure.row_number}-${index}`}>
                          第 {failure.row_number} 行：{failure.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="success-alert">全部数据导入成功。</div>
                )}
              </section>
            )}
          </div>
        </div>
      )}
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

      <section className="panel table-panel equipment-table-panel">
        {loading ? (
          <div className="empty-state">正在加载设备台账...</div>
        ) : equipment.length === 0 ? (
          <div className="empty-state">暂无设备，请先新增一台设备。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table equipment-table">
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
                    <td className="code-cell">{item.equipment_code}</td>
                    <td className="name-cell">{item.equipment_name}</td>
                    <td className="type-cell">{item.equipment_type}</td>
                    <td className="status-cell">
                      <StatusBadge>{item.current_status}</StatusBadge>
                    </td>
                    <td className="location-cell" title={item.current_location || "-"}>
                      {item.current_location || "-"}
                    </td>
                    <td className="product-cell" title={item.current_product_code || "-"}>
                      {item.current_product_code || "-"}
                    </td>
                    <td className="manager-cell">{item.manager || "-"}</td>
                    <td className="time-cell">{formatDateTime(item.updated_at)}</td>
                    <td className="action-cell">
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
