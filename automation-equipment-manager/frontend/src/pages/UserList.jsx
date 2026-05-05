import { useEffect, useMemo, useState } from "react";

import { clearEquipmentData, createUser, deleteUser, getUsers, updateUser } from "../api/client.js";
import Pagination, { getTotalPages, paginateItems } from "../components/Pagination.jsx";
import { formatDateTime } from "../utils/datetime.js";

const roles = ["管理员", "技术员", "生产人员", "领导"];
const emptyForm = {
  username: "",
  password: "",
  full_name: "",
  role: "领导",
  is_active: true,
};
const emptyEditForm = {
  full_name: "",
  role: "领导",
  is_active: true,
};
const CLEAR_CONFIRM_TEXT = "我确认清空所有设备数据";

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState("");
  const [clearing, setClearing] = useState(false);
  const [clearResult, setClearResult] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const pagedUsers = useMemo(() => paginateItems(users, page, pageSize), [users, page, pageSize]);
  const editingUser = useMemo(
    () => users.find((user) => user.id === editingUserId),
    [users, editingUserId],
  );

  function loadUsers() {
    setError("");
    getUsers()
      .then((data) => {
        setUsers(data);
        setPage(1);
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    setPage((current) => Math.min(current, getTotalPages(users.length, pageSize)));
  }, [users.length, pageSize]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateEditField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function startEdit(user) {
    setError("");
    setMessage("");
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name || "",
      role: user.role,
      is_active: user.is_active,
    });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setEditForm(emptyEditForm);
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

  async function handleUpdateUser(event) {
    event.preventDefault();
    if (!editingUserId) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await updateUser(editingUserId, {
        full_name: editForm.full_name || null,
        role: editForm.role,
        is_active: editForm.is_active,
      });
      setMessage("用户信息已更新。");
      cancelEdit();
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleToggleUser(user) {
    const actionText = user.is_active ? "禁用" : "启用";
    if (!window.confirm(`确认${actionText}用户「${user.username}」？`)) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await updateUser(user.id, {
        full_name: user.full_name || null,
        role: user.role,
        is_active: !user.is_active,
      });
      setMessage(`用户已${actionText}。`);
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`确认删除用户「${user.username}」？该操作不能在系统内撤销。`)) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await deleteUser(user.id);
      setMessage("用户已删除。");
      if (editingUserId === user.id) {
        cancelEdit();
      }
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleClearEquipmentData() {
    if (clearConfirmText !== CLEAR_CONFIRM_TEXT) {
      setError("确认文字不正确，未执行清空操作。");
      return;
    }

    setError("");
    setMessage("");
    setClearing(true);
    try {
      const result = await clearEquipmentData();
      setClearResult(result);
      setMessage("设备数据已清空，首页统计将在刷新后归零。");
      setClearModalOpen(false);
      setClearConfirmText("");
    } catch (err) {
      setError(err.message);
    } finally {
      setClearing(false);
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
      {clearResult && (
        <div className="success-alert">
          清空完成：设备台账 {clearResult.deleted_counts?.equipment ?? 0} 条，状态记录 {clearResult.deleted_counts?.equipment_status_log ?? 0} 条，
          位置记录 {clearResult.deleted_counts?.equipment_location_log ?? 0} 条，生产记录 {clearResult.deleted_counts?.equipment_production_log ?? 0} 条，
          维修记录 {clearResult.deleted_counts?.equipment_repair_log ?? 0} 条，保养记录 {clearResult.deleted_counts?.equipment_maintenance_log ?? 0} 条，
          外发记录 {clearResult.deleted_counts?.equipment_outsource_log ?? 0} 条。
        </div>
      )}

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

      {editingUser && (
        <form className="panel form-panel user-edit-panel" onSubmit={handleUpdateUser}>
          <div className="panel-header">
            <p className="panel-kicker">User Edit</p>
            <h3>编辑用户：{editingUser.username}</h3>
          </div>
          <div className="form-grid">
            <label>
              用户名
              <input className="form-control" value={editingUser.username} disabled />
            </label>
            <label>
              姓名
              <input className="form-control" value={editForm.full_name} onChange={(event) => updateEditField("full_name", event.target.value)} />
            </label>
            <label>
              角色权限
              <select className="form-control" value={editForm.role} onChange={(event) => updateEditField("role", event.target.value)}>
                {roles.map((role) => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </label>
            <label>
              状态
              <select className="form-control" value={editForm.is_active ? "active" : "inactive"} onChange={(event) => updateEditField("is_active", event.target.value === "active")}>
                <option value="active">启用</option>
                <option value="inactive">禁用</option>
              </select>
            </label>
          </div>
          <div className="form-actions">
            <button className="secondary-button" onClick={cancelEdit} type="button">取消</button>
            <button className="primary-button" type="submit">保存修改</button>
          </div>
        </form>
      )}

      <section className="panel danger-zone-panel">
        <div>
          <p className="panel-kicker">System Settings</p>
          <h3>系统设置</h3>
          <p className="muted-text">
            仅系统管理员可执行。清空后会删除设备台账、状态、位置、外发、生产、维修、保养记录，不会删除用户账号。
          </p>
        </div>
        <button className="danger-button" onClick={() => setClearModalOpen(true)} type="button">
          清空设备数据
        </button>
      </section>

      {clearModalOpen && (
        <div className="modal-backdrop" role="presentation" onClick={() => setClearModalOpen(false)}>
          <div className="modal-panel clear-data-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="panel-kicker">Danger Operation</p>
                <h3>清空设备数据</h3>
              </div>
              <button className="text-button" onClick={() => setClearModalOpen(false)} type="button">
                关闭
              </button>
            </div>
            <div className="alert">
              该操作会清空所有设备相关数据，且不可在系统内撤销。用户账号不会被删除。
            </div>
            <label className="clear-confirm-field">
              请输入确认文字：{CLEAR_CONFIRM_TEXT}
              <input
                className="form-control"
                value={clearConfirmText}
                onChange={(event) => setClearConfirmText(event.target.value)}
                placeholder={CLEAR_CONFIRM_TEXT}
              />
            </label>
            <div className="form-actions">
              <button className="secondary-button" onClick={() => setClearModalOpen(false)} type="button">
                取消
              </button>
              <button
                className="danger-button"
                disabled={clearing || clearConfirmText !== CLEAR_CONFIRM_TEXT}
                onClick={handleClearEquipmentData}
                type="button"
              >
                {clearing ? "正在清空..." : "确认清空"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="panel table-panel">
        <div className="table-wrap">
          <table className="data-table user-table">
            <thead>
              <tr>
                <th>用户名</th>
                <th>姓名</th>
                <th>角色</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>{user.full_name || "-"}</td>
                  <td>{user.role}</td>
                  <td>{user.is_active ? "启用" : "停用"}</td>
                  <td>{formatDateTime(user.created_at)}</td>
                  <td>
                    <div className="action-row user-action-row">
                      <button className="text-button" onClick={() => startEdit(user)} type="button">编辑</button>
                      <button className="text-button" onClick={() => startEdit(user)} type="button">修改权限</button>
                      <button className="text-button" onClick={() => handleToggleUser(user)} type="button">
                        {user.is_active ? "禁用" : "启用"}
                      </button>
                      <button className="text-button danger" onClick={() => handleDeleteUser(user)} type="button">删除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={page}
            pageSize={pageSize}
            total={users.length}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </div>
      </section>
    </section>
  );
}
