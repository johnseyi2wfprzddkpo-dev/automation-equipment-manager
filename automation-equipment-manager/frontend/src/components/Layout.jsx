import logoUrl from "../assets/huadeng-logo.svg";

const menuItems = [
  { key: "dashboard", label: "首页看板", icon: "D" },
  { key: "equipment", label: "设备台账", icon: "E" },
  { key: "qr-scan", label: "扫码查询", icon: "Q" },
  { key: "outsource", label: "外发管理", icon: "O" },
  { key: "repair", label: "维修异常", icon: "R" },
  { key: "maintenance", label: "保养记录", icon: "M" },
  { key: "benefit", label: "效益分析", icon: "B" },
  { key: "users", label: "用户权限", icon: "U", adminOnly: true },
];

export default function Layout({ children, currentPage, onNavigate, onLogout, user }) {
  const currentItem = menuItems.find((item) => item.key === currentPage || (item.key === "equipment" && currentPage.startsWith("equipment-")));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <img src={logoUrl} alt="华登集团" />
          </span>
          <div className="brand-copy">
            <h1>
              <span>华登集团</span>
              <span>自动化设备管理系统</span>
            </h1>
            <p>云端测试版</p>
          </div>
        </div>

        <nav className="nav-list" aria-label="主菜单">
          {menuItems.filter((item) => !item.adminOnly || user.role === "管理员").map((item) => (
            <button
              className={
                currentPage === item.key || (item.key === "equipment" && currentPage.startsWith("equipment-"))
                  ? "nav-item active"
                  : "nav-item"
              }
              key={item.key}
              onClick={() => onNavigate(item.key)}
              type="button"
            >
              <span className="nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="user-panel">
          <div>
            <strong>{user.full_name || user.username}</strong>
            <span>{user.role}</span>
          </div>
          <button className="logout-button" onClick={onLogout} type="button">
            退出登录
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="topbar-kicker">Industrial Digital Platform</p>
            <h2>{currentItem?.label ?? "管理中心"}</h2>
          </div>
          <div className="topbar-meta">
            <span className="system-pill">云端测试环境</span>
            <div className="topbar-user">
              <span>{user.full_name || user.username}</span>
              <strong>{user.role}</strong>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
