import { useEffect, useState } from "react";

import { subscribeApiLoading } from "../api/client.js";

export default function GlobalLoadingBar() {
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let finishTimer = null;
    let progressTimer = null;

    const unsubscribe = subscribeApiLoading((count) => {
      window.clearTimeout(finishTimer);
      window.clearInterval(progressTimer);

      if (count > 0) {
        setActive(true);
        setProgress((current) => (current > 0 && current < 92 ? current : 12));
        progressTimer = window.setInterval(() => {
          setProgress((current) => Math.min(current + Math.max(1, (90 - current) * 0.12), 92));
        }, 180);
        return;
      }

      setProgress(100);
      finishTimer = window.setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 280);
    });

    return () => {
      unsubscribe();
      window.clearTimeout(finishTimer);
      window.clearInterval(progressTimer);
    };
  }, []);

  return (
    <div className={`global-loading-bar ${active ? "active" : ""}`} aria-hidden="true">
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}
