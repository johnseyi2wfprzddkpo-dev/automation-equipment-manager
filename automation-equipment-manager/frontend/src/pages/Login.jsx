import { useState } from "react";

import { login } from "../api/client.js";
import logoUrl from "../assets/huadeng-logo.svg";
import DataRainCanvas from "../components/DataRainCanvas.jsx";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(username, password);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual login-data-stream" aria-hidden="true">
        <DataRainCanvas />
        <div className="login-visual-glow" />
        <div className="login-schematic">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="login-visual-copy">
          <p>Industrial Intelligence</p>
          <h2>设备全生命周期数字化管理平台</h2>
          <ul>
            <li>设备台账与状态追踪</li>
            <li>外发、维修、保养闭环管理</li>
            <li>利用率统计与运营驾驶舱</li>
          </ul>
        </div>
      </section>
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-brand">
          <img src={logoUrl} alt="华登集团" />
          <div>
            <h1>华登集团自动化设备管理系统</h1>
            <p>云端测试版</p>
          </div>
        </div>
        <div className="login-heading">
          <p>欢迎登录</p>
          <h2>智能制造管理平台</h2>
        </div>

        {error && <div className="alert">{error}</div>}

        <label>
          用户名
          <input className="form-control" disabled={loading} value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          密码
          <input
            className="form-control"
            disabled={loading}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="primary-button" disabled={loading} type="submit">
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
    </main>
  );
}
