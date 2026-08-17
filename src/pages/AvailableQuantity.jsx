import React, { useState, useEffect } from "react";
import { getAvailableQuantityPOs, getPOItems } from "../services/poService";
import "../css/admin.css";
import "../css/dashboard.css";

function AvailableQuantity() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [selectedPlatform, setSelectedPlatform] = useState("ALL");

    // Modal state for viewing/updating PO items
    const [selectedPOModal, setSelectedPOModal] = useState(null);
    const [poModalLoading, setPoModalLoading] = useState(false);

    useEffect(() => {
        fetchAvailableQuantityData();
    }, []);

    const fetchAvailableQuantityData = async () => {
        try {
            setLoading(true);
            const res = await getAvailableQuantityPOs();
            setItems(res.data.data || []);
            setError("");
        } catch (err) {
            console.error("Error loading available quantity data:", err);
            setError("Failed to load available quantity data.");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPO = async (poId) => {
        try {
            setPoModalLoading(true);
            const res = await getPOItems(poId);
            setSelectedPOModal(res.data.data);
        } catch (err) {
            console.error("Error loading PO details:", err);
            alert("Failed to load PO details.");
        } finally {
            setPoModalLoading(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleDateString("en-IN", {
            day: "2-digit", month: "short", year: "numeric"
        });
    };

    const platformColors = {
        AMAZON: { bg: "#fff7ed", color: "#c2410c" },
        BLINKIT: { bg: "#f0fdf4", color: "#15803d" },
        ZEPTO: { bg: "#faf5ff", color: "#7c3aed" },
        FLIPKART: { bg: "#eff6ff", color: "#2563eb" },
        SWIGGY: { bg: "#fff7ed", color: "#ea580c" }
    };

    const filtered = items.filter(item => {
        const matchesSearch = 
            item.po_number?.toLowerCase().includes(search.toLowerCase()) ||
            item.internal_model?.toLowerCase().includes(search.toLowerCase()) ||
            item.amazon_asin?.toLowerCase().includes(search.toLowerCase());
        const matchesPlatform = selectedPlatform === "ALL" || item.platform === selectedPlatform;
        return matchesSearch && matchesPlatform;
    });

    // Deduplicate available stock by product_id — same product in multiple POs should only count once
    const uniqueProductStock = {};
    filtered.forEach(item => {
        if (!uniqueProductStock[item.product_id]) {
            uniqueProductStock[item.product_id] = item.available_quantity || 0;
        }
    });
    const totalAvailablePcs = Object.values(uniqueProductStock).reduce((acc, qty) => acc + qty, 0);
    const totalShortPcs = filtered.reduce((acc, curr) => acc + (curr.short_quantity || 0), 0);

    return (
        <div className="page-content">
            <div className="admin-header" style={{ marginBottom: "20px" }}>
                <div>
                    <h2>Available Quantity for Short PO Items</h2>
                    <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
                        Stock arrived for previously short PO items awaiting admin approval. Review available inventory to update PO quantities.
                    </p>
                </div>
                <button 
                    className="btn btn-secondary"
                    onClick={fetchAvailableQuantityData}
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                    🔄 Refresh Stock
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
                <div style={{ background: "white", padding: "18px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Items with Stock Available</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginTop: "6px" }}>{filtered.length}</div>
                </div>
                <div style={{ background: "white", padding: "18px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Total Shortage Needed</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#c2410c", marginTop: "6px" }}>{totalShortPcs} pcs</div>
                </div>
                <div style={{ background: "white", padding: "18px 20px", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                    <div style={{ fontSize: "13px", color: "#64748b", fontWeight: 500 }}>Current Available Warehouse Stock</div>
                    <div style={{ fontSize: "24px", fontWeight: 700, color: "#16a34a", marginTop: "6px" }}>{totalAvailablePcs} pcs</div>
                </div>
            </div>

            {/* Controls */}
            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
                    <div style={{ flex: 1, minWidth: "260px", maxWidth: "400px" }}>
                        <input
                            type="text"
                            placeholder="Search by PO number or product..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="form-input"
                        />
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {["ALL", "AMAZON", "BLINKIT", "ZEPTO", "FLIPKART", "SWIGGY"].map(p => (
                            <button
                                key={p}
                                onClick={() => setSelectedPlatform(p)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    fontSize: "13px",
                                    fontWeight: 600,
                                    border: selectedPlatform === p ? "1px solid #2563eb" : "1px solid #e2e8f0",
                                    background: selectedPlatform === p ? "#2563eb" : "#ffffff",
                                    color: selectedPlatform === p ? "#ffffff" : "#64748b",
                                    cursor: "pointer"
                                }}
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <p style={{ textAlign: "center", padding: "30px 0" }}>Checking available warehouse stock against POs...</p>
                ) : filtered.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "50px 20px", color: "#64748b" }}>
                        <div style={{ fontSize: "32px", marginBottom: "10px" }}>📦</div>
                        <h4>No Shortage Items Currently Have Available Stock</h4>
                        <p style={{ fontSize: "14px", marginTop: "4px" }}>
                            When new stock entries are added for products that were short in any PO, they will automatically appear here.
                        </p>
                    </div>
                ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "2px solid #e2e8f0" }}>
                                <th style={{ padding: "12px", textAlign: "left" }}>PO Number</th>
                                <th style={{ padding: "12px", textAlign: "left" }}>Items</th>
                                <th style={{ padding: "12px", textAlign: "left" }}>Platform</th>
                                <th style={{ padding: "12px", textAlign: "right" }}>Want Quantity</th>
                                <th style={{ padding: "12px", textAlign: "right" }}>Assigned Qty</th>
                                <th style={{ padding: "12px", textAlign: "right" }}>Shortage Qty</th>
                                <th style={{ padding: "12px", textAlign: "right" }}>Available</th>
                                <th style={{ padding: "12px", textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item) => {
                                const colors = platformColors[item.platform] || { bg: "#f1f5f9", color: "#475569" };
                                return (
                                    <tr key={item.item_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                        <td style={{ padding: "12px", fontWeight: 600, fontFamily: "monospace", fontSize: "13px" }}>
                                            {item.po_number}
                                            <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 400 }}>
                                                {formatDate(item.po_created_at)}
                                            </div>
                                        </td>
                                        <td style={{ padding: "12px", fontWeight: 500, color: "#0f172a" }}>
                                            {item.internal_model}
                                            {item.amazon_asin && (
                                                <div style={{ fontSize: "12px", color: "#64748b" }}>
                                                    ASIN: {item.amazon_asin}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "12px" }}>
                                            <span style={{
                                                padding: "4px 10px",
                                                borderRadius: "12px",
                                                fontSize: "12px",
                                                fontWeight: 600,
                                                background: colors.bg,
                                                color: colors.color
                                            }}>
                                                {item.platform}
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600, color: "#1e293b" }}>
                                            {item.want_quantity} pcs
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "right", color: "#64748b" }}>
                                            {item.assigned_quantity || 0} pcs
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "right", fontWeight: 600, color: "#dc2626" }}>
                                            {item.short_quantity} pcs
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "right" }}>
                                            <span style={{
                                                padding: "4px 12px",
                                                borderRadius: "12px",
                                                fontSize: "13px",
                                                fontWeight: 700,
                                                background: "#f0fdf4",
                                                color: "#16a34a",
                                                border: "1px solid #bbf7d0"
                                            }}>
                                                {item.available_quantity} pcs
                                            </span>
                                        </td>
                                        <td style={{ padding: "12px", textAlign: "center" }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ padding: "5px 12px", fontSize: "12px", background: "#2563eb" }}
                                                onClick={() => window.location.href = `/purchase-orders?po_id=${item.po_id}`}
                                            >
                                                Go to PO Page
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default AvailableQuantity;
