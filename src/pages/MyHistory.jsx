import React, { useState, useEffect, useMemo } from "react";
import { getMyHistory } from "../services/inventoryService";
import "../css/admin.css";
import "../css/dashboard.css";

function MyHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    // Modal state for viewing entries of a selected date/batch group
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const res = await getMyHistory();
            setHistory(res.data.data || []);
            setError("");
        } catch (err) {
            console.error("Error fetching history:", err);
            setError("Failed to load your activity history.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (iso) => {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const getTypeBadge = (type) => {
        if (type === "STOCK_ENTRY") return <span className="badge badge-success">Stock Entry</span>;
        if (type === "ALLOCATION") return <span className="badge badge-danger">Allocated (PO)</span>;
        if (type === "STOCK_SHIFT") return <span className="badge" style={{ background: "#e0f2fe", color: "#0369a1" }}>Stock Transfer</span>;
        if (type === "DISPATCH") return <span className="badge" style={{ background: "#f1f5f9", color: "#475569" }}>Dispatched</span>;
        return <span className="badge">{type}</span>;
    };

    // Group history entries by submission date/time
    const groupedHistory = useMemo(() => {
        if (!history || history.length === 0) return [];

        const groupsMap = {};

        history.forEach((item) => {
            const d = new Date(item.created_at);
            // Group key by minute batch (YYYY-MM-DD HH:mm)
            const key = d.getFullYear() + "-" +
                String(d.getMonth() + 1).padStart(2, '0') + "-" +
                String(d.getDate()).padStart(2, '0') + " " +
                String(d.getHours()).padStart(2, '0') + ":" +
                String(d.getMinutes()).padStart(2, '0');

            if (!groupsMap[key]) {
                groupsMap[key] = {
                    key,
                    created_at: item.created_at,
                    items: [],
                    warehouses: new Set(),
                    totalInPieces: 0,
                    totalOutPieces: 0
                };
            }

            groupsMap[key].items.push(item);
            if (item.warehouse_name) {
                groupsMap[key].warehouses.add(`${item.warehouse_name}${item.warehouse_code ? ` (${item.warehouse_code})` : ''}`);
            }
            if (item.transaction_type === 'IN') {
                groupsMap[key].totalInPieces += (item.quantity || 0);
            } else {
                groupsMap[key].totalOutPieces += (item.quantity || 0);
            }
        });

        return Object.values(groupsMap).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [history]);

    // Filter groups based on search term
    const filteredGroups = groupedHistory.filter((group) => {
        if (!search) return true;
        const q = search.toLowerCase();
        const warehouseStr = Array.from(group.warehouses).join(" ").toLowerCase();
        return (
            warehouseStr.includes(q) ||
            formatDate(group.created_at).toLowerCase().includes(q) ||
            group.items.some(
                (item) =>
                    item.internal_model?.toLowerCase().includes(q) ||
                    item.amazon_asin?.toLowerCase().includes(q) ||
                    item.remarks?.toLowerCase().includes(q)
            )
        );
    });

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>My Activity History</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                    <input
                        type="text"
                        placeholder="Search by product, warehouse or date..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input"
                    />
                </div>

                {loading ? (
                    <p>Loading history...</p>
                ) : filteredGroups.length === 0 ? (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
                        {search ? "No matching history found." : "No activity recorded yet."}
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date & Time</th>
                                <th>Warehouse</th>
                                <th style={{ textAlign: "center" }}>Total Products</th>
                                <th style={{ textAlign: "center" }}>Total Quantity</th>
                                <th style={{ textAlign: "center" }}>View</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroups.map((group, index) => {
                                const whList = Array.from(group.warehouses);
                                const whDisplay = whList.length > 0 ? whList.join(", ") : "—";

                                return (
                                    <tr key={group.key}>
                                        <td style={{ color: "#94a3b8", width: "40px" }}>{index + 1}</td>
                                        <td style={{ whiteSpace: "nowrap", fontWeight: 600, color: "#0f172a", fontSize: "14px" }}>
                                            {formatDate(group.created_at)}
                                        </td>
                                        <td style={{ color: "#334155" }}>
                                            {whDisplay}
                                        </td>
                                        <td style={{ textAlign: "center", fontWeight: 600, color: "#2563eb" }}>
                                            {group.items.length} {group.items.length === 1 ? "product" : "products"}
                                        </td>
                                        <td style={{ textAlign: "center", fontWeight: 600 }}>
                                            {group.totalInPieces > 0 && (
                                                <span style={{ color: "#16a34a", marginRight: group.totalOutPieces > 0 ? "8px" : "0" }}>
                                                    +{group.totalInPieces} pcs
                                                </span>
                                            )}
                                            {group.totalOutPieces > 0 && (
                                                <span style={{ color: "#dc2626" }}>
                                                    -{group.totalOutPieces} pcs
                                                </span>
                                            )}
                                            {group.totalInPieces === 0 && group.totalOutPieces === 0 && (
                                                <span style={{ color: "#94a3b8" }}>0 pcs</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: "center", whiteSpace: "nowrap", width: "100px" }}>
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{ padding: "5px 14px", fontSize: "13px", background: "#ffffff", border: "1px solid #cbd5e1", cursor: "pointer" }}
                                                onClick={() => setSelectedGroup(group)}
                                                title="View all entries on this date"
                                            >
                                                👁️ View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* View Group Details Modal */}
            {selectedGroup && (
                <div style={{
                    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                    zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px"
                }}>
                    <div style={{
                        background: "white", borderRadius: "12px", width: "100%", maxWidth: "850px",
                        maxHeight: "90vh", display: "flex", flexDirection: "column",
                        boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
                        overflow: "hidden"
                    }}>
                        {/* Modal Header */}
                        <div style={{ padding: "18px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8fafc" }}>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                                    Stock Entries on {formatDate(selectedGroup.created_at)}
                                </h3>
                                <span style={{ fontSize: "13px", color: "#64748b" }}>
                                    Total Products: <strong>{selectedGroup.items.length} items</strong> | Warehouse: <strong>{Array.from(selectedGroup.warehouses).join(", ") || "—"}</strong>
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedGroup(null)}
                                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#94a3b8" }}
                            >×</button>
                        </div>

                        {/* Modal Body Table */}
                        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: "36px" }}>#</th>
                                        <th>Product Model</th>
                                        <th>Warehouse</th>
                                        <th>Type</th>
                                        <th style={{ textAlign: "center" }}>Boxes</th>
                                        <th style={{ textAlign: "center" }}>Quantity (Pieces)</th>
                                        <th>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedGroup.items.map((item, idx) => {
                                        const ppb = item.pieces_per_box || 1;
                                        const boxesCalc = (item.quantity / ppb).toFixed(2);

                                        return (
                                            <tr key={item.id || idx}>
                                                <td style={{ color: "#94a3b8" }}>{idx + 1}</td>
                                                <td style={{ fontWeight: 600, color: "#0f172a" }}>
                                                    {item.internal_model}
                                                    {item.amazon_asin && (
                                                        <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 400 }}>
                                                            ASIN: {item.amazon_asin}
                                                        </div>
                                                    )}
                                                </td>
                                                <td>
                                                    {item.warehouse_name || "—"}
                                                    {item.warehouse_code && (
                                                        <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "4px" }}>
                                                            ({item.warehouse_code})
                                                        </span>
                                                    )}
                                                </td>
                                                <td>{getTypeBadge(item.type)}</td>
                                                <td style={{ textAlign: "center", fontWeight: 500, color: "#334155" }}>
                                                    {boxesCalc} <span style={{ fontSize: "11px", color: "#64748b" }}>({ppb} pcs/box)</span>
                                                </td>
                                                <td style={{ textAlign: "center", fontWeight: 700 }}>
                                                    <span style={{ color: item.transaction_type === "IN" ? "#16a34a" : "#dc2626" }}>
                                                        {item.transaction_type === "IN" ? "+" : "-"}{item.quantity} pcs
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: "13px", color: "#475569" }}>
                                                    {item.remarks || "—"}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Modal Footer */}
                        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "flex-end", background: "#f8fafc" }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setSelectedGroup(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default MyHistory;


