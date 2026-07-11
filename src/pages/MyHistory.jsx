import React, { useState, useEffect } from "react";
import { getMyHistory } from "../services/inventoryService";
import "../css/admin.css";
import "../css/dashboard.css";

function MyHistory() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const res = await getMyHistory();
                setHistory(res.data.data);
                setError("");
            } catch (err) {
                console.error("Error fetching history:", err);
                setError("Failed to load your activity history.");
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, []);

    const filtered = history.filter((h) =>
        h.internal_model?.toLowerCase().includes(search.toLowerCase()) ||
        h.remarks?.toLowerCase().includes(search.toLowerCase())
    );

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const getBadge = (type, txType) => {
        if (type === "STOCK_ENTRY") return <span className="badge badge-success">Stock Entry</span>;
        if (type === "ALLOCATION") return <span className="badge badge-danger">Allocated (PO)</span>;
        return <span className="badge">{type}</span>;
    };

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
                        placeholder="Search by product or remarks..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input"
                    />
                </div>

                {loading ? (
                    <p>Loading history...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
                        {search ? "No results found." : "No activity recorded yet."}
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date & Time</th>
                                <th>Product</th>
                                <th>Warehouse</th>
                                <th>Type</th>
                                <th>Quantity (Pieces)</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item, index) => (
                                <tr key={item.id}>
                                    <td style={{ color: "#94a3b8" }}>{index + 1}</td>
                                    <td style={{ whiteSpace: "nowrap", fontSize: "13px" }}>
                                        {formatDate(item.created_at)}
                                    </td>
                                    <td style={{ fontWeight: 500, color: "#0f172a" }}>
                                        {item.internal_model}
                                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                                            ASIN: {item.amazon_asin}
                                        </div>
                                    </td>
                                    <td>
                                        {item.warehouse_name || "—"}
                                        {item.warehouse_code && (
                                            <span style={{ fontSize: "12px", color: "#64748b", marginLeft: "5px" }}>
                                                ({item.warehouse_code})
                                            </span>
                                        )}
                                    </td>
                                    <td>{getBadge(item.type, item.transaction_type)}</td>
                                    <td style={{ fontWeight: 600 }}>
                                        <span style={{ color: item.transaction_type === "IN" ? "#16a34a" : "#dc2626" }}>
                                            {item.transaction_type === "IN" ? "+" : "-"}{item.quantity}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "13px", color: "#475569" }}>{item.remarks || "—"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default MyHistory;
