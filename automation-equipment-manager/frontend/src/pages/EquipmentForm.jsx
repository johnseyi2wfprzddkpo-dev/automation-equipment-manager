import { useEffect, useState } from "react";

import { createEquipment, getEquipment, normalizeEquipmentPayload, updateEquipment } from "../api/client.js";

const statusOptions = ["生产中", "待用", "调试中", "维修中", "保养中", "外发中", "待验收", "停用", "报废"];

const emptyForm = {
  equipment_code: "",
  equipment_name: "",
  equipment_type: "",
  brand: "",
  supplier: "",
  purchase_date: "",
  purchase_price: "",
  current_status: "待用",
  current_location: "",
  current_product_code: "",
  manager: "",
  remark: "",
};

export default function EquipmentForm({ equipmentId, onCancel, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEdit = Boolean(equipmentId);

  useEffect(() => {
    if (!equipmentId) {
      setForm(emptyForm);
      return;
    }

    setLoading(true);
    getEquipment(equipmentId)
      .then((data) => {
        setForm({
          equipment_code: data.equipment_code ?? "",
          equipment_name: data.equipment_name ?? "",
          equipment_type: data.equipment_type ?? "",
          brand: data.brand ?? "",
          supplier: data.supplier ?? "",
          purchase_date: data.purchase_date ?? "",
          purchase_price: data.purchase_price ?? "",
          current_status: data.current_status ?? "待用",
          current_location: data.current_location ?? "",
          current_product_code: data.current_product_code ?? "",
          manager: data.manager ?? "",
          remark: data.remark ?? "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [equipmentId]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = normalizeEquipmentPayload(form);
      if (isEdit) {
        await updateEquipment(equipmentId, payload);
      } else {
        await createEquipment(payload);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">设备台账</p>
          <h2>{isEdit ? "编辑设备" : "新增设备"}</h2>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="panel form-panel" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>
            设备编号 *
            <input
              className="form-control"
              value={form.equipment_code}
              onChange={(event) => updateField("equipment_code", event.target.value)}
              required
            />
          </label>
          <label>
            设备名称 *
            <input
              className="form-control"
              value={form.equipment_name}
              onChange={(event) => updateField("equipment_name", event.target.value)}
              required
            />
          </label>
          <label>
            设备类型 *
            <input
              className="form-control"
              value={form.equipment_type}
              onChange={(event) => updateField("equipment_type", event.target.value)}
              required
            />
          </label>
          <label>
            当前状态 *
            <select
              className="form-control"
              value={form.current_status}
              onChange={(event) => updateField("current_status", event.target.value)}
              required
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            品牌
            <input className="form-control" value={form.brand} onChange={(event) => updateField("brand", event.target.value)} />
          </label>
          <label>
            供应商
            <input
              className="form-control"
              value={form.supplier}
              onChange={(event) => updateField("supplier", event.target.value)}
            />
          </label>
          <label>
            购买日期
            <input
              className="form-control"
              type="date"
              value={form.purchase_date}
              onChange={(event) => updateField("purchase_date", event.target.value)}
            />
          </label>
          <label>
            购买金额
            <input
              className="form-control"
              min="0"
              step="0.01"
              type="number"
              value={form.purchase_price}
              onChange={(event) => updateField("purchase_price", event.target.value)}
            />
          </label>
          <label>
            当前位置
            <input
              className="form-control"
              value={form.current_location}
              onChange={(event) => updateField("current_location", event.target.value)}
            />
          </label>
          <label>
            当前生产货号
            <input
              className="form-control"
              value={form.current_product_code}
              onChange={(event) => updateField("current_product_code", event.target.value)}
            />
          </label>
          <label>
            负责人
            <input
              className="form-control"
              value={form.manager}
              onChange={(event) => updateField("manager", event.target.value)}
            />
          </label>
          <label className="form-wide">
            备注
            <textarea className="form-control" value={form.remark} onChange={(event) => updateField("remark", event.target.value)} />
          </label>
        </div>

        <div className="form-actions">
          <button className="secondary-button" onClick={onCancel} type="button">
            取消
          </button>
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </section>
  );
}
