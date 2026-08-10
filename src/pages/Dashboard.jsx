import React, { useEffect, useState } from "react";
import DashboardCards from "../components/DashboardCards";
import ActivityTable from "../components/ActivityTable";
import LowStockTable from "../components/LowStockTable";
import API from "../services/api";
import "../css/dashboard.css";

function Dashboard() {
    const [dashboard, setDashboard] = useState({
        totalProducts: 0,
        stockInHand: 0,
        readyToMove: 0,
        pendingPO: 0,
        pendingPOsList: []
    });

    const loadDashboard = async () => {
        try {
            const res = await API.get("/dashboard");
            setDashboard(res.data.data);
        } catch (err) {
            console.error("Error loading dashboard data:", err);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "ADMIN";

    return (
        <div className="dashboard-content">
            <DashboardCards dashboard={dashboard} />

            {isAdmin && dashboard.pendingPOsList && dashboard.pendingPOsList.length > 0 && (
                <div className="section" style={{ marginTop: "25px", background: "white", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "#b45309", fontSize: "16px", fontWeight: 600 }}>
                            ⏳ Purchase Orders Awaiting Approval ({dashboard.pendingPOsList.length})
                        </h3>
                        <button 
                            className="btn btn-primary" 
                            style={{ padding: "6px 14px", fontSize: "13px", background: "#d97706", border: "none" }}
                            onClick={() => window.location.href = "/purchase-orders"}
                        >
                            Go to PO Page
                        </button>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ borderBottom: "2px solid #f1f5f9", textAlign: "left" }}>
                                    <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: "13px" }}>PO Number</th>
                                    <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: "13px" }}>Platform</th>
                                    <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: "13px" }}>Submitted By</th>
                                    <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: "13px" }}>Total Quantity</th>
                                    <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: "13px" }}>Date</th>
                                    <th style={{ padding: "10px 12px", color: "#64748b", fontWeight: 600, fontSize: "13px" }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dashboard.pendingPOsList.map(po => {
                                    const pColors = {
                                        AMAZON: { bg: "#fff7ed", color: "#c2410c" },
                                        BLINKIT: { bg: "#f0fdf4", color: "#15803d" },
                                        ZEPTO: { bg: "#faf5ff", color: "#7c3aed" },
                                        FLIPKART: { bg: "#eff6ff", color: "#2563eb" },
                                        SWIGGY: { bg: "#fff7ed", color: "#ea580c" }
                                    };
                                    const colors = pColors[po.platform] || { bg: "#f1f5f9", color: "#475569" };
                                    return (
                                        <tr key={po.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                            <td style={{ padding: "12px", fontWeight: 600, fontFamily: "monospace", fontSize: "13px" }}>{po.po_number}</td>
                                            <td style={{ padding: "12px" }}>
                                                <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600, background: colors.bg, color: colors.color }}>
                                                    {po.platform}
                                                </span>
                                            </td>
                                            <td style={{ padding: "12px", fontSize: "13px" }}>{po.uploader_name || "—"}</td>
                                            <td style={{ padding: "12px", fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                                                {po.total_quantity} pcs <span style={{ fontWeight: 400, color: "#64748b", fontSize: "12px" }}>({po.items_count} items)</span>
                                            </td>
                                            <td style={{ padding: "12px", fontSize: "13px", color: "#64748b" }}>
                                                {new Date(po.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td style={{ padding: "12px" }}>
                                                <button 
                                                    className="btn btn-secondary" 
                                                    style={{ padding: "4px 12px", fontSize: "12px" }}
                                                    onClick={() => window.location.href = "/purchase-orders"}
                                                >
                                                    Check & Approve
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            
            <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
                gap: "25px", 
                marginTop: "30px" 
            }}>
                <ActivityTable />
                <LowStockTable />
            </div>
        </div>
    );
}

export default Dashboard;
