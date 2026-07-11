import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";

// Layout & Auth Utilities
import MainLayout from "./layouts/MainLayout";
import { isAuthenticated } from "./utils/auth";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import PurchaseOrders from "./pages/PurchaseOrders";
import AmazonPO from "./pages/AmazonPO";
import StockEntry from "./pages/StockEntry";
import ReadyToMove from "./pages/ReadyToMove";
import Users from "./pages/Users";
import Warehouses from "./pages/Warehouses";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import MyHistory from "./pages/MyHistory";
import POHistory from "./pages/POHistory";


// Route Guard component
const PrivateRoute = () => {
    return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
};

// Layout Wrapper component
const AppLayout = () => {
    return (
        <MainLayout>
            <Outlet />
        </MainLayout>
    );
};

function App() {
    return (
        <Router>
            <Routes>
                {/* Public Route */}
                <Route path="/login" element={<Login />} />

                {/* Protected Routes */}
                <Route element={<PrivateRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/products" element={<Products />} />
                        <Route path="/inventory" element={<Inventory />} />
                        <Route path="/po/amazon" element={<AmazonPO />} />
                        <Route path="/purchase-orders" element={<PurchaseOrders />} />
                        <Route path="/stock-entry" element={<StockEntry />} />
                        <Route path="/ready-to-move" element={<ReadyToMove />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/warehouses" element={<Warehouses />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/my-history" element={<MyHistory />} />
                        <Route path="/po-history" element={<POHistory />} />
                    </Route>
                </Route>

                {/* Default Fallback Redirect */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </Router>
    );
}

export default App;