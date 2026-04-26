import { useEffect, useState } from "react";

import { getDashboardSummary, getDashboardUtilization, getHealth } from "../api/client.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate, formatDateTime, toDateInput } from "../utils/datetime.js";

function getDefaultUtilizationRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start_date: toDateInput(start),
    end_date: toDateInput(end),
  };
}

export default function Dashboard() {
  const [health, setHealth] = useState("检查中");
  const [summary, setSummary] = useState(null);
  const [utilizationFilters, setUtilizationFilters] = useState(getDefaultUtilizationRange);
  const [utilization, setUtilization] = useState(null);
  const [utilizationError, setUtilizationError] = useState("");
  const [utilizationLoading, setUtilizationLoading] = useState(false);

  useEffect(() => {
    getHealth()
      .then((data) => setHealth(data.status === "ok" ? "后端正常" : "状态异常"))
      .catch(() => setHealth("后端未连接"));

    getDashboardSummary()
      .then(setSummary)
      .catch(() => setSummary(null));
  }, []);

  function loadUtilization() {
    setUtilizationLoading(true);
    setUtilizationError("");
    getDashboardUtilization(utilizationFilters)
      .then(setUtilization)
      .catch((err) => {
        setUtilization(null);
        setUtilizationError(err.message);
      })
      .finally(() => setUtilizationLoading(false));
  }

  useEffect(() => {
    loadUtilization();
  }, []);

  const statCards = [
    { label: "设备总数", value: summary?.total_equipment ?? "-", tone: "default" },
    { label: "生产中", value: summary?.production_count ?? "-", tone: "success" },
    { label: "待用", value: summary?.idle_count ?? "-", tone: "info" },
    { label: "调试中", value: summary?.debugging_count ?? "-", tone: "warning" },
    { label: "维修中", value: summary?.repair_count ?? "-", tone: "danger" },
    { label: "外发超期", value: summary?.overdue_outsource_count ?? "-", tone: "danger" },
    { label: "保养提醒", value: summary ? (summary.maintenance_overdue_count + summary.maintenance_due_count + summary.maintenance_upcoming_count) : "-", tone: "warning" },
  ];

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">首页看板</p>
          <h2>华登集团自动化设备管理系统</h2>
        </div>
        <StatusBadge tone={health === "后端正常" ? "success" : "warning"}>{health}</StatusBadge>
      </div>

      <div className="stats-grid">
        {statCards.map((card) => (
          <article className={`stat-card ${card.tone}`} key={card.label}>
            <p>{card.label}</p>
            <strong>{card.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel utilization-panel">
        <div className="utilization-header">
          <div className="panel-header">
            <h3>设备利用率</h3>
          </div>
          <div className="utilization-filters">
            <input
              className="form-control"
              type="date"
              value={utilizationFilters.start_date}
              onChange={(event) => setUtilizationFilters((current) => ({ ...current, start_date: event.target.value }))}
            />
            <input
              className="form-control"
              type="date"
              value={utilizationFilters.end_date}
              onChange={(event) => setUtilizationFilters((current) => ({ ...current, end_date: event.target.value }))}
            />
            <button className="secondary-button" onClick={loadUtilization} type="button">
              统计
            </button>
          </div>
        </div>

        {utilizationError && <div className="alert">{utilizationError}</div>}
        {utilizationLoading ? (
          <div className="empty-state">正在统计设备利用率...</div>
        ) : !utilization ? (
          <div className="empty-state">暂无利用率数据。</div>
        ) : (
          <>
            <div className="utilization-summary">
              <article>
                <p>平均利用率</p>
                <strong>{utilization.average_utilization_rate}%</strong>
              </article>
              <article>
                <p>运行小时</p>
                <strong>{utilization.total_run_hours}</strong>
              </article>
              <article>
                <p>统计设备</p>
                <strong>{utilization.total_equipment}</strong>
              </article>
            </div>

            {utilization.items.length === 0 ? (
              <div className="empty-state">当前范围内暂无设备。</div>
            ) : (
              <div className="table-wrap">
                <table className="data-table utilization-table">
                  <thead>
                    <tr>
                      <th>设备编号</th>
                      <th>设备名称</th>
                      <th>类型</th>
                      <th>状态</th>
                      <th>运行小时</th>
                      <th>生产记录</th>
                      <th>利用率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {utilization.items.map((item) => (
                      <tr key={item.equipment_id}>
                        <td>{item.equipment_code}</td>
                        <td>{item.equipment_name}</td>
                        <td>{item.equipment_type}</td>
                        <td>
                          <StatusBadge>{item.current_status}</StatusBadge>
                        </td>
                        <td>{item.run_hours}</td>
                        <td>{item.production_count}</td>
                        <td>
                          <div className="utilization-cell">
                            <div className="utilization-bar">
                              <span style={{ width: `${Math.min(item.utilization_rate, 100)}%` }} />
                            </div>
                            <strong>{item.utilization_rate}%</strong>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>保养提醒</h3>
        </div>
        {!summary || summary.maintenance_reminders.length === 0 ? (
          <div className="empty-state">未来 7 天暂无保养提醒。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table maintenance-reminder-table">
              <thead>
                <tr>
                  <th>设备编号</th>
                  <th>设备名称</th>
                  <th>保养类型</th>
                  <th>下次保养</th>
                  <th>状态</th>
                  <th>保养人</th>
                </tr>
              </thead>
              <tbody>
                {summary.maintenance_reminders.map((item) => (
                  <tr key={item.id}>
                    <td>{item.equipment_code}</td>
                    <td>{item.equipment_name}</td>
                    <td>{item.maintenance_type}</td>
                    <td>{formatDate(item.next_date)}</td>
                    <td>
                      <StatusBadge tone={item.days_until_due < 0 ? "danger" : item.days_until_due === 0 ? "warning" : "default"}>
                        {item.reminder_status}
                      </StatusBadge>
                    </td>
                    <td>{item.maintainer || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>最近状态变更</h3>
        </div>
        {!summary || summary.recent_status_logs.length === 0 ? (
          <div className="empty-state">暂无状态变更记录。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table dashboard-log-table">
              <thead>
                <tr>
                  <th>设备名称</th>
                  <th>原状态</th>
                  <th>新状态</th>
                  <th>原因</th>
                  <th>操作人</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {summary.recent_status_logs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.equipment_name || log.equipment_code || "-"}</td>
                    <td>{log.old_status}</td>
                    <td>{log.new_status}</td>
                    <td>{log.change_reason || "-"}</td>
                    <td>{log.operator || "-"}</td>
                    <td>{formatDateTime(log.change_time)}</td>
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
