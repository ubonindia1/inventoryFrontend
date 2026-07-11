import React, { useState, useEffect } from "react";
import { getReadyToMove } from "../services/inventoryService";
import "../css/admin.css";
import "../css/dashboard.css";

function ReadyToMove() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const res = await getReadyToMove();
                setItems(res.data.data);
                setError("");
            } catch (err) {
                console.error("Error fetching ready-to-move:", err);
                setError("Failed to load ready-to-move data.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtered = items.filter((item) =>
        item.internal_model?.toLowerCase().includes(search.toLowerCase()) ||
        item.warehouse_name?.toLowerCase().includes(search.toLowerCase())
    );

    const totalReadyToMove = filtered.reduce((sum, item) => sum + (item.ready_to_move || 0), 0);

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Ready To Move</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            {/* Summary Card */}
            {!loading && (
                <div style={{
                    display: "flex",
                    gap: "20px",
                    marginBottom: "25px",
                    flexWrap: "wrap"
                }}>
                    <div style={{
                        background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
                        border: "1px solid #bbf7d0",
                        borderRadius: "10px",
                        padding: "18px 28px",
                        minWidth: "200px"
                    }}>
                        <div style={{ fontSize: "13px", color: "#16a34a", fontWeight: 600, marginBottom: "4px" }}>
                            Total Allocated (Pieces)
                        </div>
                        <div style={{ fontSize: "32px", fontWeight: 700, color: "#15803d" }}>
                            {totalReadyToMove.toLocaleString()}
                        </div>
                    </div>
                    <div style={{
                        background: "linear-gradient(135deg, #eff6ff, #dbeafe)",
                        border: "1px solid #bfdbfe",
                        borderRadius: "10px",
                        padding: "18px 28px",
                        minWidth: "200px"
                    }}>
                        <div style={{ fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "4px" }}>
                            Warehouse-Product Rows
                        </div>
                        <div style={{ fontSize: "32px", fontWeight: 700, color: "#1d4ed8" }}>
                            {filtered.length}
                        </div>
                    </div>
                </div>
            )}

            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ marginBottom: "20px", maxWidth: "400px" }}>
                    <input
                        type="text"
                        placeholder="Search by product or warehouse..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="form-input"
                    />
                </div>

                {loading ? (
                    <p>Loading ready-to-move stock...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
                        {search ? "No results found." : "No items are currently in ready-to-move state."}
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Product Model</th>
                                <th>ASIN</th>
                                <th>Warehouse</th>
                                <th>Stock in Hand (Pieces)</th>
                                <th>Ready To Move (Pieces)</th>
                                <th>Last Updated</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((item) => (
                                <tr key={item.id}>
                                    <td style={{ fontWeight: 500, color: "#0f172a" }}>
                                        {item.internal_model}
                                    </td>
                                    <td style={{ fontFamily: "monospace", fontSize: "13px", color: "#475569" }}>
                                        {item.amazon_asin || "—"}
                                    </td>
                                    <td>
                                        {item.warehouse_name}
                                        <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "6px" }}>
                                            ({item.warehouse_code})
                                        </span>
                                    </td>
                                    <td style={{ color: "#374151" }}>
                                        {item.quantity?.toLocaleString()}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontWeight: 700,
                                            color: "#15803d",
                                            background: "#f0fdf4",
                                            padding: "3px 10px",
                                            borderRadius: "6px",
                                            border: "1px solid #bbf7d0"
                                        }}>
                                            {item.ready_to_move?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td style={{ fontSize: "13px", color: "#64748b" }}>
                                        {formatDate(item.updated_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default ReadyToMove;
