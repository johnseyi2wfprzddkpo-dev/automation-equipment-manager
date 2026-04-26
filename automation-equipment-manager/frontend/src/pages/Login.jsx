import { useState } from "react";

import { login } from "../api/client.js";
import logoUrl from "../assets/huadeng-logo.svg";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
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
      <form className="login-card" onSubmit={handleSubmit}>
        <img src={logoUrl} alt="华登集团" />
        <div>
          <h1>华登集团自动化设备管理系统</h1>
          <p>请使用账号登录</p>
        </div>

        {error && <div className="alert">{error}</div>}

        <label>
          用户名
          <input className="form-control" value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label>
          密码
          <input
            className="form-control"
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
