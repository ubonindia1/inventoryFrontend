import React, { useEffect, useState } from "react";
import { getWarehouses, createWarehouse, updateWarehouse } from "../services/warehouseService";
import "../css/admin.css";
import "../css/dashboard.css";

function Warehouses() {
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [currentWarehouse, setCurrentWarehouse] = useState(null);
    const [formData, setFormData] = useState({
        warehouse_name: "",
        warehouse_code: ""
    });

    const loadData = async () => {
        try {
            setLoading(true);
            const res = await getWarehouses();
            setWarehouses(res.data.data);
            setError("");
        } catch (err) {
            console.error("Load warehouses error:", err);
            setError("Failed to fetch warehouses. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openAddModal = () => {
        setCurrentWarehouse(null);
        setFormData({ warehouse_name: "", warehouse_code: "" });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openEditModal = (warehouse) => {
        setCurrentWarehouse(warehouse);
        setFormData({
            warehouse_name: warehouse.warehouse_name,
            warehouse_code: warehouse.warehouse_code
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const { warehouse_name, warehouse_code } = formData;

        if (!warehouse_name.trim() || !warehouse_code.trim()) {
            setError("All fields are required.");
            return;
        }

        try {
            if (currentWarehouse) {
                // Update
                await updateWarehouse(currentWarehouse.id, {
                    warehouse_name,
                    warehouse_code,
                    is_active: currentWarehouse.is_active
                });
                setSuccess("Warehouse updated successfully.");
            } else {
                // Create
                await createWarehouse({
                    warehouse_name,
                    warehouse_code
                });
                setSuccess("Warehouse created successfully.");
            }
            setShowModal(false);
            loadData();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Submit warehouse error:", err);
            setError(err.response?.data?.message || "Failed to save warehouse.");
        }
    };

    const handleToggleStatus = async (warehouse) => {
        try {
            const nextStatus = !warehouse.is_active;
            await updateWarehouse(warehouse.id, {
                warehouse_name: warehouse.warehouse_name,
                warehouse_code: warehouse.warehouse_code,
                is_active: nextStatus
            });
            setSuccess(`Warehouse ${nextStatus ? "activated" : "deactivated"} successfully.`);
            loadData();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Toggle status error:", err);
            setError("Failed to update warehouse status.");
        }
    };

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Warehouse Management</h2>
                <button onClick={openAddModal} className="btn btn-primary">
                    + Add Warehouse
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="section" style={{ marginTop: 0 }}>
                {loading ? (
                    <p>Loading warehouses...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Code</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {warehouses.length === 0 ? (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: "center", color: "#64748b" }}>
                                        No warehouses found.
                                    </td>
                                </tr>
                            ) : (
                                warehouses.map((w) => (
                                    <tr key={w.id}>
                                        <td style={{ fontWeight: 500, color: "#0f172a" }}>
                                            {w.warehouse_name}
                                        </td>
                                        <td>{w.warehouse_code}</td>
                                        <td>
                                            <span className={`badge ${w.is_active ? "badge-success" : "badge-danger"}`}>
                                                {w.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                onClick={() => openEditModal(w)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ marginRight: "8px" }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(w)}
                                                className={`btn btn-sm ${w.is_active ? "btn-danger" : "btn-primary"}`}
                                            >
                                                {w.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{currentWarehouse ? "Edit Warehouse" : "Add Warehouse"}</h3>
                            <button onClick={() => setShowModal(false)} className="modal-close">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="warehouse_name">Warehouse Name</label>
                                <input
                                    type="text"
                                    id="warehouse_name"
                                    name="warehouse_name"
                                    value={formData.warehouse_name}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="e.g. Mumbai, Delhi"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="warehouse_code">Warehouse Code</label>
                                <input
                                    type="text"
                                    id="warehouse_code"
                                    name="warehouse_code"
                                    value={formData.warehouse_code}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="e.g. BOM, DEL"
                                    required
                                    maxLength="20"
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {currentWarehouse ? "Save Changes" : "Create Warehouse"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Warehouses;
