import React, { useState, useEffect } from "react";
import { getPurchaseOrders } from "../services/poService";
import "../css/admin.css";
import "../css/dashboard.css";

function POHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [platformFilter, setPlatformFilter] = useState("");
    const [search, setSearch] = useState("");

    useEffect(() => {
        fetchOrders();
    }, [platformFilter]);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const res = await getPurchaseOrders(platformFilter);
            setOrders(res.data.data);
            setError("");
        } catch (err) {
            console.error("Error fetching PO history:", err);
            setError("Failed to load purchase order history.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (iso) => {
        const d = new Date(iso);
        return d.toLocaleString("en-IN", {
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    };

    const getStatusBadge = (status) => {
        if (status === "APPROVED") return <span className="badge badge-success">Approved</span>;
        if (status === "DRAFT") return <span className="badge badge-warning" style={{ background: "#fef3c7", color: "#92400e" }}>Draft</span>;
        if (status === "CANCELLED") return <span className="badge badge-danger">Cancelled</span>;
        return <span className="badge">{status}</span>;
    };

    const filtered = orders.filter((o) =>
        o.po_number?.toLowerCase().includes(search.toLowerCase()) ||
        o.uploader_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Purchase Order History</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ display: "flex", gap: "15px", marginBottom: "20px", flexWrap: "wrap" }}>
                    <div style={{ flex: 1, maxWidth: "250px" }}>
                        <select
                            value={platformFilter}
                            onChange={(e) => setPlatformFilter(e.target.value)}
                            className="form-select"
                        >
                            <option value="">All Platforms</option>
                            <option value="AMAZON">Amazon</option>
                            <option value="BLINKIT">Blinkit</option>
                            <option value="ZEPTO">Zepto</option>
                        </select>
                    </div>
                    <div style={{ flex: 1, maxWidth: "350px" }}>
                        <input
                            type="text"
                            placeholder="Search by PO number or uploader..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="form-input"
                        />
                    </div>
                </div>

                {loading ? (
                    <p>Loading orders...</p>
                ) : filtered.length === 0 ? (
                    <p style={{ color: "#64748b", textAlign: "center", padding: "40px 0" }}>
                        {search || platformFilter ? "No matching orders found." : "No purchase orders found."}
                    </p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>PO Number</th>
                                <th>Platform</th>
                                <th>Status</th>
                                <th>Uploaded By</th>
                                <th>Total Quantity</th>
                                <th>Created At</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((order) => (
                                <tr key={order.id}>
                                    <td style={{ fontWeight: 600, fontFamily: "monospace", letterSpacing: "0.5px" }}>
                                        {order.po_number}
                                    </td>
                                    <td>
                                        <span style={{
                                            display: "inline-block",
                                            padding: "3px 10px",
                                            borderRadius: "12px",
                                            fontSize: "12px",
                                            fontWeight: 600,
                                            background: order.platform === "AMAZON" ? "#fff7ed" : order.platform === "BLINKIT" ? "#f0fdf4" : "#faf5ff",
                                            color: order.platform === "AMAZON" ? "#c2410c" : order.platform === "BLINKIT" ? "#15803d" : "#7c3aed"
                                        }}>
                                            {order.platform}
                                        </span>
                                    </td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td>{order.uploader_name || "—"}</td>
                                    <td style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b" }}>
                                        {order.total_quantity || 0} pcs <span style={{ fontWeight: 400, color: "#64748b", fontSize: "12px" }}>({order.items_count || 0} items)</span>
                                    </td>
                                    <td style={{ fontSize: "13px", color: "#475569" }}>
                                        {formatDate(order.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                <div style={{ marginTop: "15px", fontSize: "13px", color: "#94a3b8" }}>
                    Showing {filtered.length} of {orders.length} orders
                </div>
            </div>
        </div>
    );
}

export default POHistory;
