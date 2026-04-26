import logoUrl from "../assets/huadeng-logo.svg";

const menuItems = [
  { key: "dashboard", label: "首页看板" },
  { key: "equipment", label: "设备台账" },
  { key: "qr-scan", label: "扫码查询" },
  { key: "outsource", label: "外发管理" },
  { key: "repair", label: "维修异常" },
  { key: "maintenance", label: "保养记录" },
  { key: "users", label: "用户权限", adminOnly: true },
];

export default function Layout({ children, currentPage, onNavigate, onLogout, user }) {
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
            <p>本地轻量版</p>
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
              {item.label}
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

      <main className="main-content">{children}</main>
    </div>
  );
}
