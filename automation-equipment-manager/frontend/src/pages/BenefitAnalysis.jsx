import { useEffect, useMemo, useState } from "react";

import {
  createBenefitConfig,
  deleteBenefitConfig,
  getBenefitAnalysis,
  getBenefitConfigs,
  getEquipmentList,
  updateBenefitConfig,
} from "../api/client.js";
import Pagination, { getTotalPages, paginateItems } from "../components/Pagination.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

function getEmptyForm() {
  return {
    equipment_id: "",
    product_code: "",
    product_name: "",
    process_name: "",
    monthly_output_qty: 0,
    investment_amount: "",
    manual_minutes_per_unit: 10,
    manual_worker_count: 1,
    automation_minutes_per_unit: 3,
    automation_worker_count: 1,
    labor_cost_per_hour: 25,
    depreciation_months: 36,
    monthly_maintenance_cost: 0,
    monthly_energy_cost: 0,
    remark: "",
    is_active: true,
  };
}

function currency(value) {
  return `¥${Number(value ?? 0).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}`;
}

function number(value, suffix = "") {
  if (value === null || value === undefined) {
    return "-";
  }
  return `${Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2 })}${suffix}`;
}

function payback(value) {
  return value === null || value === undefined ? "暂不可测算" : `${number(value)} 个月`;
}

function normalizePayload(form) {
  const optionalText = (value) => {
    const trimmed = String(value ?? "").trim();
    return trimmed || null;
  };

  return {
    equipment_id: Number(form.equipment_id),
    product_code: String(form.product_code).trim(),
    product_name: optionalText(form.product_name),
    process_name: String(form.process_name).trim(),
    monthly_output_qty: Number(form.monthly_output_qty),
    investment_amount: Number(form.investment_amount || 0),
    manual_minutes_per_unit: Number(form.manual_minutes_per_unit),
    manual_worker_count: Number(form.manual_worker_count),
    automation_minutes_per_unit: Number(form.automation_minutes_per_unit),
    automation_worker_count: Number(form.automation_worker_count),
    labor_cost_per_hour: Number(form.labor_cost_per_hour),
    depreciation_months: Number(form.depreciation_months),
    monthly_maintenance_cost: Number(form.monthly_maintenance_cost),
    monthly_energy_cost: Number(form.monthly_energy_cost),
    remark: optionalText(form.remark),
    is_active: Boolean(form.is_active),
  };
}

export default function BenefitAnalysis() {
  const [analysis, setAnalysis] = useState(null);
  const [configs, setConfigs] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [form, setForm] = useState(getEmptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [configPage, setConfigPage] = useState(1);
  const [configPageSize, setConfigPageSize] = useState(10);
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(10);
  const detailItems = useMemo(() => analysis?.items ?? [], [analysis]);
  const pagedConfigs = useMemo(() => paginateItems(configs, configPage, configPageSize), [configs, configPage, configPageSize]);
  const pagedDetailItems = useMemo(() => paginateItems(detailItems, detailPage, detailPageSize), [detailItems, detailPage, detailPageSize]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function loadAnalysis() {
    return getBenefitAnalysis().then(setAnalysis);
  }

  function loadConfigs() {
    return getBenefitConfigs().then(setConfigs);
  }

  function loadInitialData() {
    setLoading(true);
    setError("");
    Promise.all([getEquipmentList(), getBenefitConfigs(), getBenefitAnalysis()])
      .then(([equipmentList, configList, analysisData]) => {
        setEquipment(equipmentList);
        setConfigs(configList);
        setAnalysis(analysisData);
        setConfigPage(1);
        setDetailPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setConfigPage((current) => Math.min(current, getTotalPages(configs.length, configPageSize)));
  }, [configs.length, configPageSize]);

  useEffect(() => {
    setDetailPage((current) => Math.min(current, getTotalPages(detailItems.length, detailPageSize)));
  }, [detailItems.length, detailPageSize]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.equipment_id || !form.product_code.trim() || !form.process_name.trim()) {
      setError("请选择设备，并填写产品货号和工序名称。");
      return;
    }

    setSaving(true);
    try {
      const payload = normalizePayload(form);
      if (editingId) {
        await updateBenefitConfig(editingId, payload);
        setMessage("效益分析记录已更新。");
      } else {
        await createBenefitConfig(payload);
        setMessage("效益分析记录已新增。");
      }
      setEditingId(null);
      setForm(getEmptyForm());
      await Promise.all([loadConfigs(), loadAnalysis()]);
      setConfigPage(1);
      setDetailPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(config) {
    setEditingId(config.id);
    setForm({
      equipment_id: config.equipment_id,
      product_code: config.product_code,
      product_name: config.product_name || "",
      process_name: config.process_name,
      monthly_output_qty: config.monthly_output_qty,
      investment_amount: config.investment_amount,
      manual_minutes_per_unit: config.manual_minutes_per_unit,
      manual_worker_count: config.manual_worker_count,
      automation_minutes_per_unit: config.automation_minutes_per_unit,
      automation_worker_count: config.automation_worker_count,
      labor_cost_per_hour: config.labor_cost_per_hour,
      depreciation_months: config.depreciation_months,
      monthly_maintenance_cost: config.monthly_maintenance_cost,
      monthly_energy_cost: config.monthly_energy_cost,
      remark: config.remark || "",
      is_active: config.is_active,
    });
  }

  async function handleDelete(config) {
    const ok = window.confirm(`确定删除 ${config.equipment_name || config.equipment_code} / ${config.product_code} / ${config.process_name} 的效益分析记录吗？`);
    if (!ok) {
      return;
    }
    setError("");
    setMessage("");
    setDeletingId(config.id);
    try {
      await deleteBenefitConfig(config.id);
      setMessage("效益分析记录已删除。");
      await Promise.all([loadConfigs(), loadAnalysis()]);
      setConfigPage(1);
      setDetailPage(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  function handleEquipmentChange(value) {
    const selected = equipment.find((item) => String(item.id) === String(value));
    setForm((current) => ({
      ...current,
      equipment_id: value,
      investment_amount: current.investment_amount || selected?.purchase_price || "",
    }));
  }

  const summaryCards = useMemo(() => {
    const summary = analysis?.summary;
    return [
      { label: "分析记录", value: number(summary?.config_count), tone: "default", note: "设备 + 产品 + 工序" },
      { label: "月产量", value: number(summary?.monthly_output_qty), tone: "info", note: "来自效益分析表" },
      { label: "月节省人工成本", value: currency(summary?.monthly_labor_saving), tone: "success", note: "按每条记录独立计算" },
      { label: "月设备使用成本", value: currency(summary?.monthly_equipment_cost), tone: "warning", note: "折旧 + 维护 + 能耗" },
      { label: "月预计净收益", value: currency(summary?.monthly_net_benefit), tone: "info", note: "人工节省 - 设备成本" },
      { label: "平均回本周期", value: payback(summary?.average_payback_months), tone: "default", note: "仅统计净收益为正的记录" },
    ];
  }, [analysis]);

  return (
    <section className="page-stack benefit-page">
      <div className="page-header benefit-hero">
        <div>
          <p className="eyebrow">Automation ROI</p>
          <h2>自动化设备效益分析</h2>
          <p className="hero-subtitle">只基于效益分析表计算。每条记录代表一台设备、一款产品和一道工序，不再对全部设备台账自动套用统一参数。</p>
        </div>
        <div className="hero-status">
          <StatusBadge tone="success">独立记录测算</StatusBadge>
          <span>{analysis ? `${analysis.summary.config_count} 条启用记录` : "等待统计"}</span>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success-alert">{message}</div>}

      <section className="panel benefit-config-panel">
        <div className="panel-header benefit-table-header">
          <div>
            <p className="panel-kicker">Benefit Record</p>
            <h3>{editingId ? "编辑效益分析记录" : "新增效益分析记录"}</h3>
          </div>
          {editingId && (
            <button className="secondary-button" onClick={() => { setEditingId(null); setForm(getEmptyForm()); }} type="button">
              取消编辑
            </button>
          )}
        </div>

        <form className="benefit-config-form" onSubmit={handleSubmit}>
          <label>
            <span>设备</span>
            <select className="form-control" value={form.equipment_id} onChange={(event) => handleEquipmentChange(event.target.value)}>
              <option value="">请选择设备</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.equipment_code} / {item.equipment_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>产品货号</span>
            <input className="form-control" value={form.product_code} onChange={(event) => updateForm("product_code", event.target.value)} />
          </label>
          <label>
            <span>产品名称</span>
            <input className="form-control" value={form.product_name} onChange={(event) => updateForm("product_name", event.target.value)} />
          </label>
          <label>
            <span>工序名称</span>
            <input className="form-control" value={form.process_name} onChange={(event) => updateForm("process_name", event.target.value)} />
          </label>
          <label>
            <span>月产量</span>
            <input className="form-control" min="0" step="1" type="number" value={form.monthly_output_qty} onChange={(event) => updateForm("monthly_output_qty", event.target.value)} />
          </label>
          <label>
            <span>设备投入金额</span>
            <input className="form-control" min="0" step="100" type="number" value={form.investment_amount} onChange={(event) => updateForm("investment_amount", event.target.value)} />
          </label>
          <label>
            <span>人工分钟/件</span>
            <input className="form-control" min="0.1" step="0.1" type="number" value={form.manual_minutes_per_unit} onChange={(event) => updateForm("manual_minutes_per_unit", event.target.value)} />
          </label>
          <label>
            <span>人工人数</span>
            <input className="form-control" min="0.1" step="0.1" type="number" value={form.manual_worker_count} onChange={(event) => updateForm("manual_worker_count", event.target.value)} />
          </label>
          <label>
            <span>自动化分钟/件</span>
            <input className="form-control" min="0.1" step="0.1" type="number" value={form.automation_minutes_per_unit} onChange={(event) => updateForm("automation_minutes_per_unit", event.target.value)} />
          </label>
          <label>
            <span>自动化看机人数</span>
            <input className="form-control" min="0.1" step="0.1" type="number" value={form.automation_worker_count} onChange={(event) => updateForm("automation_worker_count", event.target.value)} />
          </label>
          <label>
            <span>人工成本/小时</span>
            <input className="form-control" min="0" step="1" type="number" value={form.labor_cost_per_hour} onChange={(event) => updateForm("labor_cost_per_hour", event.target.value)} />
          </label>
          <label>
            <span>折旧周期（月）</span>
            <input className="form-control" min="1" step="1" type="number" value={form.depreciation_months} onChange={(event) => updateForm("depreciation_months", event.target.value)} />
          </label>
          <label>
            <span>月维护费</span>
            <input className="form-control" min="0" step="50" type="number" value={form.monthly_maintenance_cost} onChange={(event) => updateForm("monthly_maintenance_cost", event.target.value)} />
          </label>
          <label>
            <span>月能耗费</span>
            <input className="form-control" min="0" step="50" type="number" value={form.monthly_energy_cost} onChange={(event) => updateForm("monthly_energy_cost", event.target.value)} />
          </label>
          <label className="benefit-wide-field">
            <span>备注</span>
            <input className="form-control" value={form.remark} onChange={(event) => updateForm("remark", event.target.value)} />
          </label>
          <label className="checkbox-row benefit-active-toggle">
            <input checked={form.is_active} onChange={(event) => updateForm("is_active", event.target.checked)} type="checkbox" />
            <span>启用测算</span>
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            {saving ? "保存中..." : editingId ? "保存修改" : "新增记录"}
          </button>
        </form>
      </section>

      {loading ? (
        <div className="empty-state loading-state">正在生成效益分析...</div>
      ) : !analysis ? (
        <div className="empty-state">暂无效益分析数据。</div>
      ) : (
        <>
          <div className="stats-grid benefit-stats-grid">
            {summaryCards.map((card) => (
              <article className={`stat-card ${card.tone}`} key={card.label}>
                <div className="stat-topline">
                  <span>{card.label}</span>
                  <i>ROI</i>
                </div>
                <strong>{card.value}</strong>
                <p>{card.note}</p>
              </article>
            ))}
          </div>

          <div className="benefit-insight-grid">
            <section className="panel">
              <div className="panel-header">
                <p className="panel-kicker">Top Benefit</p>
                <h3>效益最高记录</h3>
              </div>
              <BenefitRankingTable items={analysis.best_items} mode="benefit" />
            </section>

            <section className="panel">
              <div className="panel-header">
                <p className="panel-kicker">Payback Risk</p>
                <h3>回本周期最长记录</h3>
              </div>
              <BenefitRankingTable items={analysis.longest_payback_items} mode="payback" />
            </section>
          </div>

          <section className="panel table-panel benefit-table-panel">
            <div className="panel-header benefit-table-header">
              <div>
                <p className="panel-kicker">Record Manage</p>
                <h3>效益分析表</h3>
              </div>
              <span className="muted-text">共 {configs.length} 条记录</span>
            </div>
            <ConfigTable configs={pagedConfigs} deletingId={deletingId} onDelete={handleDelete} onEdit={handleEdit} />
            <Pagination
              page={configPage}
              pageSize={configPageSize}
              total={configs.length}
              onPageChange={setConfigPage}
              onPageSizeChange={(size) => {
                setConfigPageSize(size);
                setConfigPage(1);
              }}
            />
          </section>

          <section className="panel table-panel benefit-table-panel">
            <div className="panel-header benefit-table-header">
              <div>
                <p className="panel-kicker">Analysis Detail</p>
                <h3>效益测算明细</h3>
              </div>
              <span className="muted-text">共 {analysis.items.length} 条启用记录</span>
            </div>
            {analysis.items.length === 0 ? (
              <div className="empty-state">请先新增并启用效益分析记录。</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table benefit-table">
                  <thead>
                    <tr>
                      <th>设备</th>
                      <th>产品/工序</th>
                      <th>月产量</th>
                      <th>节省人数</th>
                      <th>人工工时</th>
                      <th>自动化工时</th>
                      <th>节省工时</th>
                      <th>效率提升</th>
                      <th>月净收益</th>
                      <th>回本周期</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedDetailItems.map((item) => (
                      <tr key={item.config_id}>
                        <td>
                          <strong>{item.equipment_name}</strong>
                          <span>{item.equipment_code}</span>
                        </td>
                        <td>
                          <strong>{item.product_code}</strong>
                          <span>{item.process_name}</span>
                        </td>
                        <td>{number(item.monthly_output_qty)}</td>
                        <td>{number(item.saved_worker_count)}</td>
                        <td>{number(item.manual_labor_hours)}</td>
                        <td>{number(item.automation_labor_hours)}</td>
                        <td>{number(item.time_saved_hours)}</td>
                        <td>{number(item.efficiency_improvement_rate, "%")}</td>
                        <td className={item.monthly_net_benefit >= 0 ? "benefit-positive" : "benefit-negative"}>{currency(item.monthly_net_benefit)}</td>
                        <td>{payback(item.payback_months)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  page={detailPage}
                  pageSize={detailPageSize}
                  total={detailItems.length}
                  onPageChange={setDetailPage}
                  onPageSizeChange={(size) => {
                    setDetailPageSize(size);
                    setDetailPage(1);
                  }}
                />
              </div>
            )}
          </section>

          <section className="panel benefit-formula-panel">
            <div className="panel-header">
              <p className="panel-kicker">Formula</p>
              <h3>测算口径</h3>
            </div>
            <div className="formula-grid">
              <span>一条记录 = 一台设备 + 一款产品 + 一道工序</span>
              <span>人工工时 = 月产量 × 人工分钟/件 × 人工人数 ÷ 60</span>
              <span>自动化工时 = 月产量 × 自动化分钟/件 × 看机人数 ÷ 60</span>
              <span>月人工节省 = 节省工时 × 人工成本/小时</span>
              <span>月设备成本 = 投入金额 ÷ 折旧月数 + 月维护费 + 月能耗费</span>
              <span>回本周期 = 投入金额 ÷ 月净收益</span>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function ConfigTable({ configs, deletingId, onDelete, onEdit }) {
  if (configs.length === 0) {
    return <div className="empty-state">暂无效益分析记录。</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table benefit-config-table">
        <thead>
          <tr>
            <th>设备</th>
            <th>产品/工序</th>
            <th>月产量</th>
            <th>人工节拍</th>
            <th>自动化节拍</th>
            <th>人工成本</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {configs.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.equipment_name}</strong>
                <span>{item.equipment_code}</span>
              </td>
              <td>
                <strong>{item.product_code}</strong>
                <span>{item.process_name}</span>
              </td>
              <td>{number(item.monthly_output_qty)}</td>
              <td>{number(item.manual_minutes_per_unit)} 分 / {number(item.manual_worker_count)} 人</td>
              <td>{number(item.automation_minutes_per_unit)} 分 / {number(item.automation_worker_count)} 人</td>
              <td>{currency(item.labor_cost_per_hour)} / 小时</td>
              <td><StatusBadge tone={item.is_active ? "success" : "default"}>{item.is_active ? "启用" : "停用"}</StatusBadge></td>
              <td>
                <div className="action-row">
                  <button className="text-button" onClick={() => onEdit(item)} type="button">编辑</button>
                  <button className="text-button danger" disabled={deletingId === item.id} onClick={() => onDelete(item)} type="button">
                    {deletingId === item.id ? "删除中..." : "删除"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BenefitRankingTable({ items, mode }) {
  if (!items.length) {
    return <div className="empty-state">暂无可排序数据。</div>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table benefit-ranking-table">
        <thead>
          <tr>
            <th>记录</th>
            <th>{mode === "benefit" ? "月净收益" : "回本周期"}</th>
            <th>节省工时</th>
            <th>效率提升</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.config_id}>
              <td>
                <strong>{item.equipment_name}</strong>
                <span>{item.product_code} / {item.process_name}</span>
              </td>
              <td>{mode === "benefit" ? currency(item.monthly_net_benefit) : payback(item.payback_months)}</td>
              <td>{number(item.time_saved_hours, " h")}</td>
              <td>{number(item.efficiency_improvement_rate, "%")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
