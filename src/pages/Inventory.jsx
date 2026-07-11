import React, { useState, useEffect } from "react";
import { getWarehouseInventory } from "../services/inventoryService";
import { getWarehouses } from "../services/warehouseService";
import "../css/admin.css";
import "../css/dashboard.css";

function Inventory() {
    const [user, setUser] = useState(null);
    const [warehouses, setWarehouses] = useState([]);
    const [inventory, setInventory] = useState([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem("user"));
        if (storedUser) {
            setUser(storedUser);
            if (storedUser.role !== "ADMIN") {
                setSelectedWarehouseId(storedUser.warehouse_id || "all");
            }
        }

        const fetchWarehouses = async () => {
            if (storedUser && storedUser.role === "ADMIN") {
                try {
                    const res = await getWarehouses();
                    setWarehouses(res.data.data.filter(w => w.is_active));
                } catch (err) {
                    console.error("Error fetching warehouses:", err);
                }
            }
        };

        fetchWarehouses();
    }, []);

    const fetchInventory = async () => {
        try {
            setLoading(true);
            const res = await getWarehouseInventory(selectedWarehouseId);
            setInventory(res.data.data);
            setError("");
        } catch (err) {
            console.error("Error fetching inventory:", err);
            setError("Failed to load inventory data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedWarehouseId) {
            fetchInventory();
        }
    }, [selectedWarehouseId]);

    const handleWarehouseChange = (e) => {
        setSelectedWarehouseId(e.target.value);
    };

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
    };

    const filteredInventory = inventory.filter((item) =>
        item.internal_model.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Warehouse Inventory</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="section" style={{ marginTop: 0 }}>
                <div style={{ display: "flex", gap: "15px", marginBottom: "20px" }}>
                    {user && user.role === "ADMIN" && (
                        <div style={{ flex: 1, maxWidth: "300px" }}>
                            <select
                                value={selectedWarehouseId}
                                onChange={handleWarehouseChange}
                                className="form-select"
                            >
                                <option value="all">All Warehouses</option>
                                {warehouses.map((w) => (
                                    <option key={w.id} value={w.id}>
                                        {w.warehouse_name} ({w.warehouse_code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    <div style={{ flex: 1, maxWidth: "400px" }}>
                        <input
                            type="text"
                            placeholder="Search by Product Model..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            className="form-input"
                        />
                    </div>
                </div>

                {loading ? (
                    <p>Loading inventory...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Product Model</th>
                                <th>Total Quantity (Pieces)</th>
                                <th>Ready To Move (Pieces)</th>
                                <th>Total In Hand (Pieces)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInventory.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>
                                        No inventory found.
                                    </td>
                                </tr>
                            ) : (
                                filteredInventory.map((item) => {
                                    const isLowStock = item.quantity < 50;
                                    return (
                                        <tr key={item.id} style={isLowStock ? { backgroundColor: "#fef2f2" } : {}}>
                                            <td style={{ fontWeight: 500, color: "#0f172a" }}>
                                                {item.internal_model}
                                                {isLowStock && (
                                                    <span className="badge badge-danger" style={{ marginLeft: "10px" }}>
                                                        Low Stock
                                                    </span>
                                                )}
                                            </td>
                                            <td style={isLowStock ? { color: "#b91c1c", fontWeight: "600" } : {}}>
                                                {item.quantity}
                                            </td>
                                            <td>{item.ready_to_move || 0}</td>
                                            <td style={{ fontWeight: 700, color: "#0369a1" }}>
                                                {(Number(item.quantity) || 0) + (Number(item.ready_to_move) || 0)}
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

export default Inventory;
