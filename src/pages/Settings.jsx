import React from "react";
import API from "../services/api";
import "../css/admin.css";
import "../css/dashboard.css";

const SECTION = ({ title, children }) => (
    <div className="section" style={{ marginTop: 0, maxWidth: "650px" }}>
        <h3 style={{ marginTop: 0, marginBottom: "20px", color: "#0f172a", fontSize: "16px" }}>{title}</h3>
        {children}
    </div>
);

function Settings() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Settings</h2>
            </div>

            <SECTION title="Your Account">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                    {[
                        { label: "Full Name", value: user.name || "—" },
                        { label: "Username", value: user.username || "—" },
                        { label: "Role", value: user.role || "—" },
                        { label: "Warehouse ID", value: user.warehouse_id || "Global" },
                    ].map((f) => (
                        <div key={f.label}>
                            <div style={{ fontSize: "12px", color: "#94a3b8", fontWeight: 600, marginBottom: "4px", textTransform: "uppercase" }}>
                                {f.label}
                            </div>
                            <div style={{ fontSize: "15px", fontWeight: 500, color: "#0f172a", padding: "10px 14px", background: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                                {f.value}
                            </div>
                        </div>
                    ))}
                </div>
            </SECTION>

            <div style={{ marginTop: "25px" }}>
                <SECTION title="Your Permissions">
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                        {[
                            { key: "can_upload_po", label: "Upload PO" },
                            { key: "can_approve_po", label: "Approve PO" },
                            { key: "can_manage_products", label: "Manage Products" },
                            { key: "can_manage_users", label: "Manage Users" },
                            { key: "can_view_all_stock", label: "View All Stock" },
                            { key: "can_download_reports", label: "Download Reports" },
                        ].map((perm) => (
                            <span key={perm.key} style={{
                                padding: "6px 14px",
                                borderRadius: "20px",
                                fontSize: "13px",
                                fontWeight: 600,
                                background: user[perm.key] || user.role === "ADMIN" ? "#f0fdf4" : "#f8fafc",
                                color: user[perm.key] || user.role === "ADMIN" ? "#16a34a" : "#94a3b8",
                                border: `1px solid ${user[perm.key] || user.role === "ADMIN" ? "#bbf7d0" : "#e2e8f0"}`,
                            }}>
                                {user[perm.key] || user.role === "ADMIN" ? "✓" : "✗"} {perm.label}
                            </span>
                        ))}
                    </div>
                </SECTION>
            </div>

            <div style={{ marginTop: "25px" }}>
                <SECTION title="Application Info">
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                        {[
                            { label: "System", value: "Inventory Management ERP" },
                            { label: "Backend", value: "Node.js + Express + PostgreSQL" },
                            { label: "Frontend", value: "React 18 + Vite" },
                            { label: "API Base URL", value: API.defaults.baseURL },
                        ].map((info) => (
                            <div key={info.label} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                <span style={{ minWidth: "140px", fontSize: "13px", color: "#64748b", fontWeight: 600 }}>{info.label}:</span>
                                <span style={{ fontSize: "14px", color: "#0f172a" }}>{info.value}</span>
                            </div>
                        ))}
                    </div>
                </SECTION>
            </div>
        </div>
    );
}

export default Settings;
