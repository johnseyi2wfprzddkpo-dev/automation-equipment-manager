import { useEffect, useState } from "react";
import QRCode from "qrcode";

import { buildEquipmentQrPayload } from "../utils/qr.js";

export default function EquipmentQrCode({ equipment, size = 220 }) {
  const [qrUrl, setQrUrl] = useState("");
  const payload = equipment ? buildEquipmentQrPayload(equipment) : "";

  useEffect(() => {
    let isMounted = true;
    if (!payload) {
      setQrUrl("");
      return;
    }

    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: size,
    }).then((url) => {
      if (isMounted) {
        setQrUrl(url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [payload, size]);

  function handleDownload() {
    if (!qrUrl || !equipment) {
      return;
    }
    const link = document.createElement("a");
    link.href = qrUrl;
    link.download = `${equipment.equipment_code}-二维码.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (!equipment) {
    return null;
  }

  return (
    <div className="qr-card">
      {qrUrl ? <img alt={`${equipment.equipment_code} 二维码`} src={qrUrl} /> : <div className="qr-placeholder" />}
      <div className="qr-meta">
        <strong>{equipment.equipment_code}</strong>
        <span>{equipment.equipment_name}</span>
      </div>
      <button className="secondary-button" onClick={handleDownload} type="button">
        下载二维码
      </button>
    </div>
  );
}
