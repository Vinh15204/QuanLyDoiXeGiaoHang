import React from "react";
import { useLocation } from "react-router-dom";
import DashboardLayout from "./DashboardLayout";
import ModernDashboardContent from "./ModernDashboardContent";
import VehiclesManagementNew from "./VehiclesManagementNew";
import OrdersManagementNew from "./OrdersManagementNew";
import DriversManagement from "./DriversManagement";
import Analytics from "./Analytics";
import Settings from "./Settings";

function AdminDashboard() {
  const location = useLocation();
  const currentPage = location.pathname.split('/').pop();

  // Render different page content inside the layout
  const renderPageContent = () => {
    switch (currentPage) {
      case 'vehicles':
        return <VehiclesManagementNew />;
      case 'orders':
        return <OrdersManagementNew />;
      case 'drivers':
        return <DriversManagement />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      case 'map':
      case 'info':
      default:
        return <ModernDashboardContent />;
    }
  };

  return (
    <DashboardLayout>
      {renderPageContent()}
    </DashboardLayout>
  );
}

export default AdminDashboard;
