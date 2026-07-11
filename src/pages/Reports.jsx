import React, { useState, useEffect } from "react";
import { getWarehouseInventory } from "../services/inventoryService";
import API from "../services/api";
import "../css/admin.css";
import "../css/dashboard.css";

function Reports() {
    const [inventory, setInventory] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [exportMsg, setExportMsg] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [invRes, prodRes] = await Promise.all([
                    getWarehouseInventory("all"),
                    API.get("/products")
                ]);
                setInventory(invRes.data.data);
                setProducts(prodRes.data.data);
                setError("");
            } catch (err) {
                console.error("Reports load error:", err);
                setError("Failed to load report data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const productSummary = products.map((p) => {
        const warehouseRows = inventory.filter((i) => i.product_id === p.id);
        const totalStock = warehouseRows.reduce((sum, r) => sum + (r.quantity || 0), 0);
        const totalRTM = warehouseRows.reduce((sum, r) => sum + (r.ready_to_move || 0), 0);
        return { ...p, totalStock, totalRTM };
    });

    const totalStock = productSummary.reduce((s, p) => s + p.totalStock, 0);
    const totalRTM = productSummary.reduce((s, p) => s + p.totalRTM, 0);
    const lowStockCount = productSummary.filter((p) => p.totalStock < 50).length;

    const exportCSV = () => {
        const headers = ["Model", "Amazon ASIN", "Stock In Hand", "Ready To Move", "Total Received", "Pieces Per Box"];
        const rows = productSummary.map((p) => [
            p.internal_model, p.amazon_asin || "", p.totalStock, p.totalRTM,
            p.total_received || 0, p.pieces_per_box || 0
        ]);
        const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `inventory_report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        setExportMsg("CSV downloaded!");
        setTimeout(() => setExportMsg(""), 3000);
    };

    const kpis = [
        { label: "Total Products", value: products.length, color: "#6366f1", bg: "#eef2ff", border: "#c7d2fe" },
        { label: "Total Stock (Pcs)", value: totalStock.toLocaleString(), color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
        { label: "Ready To Move (Pcs)", value: totalRTM.toLocaleString(), color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
        { label: "Low Stock Products", value: lowStockCount, color: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
    ];

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Reports</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {exportMsg && <div className="alert alert-success">{exportMsg}</div>}

            {!loading && (
                <div style={{ display: "flex", gap: "20px", marginBottom: "25px", flexWrap: "wrap" }}>
                    {kpis.map((kpi) => (
                        <div key={kpi.label} style={{
                            background: kpi.bg, border: `1px solid ${kpi.border}`,
                            borderRadius: "10px", padding: "16px 24px", minWidth: "180px", flex: 1
                        }}>
                            <div style={{ fontSize: "13px", color: kpi.color, fontWeight: 600, marginBottom: "4px" }}>{kpi.label}</div>
                            <div style={{ fontSize: "28px", fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                    <h3 style={{ margin: 0 }}>Inventory Summary by Product</h3>
                    <button className="btn btn-primary" onClick={exportCSV} disabled={loading}>
                        ⬇ Export as CSV
                    </button>
                </div>

                {loading ? (
                    <p>Generating report...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Product Model</th>
                                <th>Amazon ASIN</th>
                                <th>Stock In Hand</th>
                                <th>Ready To Move</th>
                                <th>Total Received</th>
                                <th>Pcs / Box</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productSummary.length === 0 ? (
                                <tr><td colSpan="7" style={{ textAlign: "center", color: "#64748b" }}>No products found.</td></tr>
                            ) : (
                                productSummary.map((p) => {
                                    const isLow = p.totalStock < 50;
                                    return (
                                        <tr key={p.id} style={isLow ? { backgroundColor: "#fef2f2" } : {}}>
                                            <td style={{ fontWeight: 500, color: "#0f172a" }}>{p.internal_model}</td>
                                            <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#475569" }}>{p.amazon_asin || "—"}</td>
                                            <td style={{ fontWeight: 600, color: isLow ? "#dc2626" : "#0f172a" }}>{p.totalStock.toLocaleString()}</td>
                                            <td style={{ color: "#16a34a", fontWeight: 600 }}>{p.totalRTM.toLocaleString()}</td>
                                            <td>{(p.total_received || 0).toLocaleString()}</td>
                                            <td>{p.pieces_per_box || "—"}</td>
                                            <td>
                                                {p.totalStock === 0
                                                    ? <span className="badge badge-danger">Out of Stock</span>
                                                    : isLow
                                                    ? <span className="badge badge-danger">Low Stock</span>
                                                    : <span className="badge badge-success">In Stock</span>}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default Reports;
