import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";

import { getEquipmentList } from "../api/client.js";
import { parseEquipmentQrPayload } from "../utils/qr.js";

export default function QrScanner({ onFound }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const resolvingRef = useRef(false);
  const [manualCode, setManualCode] = useState("");
  const [status, setStatus] = useState("准备启动摄像头");
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  async function openEquipmentByCode(rawValue) {
    if (resolvingRef.current) {
      return;
    }

    const code = parseEquipmentQrPayload(rawValue);
    if (!code) {
      setError("二维码内容无效");
      return;
    }

    resolvingRef.current = true;
    setError("");
    setStatus(`正在查找 ${code}`);
    try {
      const equipment = await getEquipmentList({ keyword: code });
      const found = equipment.find((item) => item.equipment_code === code) ?? equipment[0];
      if (!found) {
        setError(`未找到设备：${code}`);
        setStatus("未匹配设备");
        return;
      }
      controlsRef.current?.stop();
      setScanning(false);
      onFound(found.id);
    } catch (err) {
      setError(err.message);
      setStatus("查询失败");
    } finally {
      resolvingRef.current = false;
    }
  }

  async function startScan() {
    if (!videoRef.current || scanning) {
      return;
    }

    setError("");
    setStatus("摄像头启动中");
    setScanning(true);

    try {
      const reader = new BrowserMultiFormatReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        if (result) {
          openEquipmentByCode(result.getText());
        }
      });
      setStatus("扫码中");
    } catch (err) {
      setScanning(false);
      setStatus("摄像头不可用");
      setError(err.message || "无法启动摄像头");
    }
  }

  function stopScan() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
    setStatus("已停止");
  }

  useEffect(() => {
    startScan();
    return () => {
      controlsRef.current?.stop();
    };
  }, []);

  function handleManualSubmit(event) {
    event.preventDefault();
    openEquipmentByCode(manualCode);
  }

  return (
    <section className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">扫码查询</p>
          <h2>设备二维码</h2>
        </div>
        <div className="action-row">
          <button className="secondary-button" disabled={scanning} onClick={startScan} type="button">
            开始扫码
          </button>
          <button className="secondary-button" disabled={!scanning} onClick={stopScan} type="button">
            停止
          </button>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      <section className="panel scanner-panel">
        <div className="scanner-frame">
          <video muted playsInline ref={videoRef} />
        </div>
        <div className="scanner-side">
          <div className="scanner-status">
            <p>状态</p>
            <strong>{status}</strong>
          </div>
          <form className="scanner-manual" onSubmit={handleManualSubmit}>
            <label>
              设备编号
              <input
                className="form-control"
                value={manualCode}
                onChange={(event) => setManualCode(event.target.value)}
                placeholder="例如 AUTO-LSJ-001"
              />
            </label>
            <button className="primary-button" type="submit">
              查询设备
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}
