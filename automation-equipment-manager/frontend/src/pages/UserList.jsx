import { useEffect, useState } from "react";

import { createUser, getUsers } from "../api/client.js";
import { formatDateTime } from "../utils/datetime.js";

const roles = ["管理员", "技术员", "生产人员", "领导"];
const emptyForm = {
  username: "",
  password: "",
  full_name: "",
  role: "领导",
  is_active: true,
};

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  function loadUsers() {
    setError("");
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      await createUser({
        username: form.username,
        password: form.password,
        full_name: form.full_name || null,
        role: form.role,
        is_active: form.is_active,
      });
      setForm(emptyForm);
      setMessage("用户已创建。");
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">用户权限</p>
          <h2>用户管理</h2>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {message && <div className="success-alert">{message}</div>}

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            用户名
            <input className="form-control" value={form.username} onChange={(event) => updateField("username", event.target.value)} required />
          </label>
          <label>
            初始密码
            <input className="form-control" minLength="6" type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} required />
          </label>
          <label>
            姓名
            <input className="form-control" value={form.full_name} onChange={(event) => updateField("full_name", event.target.value)} />
          </label>
          <label>
            角色
            <select className="form-control" value={form.role} onChange={(event) => updateField("role", event.target.value)}>
              {roles.map((role) => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-button" type="submit">创建用户</button>
        </div>
      </form>

      <section className="panel table-panel">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>姓名</th>
                <th>角色</th>
                <th>状态</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.full_name || "-"}</td>
                  <td>{user.role}</td>
                  <td>{user.is_active ? "启用" : "停用"}</td>
                  <td>{formatDateTime(user.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
