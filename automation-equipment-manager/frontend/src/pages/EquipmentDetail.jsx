import { useEffect, useMemo, useState } from "react";

import {
  createOutsourceLog,
  createProductionLog,
  deleteEquipmentImage,
  getEquipment,
  getAssetUrl,
  getEquipmentImages,
  getEquipmentLocationLogs,
  getEquipmentMaintenanceLogs,
  getEquipmentOutsourceLogs,
  getEquipmentProductionLogs,
  getEquipmentRepairLogs,
  getEquipmentStatusLogs,
  uploadEquipmentImage,
  updateEquipmentLocation,
  updateEquipmentStatus,
} from "../api/client.js";
import EquipmentQrCode from "../components/EquipmentQrCode.jsx";
import Pagination, { getTotalPages, paginateItems } from "../components/Pagination.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { formatDate, formatDateTime, toDateInput } from "../utils/datetime.js";

const statusOptions = ["生产中", "待用", "调试中", "维修中", "保养中", "外发中", "待验收", "停用", "报废"];

function valueOrDash(value) {
  return value || "-";
}

export default function EquipmentDetail({ equipmentId, onBack, onEdit }) {
  const [equipment, setEquipment] = useState(null);
  const [statusLogs, setStatusLogs] = useState([]);
  const [locationLogs, setLocationLogs] = useState([]);
  const [outsourceLogs, setOutsourceLogs] = useState([]);
  const [productionLogs, setProductionLogs] = useState([]);
  const [repairLogs, setRepairLogs] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [images, setImages] = useState([]);
  const [statusForm, setStatusForm] = useState({
    new_status: "待用",
    change_reason: "",
    operator: "",
    remark: "",
  });
  const [locationForm, setLocationForm] = useState({
    new_location: "",
    is_outsource: false,
    outsource_company: "",
    contact_person: "",
    contact_phone: "",
    move_reason: "",
    operator: "",
    remark: "",
  });
  const today = toDateInput();
  const [outsourceForm, setOutsourceForm] = useState({
    outsource_company: "",
    contact_person: "",
    contact_phone: "",
    outsource_reason: "",
    outsource_date: today,
    expected_return_date: today,
    operator: "",
    remark: "",
  });
  const [productionForm, setProductionForm] = useState({
    product_code: "",
    product_name: "",
    department: "",
    start_time: "",
    end_time: "",
    operator: "",
    output_qty: "",
    production_status: "生产中",
    remark: "",
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productionPage, setProductionPage] = useState(1);
  const [productionPageSize, setProductionPageSize] = useState(10);
  const pagedProductionLogs = useMemo(
    () => paginateItems(productionLogs, productionPage, productionPageSize),
    [productionLogs, productionPage, productionPageSize],
  );

  function loadDetail() {
    if (!equipmentId) {
      return;
    }

    setError("");
    Promise.all([
      getEquipment(equipmentId),
      getEquipmentStatusLogs(equipmentId),
      getEquipmentLocationLogs(equipmentId),
      getEquipmentOutsourceLogs(equipmentId),
      getEquipmentProductionLogs(equipmentId),
      getEquipmentRepairLogs(equipmentId),
      getEquipmentMaintenanceLogs(equipmentId),
      getEquipmentImages(equipmentId),
    ])
      .then(([equipmentData, statusData, locationData, outsourceData, productionData, repairData, maintenanceData, imageData]) => {
        setEquipment(equipmentData);
        setStatusLogs(statusData);
        setLocationLogs(locationData);
        setOutsourceLogs(outsourceData);
        setProductionLogs(productionData);
        setProductionPage(1);
        setRepairLogs(repairData);
        setMaintenanceLogs(maintenanceData);
        setImages(imageData);
        setStatusForm((current) => ({ ...current, new_status: equipmentData.current_status }));
        setLocationForm((current) => ({
          ...current,
          new_location: equipmentData.current_location || "",
        }));
      })
      .catch((err) => setError(err.message));
  }

  useEffect(() => {
    loadDetail();
  }, [equipmentId]);

  useEffect(() => {
    setProductionPage((current) => Math.min(current, getTotalPages(productionLogs.length, productionPageSize)));
  }, [productionLogs.length, productionPageSize]);

  function normalizeForm(form) {
    const payload = {};
    Object.entries(form).forEach(([key, value]) => {
      payload[key] = value === "" ? null : value;
    });
    return payload;
  }

  async function handleStatusSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateEquipmentStatus(equipmentId, normalizeForm(statusForm));
      setMessage("状态已更新，并已保存历史记录。");
      setStatusForm((current) => ({ ...current, change_reason: "", remark: "" }));
      loadDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLocationSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateEquipmentLocation(equipmentId, normalizeForm(locationForm));
      setMessage("位置已更新，并已保存历史记录。");
      setLocationForm((current) => ({
        ...current,
        move_reason: "",
        remark: "",
      }));
      loadDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleOutsourceSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await createOutsourceLog(equipmentId, normalizeForm(outsourceForm));
      setMessage("外发已登记，设备状态已自动更新为外发中。");
      setOutsourceForm((current) => ({
        ...current,
        outsource_company: "",
        contact_person: "",
        contact_phone: "",
        outsource_reason: "",
        remark: "",
      }));
      loadDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleProductionSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = normalizeForm(productionForm);
      if (payload.output_qty !== null) {
        payload.output_qty = Number(payload.output_qty);
      }
      await createProductionLog(equipmentId, payload);
      setMessage("生产记录已保存，当前生产货号已同步更新。");
      setProductionForm((current) => ({
        ...current,
        product_code: "",
        product_name: "",
        department: "",
        end_time: "",
        output_qty: "",
        remark: "",
      }));
      loadDetail();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploadingImage(true);
    setError("");
    setMessage("");
    try {
      const image = await uploadEquipmentImage(equipmentId, file);
      setImages((current) => [image, ...current]);
      setMessage("设备图片已上传。");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleImageDelete(image) {
    const ok = window.confirm("确定要删除这张图片吗？");
    if (!ok) {
      return;
    }

    setError("");
    setMessage("");
    try {
      await deleteEquipmentImage(equipmentId, image.id);
      setImages((current) => current.filter((item) => item.id !== image.id));
      setMessage("设备图片已删除。");
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) {
    return (
      <section className="page-stack">
        <div className="alert">{error}</div>
        <button className="secondary-button" onClick={onBack} type="button">
          返回列表
        </button>
      </section>
    );
  }

  if (!equipment) {
    return <div className="empty-state">正在加载设备详情...</div>;
  }

  const fields = [
    ["设备编号", equipment.equipment_code],
    ["设备名称", equipment.equipment_name],
    ["设备类型", equipment.equipment_type],
    ["品牌", equipment.brand],
    ["供应商", equipment.supplier],
    ["购买日期", formatDate(equipment.purchase_date)],
    ["购买金额", equipment.purchase_price ? `¥${equipment.purchase_price}` : "-"],
    ["当前位置", equipment.current_location],
    ["当前生产货号", equipment.current_product_code],
    ["负责人", equipment.manager],
    ["创建时间", formatDateTime(equipment.created_at)],
    ["更新时间", formatDateTime(equipment.updated_at)],
  ];

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">设备详情</p>
          <h2>{equipment.equipment_name}</h2>
        </div>
        <div className="action-row">
          <button className="secondary-button" onClick={onBack} type="button">
            返回列表
          </button>
          <button className="primary-button" onClick={() => onEdit(equipment.id)} type="button">
            编辑设备
          </button>
        </div>
      </div>

      {message && <div className="success-alert">{message}</div>}

      <section className="panel detail-panel">
        <div className="detail-title-row">
          <h3>基本资料</h3>
          <StatusBadge>{equipment.current_status}</StatusBadge>
        </div>
        <dl className="detail-grid">
          {fields.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{valueOrDash(value)}</dd>
            </div>
          ))}
          <div className="detail-wide">
            <dt>备注</dt>
            <dd>{valueOrDash(equipment.remark)}</dd>
          </div>
        </dl>
      </section>

      <section className="panel qr-detail-panel">
        <div className="detail-title-row">
          <h3>设备二维码</h3>
        </div>
        <EquipmentQrCode equipment={equipment} size={200} />
      </section>

      <section className="panel image-panel">
        <div className="detail-title-row">
          <h3>设备图片</h3>
          <label className={`file-button ${uploadingImage ? "disabled" : ""}`}>
            {uploadingImage ? "上传中..." : "上传图片"}
            <input accept="image/jpeg,image/png,image/webp,image/gif" disabled={uploadingImage} onChange={handleImageUpload} type="file" />
          </label>
        </div>
        {images.length === 0 ? (
          <div className="empty-state">暂无设备图片。</div>
        ) : (
          <div className="image-grid">
            {images.map((image) => (
              <figure className="image-card" key={image.id}>
                <img alt={image.original_filename} src={getAssetUrl(image.url)} />
                <figcaption>
                  <span title={image.original_filename}>{image.original_filename}</span>
                  <button className="text-button danger" onClick={() => handleImageDelete(image)} type="button">
                    删除
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </section>

      <div className="two-column-grid">
        <form className="panel compact-form" onSubmit={handleStatusSubmit}>
          <div className="panel-header">
            <h3>更新状态</h3>
          </div>
          <label>
            新状态
            <select
              className="form-control"
              value={statusForm.new_status}
              onChange={(event) => setStatusForm((current) => ({ ...current, new_status: event.target.value }))}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label>
            变更原因
            <input
              className="form-control"
              value={statusForm.change_reason}
              onChange={(event) => setStatusForm((current) => ({ ...current, change_reason: event.target.value }))}
              placeholder="例如：调试完成，投入生产"
            />
          </label>
          <label>
            操作人
            <input
              className="form-control"
              value={statusForm.operator}
              onChange={(event) => setStatusForm((current) => ({ ...current, operator: event.target.value }))}
            />
          </label>
          <label>
            备注
            <textarea
              className="form-control"
              value={statusForm.remark}
              onChange={(event) => setStatusForm((current) => ({ ...current, remark: event.target.value }))}
            />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            保存状态
          </button>
        </form>

        <form className="panel compact-form" onSubmit={handleLocationSubmit}>
          <div className="panel-header">
            <h3>更新位置</h3>
          </div>
          <label>
            新位置
            <input
              className="form-control"
              value={locationForm.new_location}
              onChange={(event) => setLocationForm((current) => ({ ...current, new_location: event.target.value }))}
              placeholder="例如：瑞海装配部二线"
              required
            />
          </label>
          <label className="checkbox-row">
            <input
              checked={locationForm.is_outsource}
              onChange={(event) => setLocationForm((current) => ({ ...current, is_outsource: event.target.checked }))}
              type="checkbox"
            />
            是否外发
          </label>
          <div className="form-grid-tight">
            <label>
              外发单位
              <input
                className="form-control"
                value={locationForm.outsource_company}
                onChange={(event) => setLocationForm((current) => ({ ...current, outsource_company: event.target.value }))}
              />
            </label>
            <label>
              联系人
              <input
                className="form-control"
                value={locationForm.contact_person}
                onChange={(event) => setLocationForm((current) => ({ ...current, contact_person: event.target.value }))}
              />
            </label>
          </div>
          <label>
            联系电话
            <input
              className="form-control"
              value={locationForm.contact_phone}
              onChange={(event) => setLocationForm((current) => ({ ...current, contact_phone: event.target.value }))}
            />
          </label>
          <label>
            移动原因
            <input
              className="form-control"
              value={locationForm.move_reason}
              onChange={(event) => setLocationForm((current) => ({ ...current, move_reason: event.target.value }))}
            />
          </label>
          <label>
            操作人
            <input
              className="form-control"
              value={locationForm.operator}
              onChange={(event) => setLocationForm((current) => ({ ...current, operator: event.target.value }))}
            />
          </label>
          <label>
            备注
            <textarea
              className="form-control"
              value={locationForm.remark}
              onChange={(event) => setLocationForm((current) => ({ ...current, remark: event.target.value }))}
            />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            保存位置
          </button>
        </form>
      </div>

      <div className="two-column-grid">
        <form className="panel compact-form" onSubmit={handleOutsourceSubmit}>
          <div className="panel-header">
            <h3>登记外发</h3>
          </div>
          <label>
            外发单位
            <input
              className="form-control"
              value={outsourceForm.outsource_company}
              onChange={(event) => setOutsourceForm((current) => ({ ...current, outsource_company: event.target.value }))}
              required
            />
          </label>
          <div className="form-grid-tight">
            <label>
              联系人
              <input
                className="form-control"
                value={outsourceForm.contact_person}
                onChange={(event) => setOutsourceForm((current) => ({ ...current, contact_person: event.target.value }))}
              />
            </label>
            <label>
              联系电话
              <input
                className="form-control"
                value={outsourceForm.contact_phone}
                onChange={(event) => setOutsourceForm((current) => ({ ...current, contact_phone: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-grid-tight">
            <label>
              外发日期
              <input
                className="form-control"
                type="date"
                value={outsourceForm.outsource_date}
                onChange={(event) => setOutsourceForm((current) => ({ ...current, outsource_date: event.target.value }))}
                required
              />
            </label>
            <label>
              预计返回
              <input
                className="form-control"
                type="date"
                value={outsourceForm.expected_return_date}
                onChange={(event) => setOutsourceForm((current) => ({ ...current, expected_return_date: event.target.value }))}
                required
              />
            </label>
          </div>
          <label>
            外发原因
            <input
              className="form-control"
              value={outsourceForm.outsource_reason}
              onChange={(event) => setOutsourceForm((current) => ({ ...current, outsource_reason: event.target.value }))}
            />
          </label>
          <label>
            操作人
            <input
              className="form-control"
              value={outsourceForm.operator}
              onChange={(event) => setOutsourceForm((current) => ({ ...current, operator: event.target.value }))}
            />
          </label>
          <label>
            备注
            <textarea
              className="form-control"
              value={outsourceForm.remark}
              onChange={(event) => setOutsourceForm((current) => ({ ...current, remark: event.target.value }))}
            />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            保存外发
          </button>
        </form>

        <form className="panel compact-form" onSubmit={handleProductionSubmit}>
          <div className="panel-header">
            <h3>登记生产</h3>
          </div>
          <label>
            生产货号
            <input
              className="form-control"
              value={productionForm.product_code}
              onChange={(event) => setProductionForm((current) => ({ ...current, product_code: event.target.value }))}
              required
            />
          </label>
          <label>
            产品名称
            <input
              className="form-control"
              value={productionForm.product_name}
              onChange={(event) => setProductionForm((current) => ({ ...current, product_name: event.target.value }))}
            />
          </label>
          <div className="form-grid-tight">
            <label>
              使用部门
              <input
                className="form-control"
                value={productionForm.department}
                onChange={(event) => setProductionForm((current) => ({ ...current, department: event.target.value }))}
              />
            </label>
            <label>
              操作人员
              <input
                className="form-control"
                value={productionForm.operator}
                onChange={(event) => setProductionForm((current) => ({ ...current, operator: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-grid-tight">
            <label>
              开始时间
              <input
                className="form-control"
                type="datetime-local"
                value={productionForm.start_time}
                onChange={(event) => setProductionForm((current) => ({ ...current, start_time: event.target.value }))}
              />
            </label>
            <label>
              结束时间
              <input
                className="form-control"
                type="datetime-local"
                value={productionForm.end_time}
                onChange={(event) => setProductionForm((current) => ({ ...current, end_time: event.target.value }))}
              />
            </label>
          </div>
          <div className="form-grid-tight">
            <label>
              当前产量
              <input
                className="form-control"
                min="0"
                type="number"
                value={productionForm.output_qty}
                onChange={(event) => setProductionForm((current) => ({ ...current, output_qty: event.target.value }))}
              />
            </label>
            <label>
              生产状态
              <input
                className="form-control"
                value={productionForm.production_status}
                onChange={(event) => setProductionForm((current) => ({ ...current, production_status: event.target.value }))}
              />
            </label>
          </div>
          <label>
            备注
            <textarea
              className="form-control"
              value={productionForm.remark}
              onChange={(event) => setProductionForm((current) => ({ ...current, remark: event.target.value }))}
            />
          </label>
          <button className="primary-button" disabled={saving} type="submit">
            保存生产
          </button>
        </form>
      </div>

      <section className="panel table-panel">
        <div className="table-section-header">
          <h3>状态变更历史</h3>
        </div>
        {statusLogs.length === 0 ? (
          <div className="empty-state">暂无状态变更历史。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>原状态</th>
                  <th>新状态</th>
                  <th>原因</th>
                  <th>操作人</th>
                  <th>时间</th>
                  <th>备注</th>
                </tr>
              </thead>
              <tbody>
                {statusLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.old_status}</td>
                    <td>{log.new_status}</td>
                    <td>{valueOrDash(log.change_reason)}</td>
                    <td>{valueOrDash(log.operator)}</td>
                    <td>{formatDateTime(log.change_time)}</td>
                    <td>{valueOrDash(log.remark)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="table-section-header">
          <h3>位置变更历史</h3>
        </div>
        {locationLogs.length === 0 ? (
          <div className="empty-state">暂无位置变更历史。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>原位置</th>
                  <th>新位置</th>
                  <th>是否外发</th>
                  <th>外发单位</th>
                  <th>移动原因</th>
                  <th>操作人</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {locationLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{valueOrDash(log.old_location)}</td>
                    <td>{log.new_location}</td>
                    <td>{log.is_outsource ? "是" : "否"}</td>
                    <td>{valueOrDash(log.outsource_company)}</td>
                    <td>{valueOrDash(log.move_reason)}</td>
                    <td>{valueOrDash(log.operator)}</td>
                    <td>{formatDateTime(log.move_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="table-section-header">
          <h3>外发历史</h3>
        </div>
        {outsourceLogs.length === 0 ? (
          <div className="empty-state">暂无外发历史。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>外发单位</th>
                  <th>外发原因</th>
                  <th>外发日期</th>
                  <th>预计返回</th>
                  <th>实际返回</th>
                  <th>状态</th>
                  <th>是否超期</th>
                  <th>操作人</th>
                </tr>
              </thead>
              <tbody>
                {outsourceLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.outsource_company}</td>
                    <td>{valueOrDash(log.outsource_reason)}</td>
                    <td>{formatDate(log.outsource_date)}</td>
                    <td>{formatDate(log.expected_return_date)}</td>
                    <td>{formatDate(log.actual_return_date)}</td>
                    <td>{log.status}</td>
                    <td>{log.is_overdue ? "已超期" : "否"}</td>
                    <td>{valueOrDash(log.operator)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="table-section-header">
          <h3>生产历史</h3>
        </div>
        {productionLogs.length === 0 ? (
          <div className="empty-state">暂无生产历史。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>生产货号</th>
                  <th>产品名称</th>
                  <th>使用部门</th>
                  <th>开始时间</th>
                  <th>结束时间</th>
                  <th>操作人员</th>
                  <th>产量</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                {pagedProductionLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.product_code}</td>
                    <td>{valueOrDash(log.product_name)}</td>
                    <td>{valueOrDash(log.department)}</td>
                    <td>{formatDateTime(log.start_time)}</td>
                    <td>{formatDateTime(log.end_time)}</td>
                    <td>{valueOrDash(log.operator)}</td>
                    <td>{log.output_qty ?? "-"}</td>
                    <td>{valueOrDash(log.production_status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={productionPage}
              pageSize={productionPageSize}
              total={productionLogs.length}
              onPageChange={setProductionPage}
              onPageSizeChange={(size) => {
                setProductionPageSize(size);
                setProductionPage(1);
              }}
            />
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="table-section-header">
          <h3>维修历史</h3>
        </div>
        {repairLogs.length === 0 ? (
          <div className="empty-state">暂无维修历史。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>异常描述</th>
                  <th>等级</th>
                  <th>反馈人</th>
                  <th>处理人</th>
                  <th>状态</th>
                  <th>异常时间</th>
                  <th>停机分钟</th>
                </tr>
              </thead>
              <tbody>
                {repairLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.issue_description}</td>
                    <td>{log.issue_level}</td>
                    <td>{valueOrDash(log.reporter)}</td>
                    <td>{valueOrDash(log.handler)}</td>
                    <td>{log.repair_status}</td>
                    <td>{formatDateTime(log.issue_time)}</td>
                    <td>{log.downtime_minutes ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel table-panel">
        <div className="table-section-header">
          <h3>保养历史</h3>
        </div>
        {maintenanceLogs.length === 0 ? (
          <div className="empty-state">暂无保养历史。</div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>保养类型</th>
                  <th>保养内容</th>
                  <th>计划日期</th>
                  <th>实际日期</th>
                  <th>保养人</th>
                  <th>结果</th>
                  <th>下次保养</th>
                </tr>
              </thead>
              <tbody>
                {maintenanceLogs.map((log) => (
                  <tr key={log.id}>
                    <td>{log.maintenance_type}</td>
                    <td>{log.maintenance_content}</td>
                    <td>{formatDate(log.plan_date)}</td>
                    <td>{formatDate(log.actual_date)}</td>
                    <td>{valueOrDash(log.maintainer)}</td>
                    <td>{valueOrDash(log.result)}</td>
                    <td>{formatDate(log.next_date)}</td>
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
