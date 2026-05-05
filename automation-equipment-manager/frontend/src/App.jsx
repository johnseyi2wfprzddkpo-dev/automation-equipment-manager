import { useEffect, useState } from "react";

import { clearStoredToken, getMe, getStoredToken } from "./api/client.js";
import Layout from "./components/Layout.jsx";
import BenefitAnalysis from "./pages/BenefitAnalysis.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import EquipmentDetail from "./pages/EquipmentDetail.jsx";
import EquipmentForm from "./pages/EquipmentForm.jsx";
import EquipmentList from "./pages/EquipmentList.jsx";
import Login from "./pages/Login.jsx";
import MaintenanceList from "./pages/MaintenanceList.jsx";
import OutsourceList from "./pages/OutsourceList.jsx";
import QrScanner from "./pages/QrScanner.jsx";
import RepairList from "./pages/RepairList.jsx";
import UserList from "./pages/UserList.jsx";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [selectedEquipmentId, setSelectedEquipmentId] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!getStoredToken()) {
      setCheckingSession(false);
      return;
    }

    getMe()
      .then(setUser)
      .catch(() => {
        clearStoredToken();
        setUser(null);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  function openPage(nextPage) {
    setPage(nextPage);
    if (nextPage !== "equipment-detail" && nextPage !== "equipment-form") {
      setSelectedEquipmentId(null);
    }
  }

  function renderPage() {
    if (page === "equipment") {
      return (
        <EquipmentList
          onCreate={() => {
            setSelectedEquipmentId(null);
            setPage("equipment-form");
          }}
          onEdit={(id) => {
            setSelectedEquipmentId(id);
            setPage("equipment-form");
          }}
          onView={(id) => {
            setSelectedEquipmentId(id);
            setPage("equipment-detail");
          }}
        />
      );
    }

    if (page === "equipment-form") {
      return (
        <EquipmentForm
          equipmentId={selectedEquipmentId}
          onCancel={() => openPage("equipment")}
          onSaved={() => openPage("equipment")}
        />
      );
    }

    if (page === "equipment-detail") {
      return (
        <EquipmentDetail
          equipmentId={selectedEquipmentId}
          onBack={() => openPage("equipment")}
          onEdit={(id) => {
            setSelectedEquipmentId(id);
            setPage("equipment-form");
          }}
        />
      );
    }

    if (page === "outsource") {
      return <OutsourceList />;
    }

    if (page === "qr-scan") {
      return (
        <QrScanner
          onFound={(id) => {
            setSelectedEquipmentId(id);
            setPage("equipment-detail");
          }}
        />
      );
    }

    if (page === "repair") {
      return <RepairList />;
    }

    if (page === "maintenance") {
      return <MaintenanceList />;
    }

    if (page === "benefit") {
      return <BenefitAnalysis />;
    }

    if (page === "users") {
      return <UserList />;
    }

    return <Dashboard onNavigate={openPage} />;
  }

  function handleLogout() {
    clearStoredToken();
    setUser(null);
    setPage("dashboard");
    setSelectedEquipmentId(null);
  }

  if (checkingSession) {
    return <div className="auth-loading">正在检查登录状态...</div>;
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <Layout currentPage={page} onLogout={handleLogout} onNavigate={openPage} user={user}>
      {renderPage()}
    </Layout>
  );
}
