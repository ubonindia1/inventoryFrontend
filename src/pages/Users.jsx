import React, { useEffect, useState } from "react";
import { getUsers, createUser, updateUser, resetPassword } from "../services/userManageService";
import { getWarehouses } from "../services/warehouseService";
import "../css/admin.css";
import "../css/dashboard.css";

function Users() {
    const [users, setUsers] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Add/Edit Modal
    const [showModal, setShowModal] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [formData, setFormData] = useState({
        full_name: "",
        username: "",
        password: "",
        role: "STAFF",
        warehouse_id: "",
        can_upload_po: false,
        can_download_reports: false,
        can_manage_products: false,
        inventory_warehouse_access: []
    });


    // Reset Password Modal
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetUserId, setResetUserId] = useState(null);
    const [newPassword, setNewPassword] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
            const [usersRes, warehousesRes] = await Promise.all([
                getUsers(),
                getWarehouses()
            ]);
            setUsers(usersRes.data.data);
            setWarehouses(warehousesRes.data.data);
            setError("");
        } catch (err) {
            console.error("Load users data error:", err);
            setError("Failed to fetch users and warehouses.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const openAddModal = () => {
        setCurrentUser(null);
        setFormData({
            full_name: "",
            username: "",
            password: "",
            role: "STAFF",
            warehouse_id: warehouses.find(w => w.is_active)?.id || "",
            can_upload_po: false,
            can_download_reports: false,
            can_manage_products: false,
            inventory_warehouse_access: []
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openEditModal = (user) => {
        setCurrentUser(user);
        setFormData({
            full_name: user.full_name,
            username: user.username,
            password: "",
            role: user.role,
            warehouse_id: user.warehouse_id || "",
            can_upload_po: user.can_upload_po || false,
            can_download_reports: user.can_download_reports || false,
            can_manage_products: user.can_manage_products || false,
            inventory_warehouse_access: user.inventory_warehouse_access || []
        });
        setError("");
        setSuccess("");
        setShowModal(true);
    };

    const openResetModal = (user) => {
        setResetUserId(user.id);
        setNewPassword("");
        setError("");
        setSuccess("");
        setShowResetModal(true);
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        
        if (name === "role" && value === "ADMIN") {
            setFormData((prev) => ({
                ...prev,
                role: value,
                warehouse_id: "",
                can_upload_po: true,
                can_download_reports: true,
                can_manage_products: true,
                inventory_warehouse_access: []
            }));
        } else if (name === "inventory_warehouse_access") {
            // Toggle warehouse ID in the array
            const warehouseId = parseInt(value);
            setFormData((prev) => {
                const current = prev.inventory_warehouse_access || [];
                const next = current.includes(warehouseId)
                    ? current.filter(id => id !== warehouseId)
                    : [...current, warehouseId];
                return { ...prev, inventory_warehouse_access: next };
            });
        } else {
            setFormData((prev) => ({
                ...prev,
                [name]: type === "checkbox" ? checked : value
            }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const {
            full_name, username, password, role, warehouse_id,
            can_upload_po, can_download_reports, can_manage_products
        } = formData;

        if (!full_name.trim() || !username.trim() || !role) {
            setError("Name, username, and role are required.");
            return;
        }

        if (!currentUser && !password.trim()) {
            setError("Password is required for new users.");
            return;
        }

        const { inventory_warehouse_access } = formData;
        const payload = {
            full_name,
            username,
            role,
            warehouse_id: role === "ADMIN" ? null : (warehouse_id ? parseInt(warehouse_id) : null),
            can_upload_po,
            can_download_reports,
            can_manage_products,
            inventory_warehouse_access: role === "ADMIN" ? [] : (inventory_warehouse_access || []),
            is_active: currentUser ? currentUser.is_active : true
        };

        if (!currentUser) {
            payload.password = password;
        }

        try {
            if (currentUser) {
                await updateUser(currentUser.id, payload);
                setSuccess("User updated successfully.");
            } else {
                await createUser(payload);
                setSuccess("User created successfully.");
            }
            setShowModal(false);
            loadData();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Submit user error:", err);
            setError(err.response?.data?.message || "Failed to save user.");
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!newPassword.trim()) {
            setError("Password cannot be empty.");
            return;
        }

        try {
            await resetPassword(resetUserId, newPassword);
            setSuccess("Password reset successfully.");
            setShowResetModal(false);
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Reset password error:", err);
            setError("Failed to reset password.");
        }
    };

    const handleToggleStatus = async (user) => {
        // Prevent self-deactivation (helpful guardrail)
        const loggedInUser = JSON.parse(localStorage.getItem("user"));
        if (loggedInUser && loggedInUser.id === user.id) {
            setError("You cannot deactivate your own account.");
            setTimeout(() => setError(""), 3000);
            return;
        }

        try {
            const nextStatus = !user.is_active;
            await updateUser(user.id, {
                ...user,
                is_active: nextStatus
            });
            setSuccess(`User account ${nextStatus ? "activated" : "deactivated"} successfully.`);
            loadData();
            setTimeout(() => setSuccess(""), 3000);
        } catch (err) {
            console.error("Toggle user status error:", err);
            setError("Failed to update user status.");
        }
    };

    const getPermissionsSummary = (u) => {
        if (u.role === "ADMIN") return "All Permissions (Admin)";
        
        const list = [];
        if (u.can_upload_po) list.push("Upload PO");
        if (u.can_download_reports) list.push("Reports");
        if (u.can_manage_products) list.push("Products");

        const invAccess = u.inventory_warehouse_access;
        if (invAccess && invAccess.length > 0) {
            const wNames = invAccess.map(id => {
                const w = warehouses.find(wh => wh.id === id);
                return w ? w.warehouse_name : `#${id}`;
            }).join(", ");
            list.push(`Inventory: ${wNames}`);
        }

        return list.length === 0 ? "No special permissions" : list.join(" · ");
    };

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>User Management</h2>
                <button onClick={openAddModal} className="btn btn-primary">
                    + Add User
                </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <div className="section" style={{ marginTop: 0 }}>
                {loading ? (
                    <p>Loading users...</p>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Username</th>
                                <th>Role</th>
                                <th>Warehouse</th>
                                <th>Permissions</th>
                                <th>Status</th>
                                <th style={{ textAlign: "right" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: "center", color: "#64748b" }}>
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                users.map((u) => (
                                    <tr key={u.id}>
                                        <td>
                                            <div style={{ fontWeight: 500, color: "#0f172a" }}>{u.full_name}</div>
                                        </td>
                                        <td>{u.username}</td>
                                        <td>
                                            <span style={{
                                                fontSize: "11px", fontWeight: "600", color: "#475569",
                                                background: "#f1f5f9", padding: "4px 8px", borderRadius: "4px"
                                            }}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td>{u.role === "ADMIN" ? "All Warehouses" : (u.warehouse_name || "Unassigned")}</td>
                                        <td style={{ fontSize: "13px", color: "#475569", maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                            {getPermissionsSummary(u)}
                                        </td>
                                        <td>
                                            <span className={`badge ${u.is_active ? "badge-success" : "badge-danger"}`}>
                                                {u.is_active ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: "right" }}>
                                            <button
                                                onClick={() => openEditModal(u)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ marginRight: "6px" }}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => openResetModal(u)}
                                                className="btn btn-secondary btn-sm"
                                                style={{ marginRight: "6px" }}
                                            >
                                                Reset PW
                                            </button>
                                            <button
                                                onClick={() => handleToggleStatus(u)}
                                                className={`btn btn-sm ${u.is_active ? "btn-danger" : "btn-primary"}`}
                                            >
                                                {u.is_active ? "Deactivate" : "Activate"}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Add / Edit User Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>{currentUser ? "Edit User" : "Add User"}</h3>
                            <button onClick={() => setShowModal(false)} className="modal-close">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="full_name">Full Name</label>
                                <input
                                    type="text"
                                    id="full_name"
                                    name="full_name"
                                    value={formData.full_name}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="e.g. John Doe"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="username">Username</label>
                                <input
                                    type="text"
                                    id="username"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleFormChange}
                                    className="form-input"
                                    placeholder="e.g. johndoe"
                                    required
                                />
                            </div>

                            {!currentUser && (
                                <div className="form-group">
                                    <label htmlFor="password">Password</label>
                                    <input
                                        type="password"
                                        id="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleFormChange}
                                        className="form-input"
                                        placeholder="Enter password"
                                        required
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label htmlFor="role">Role</label>
                                <select
                                    id="role"
                                    name="role"
                                    value={formData.role}
                                    onChange={handleFormChange}
                                    className="form-select"
                                >
                                    <option value="STAFF">STAFF</option>
                                    <option value="PO_OPERATOR">PO OPERATOR</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>

                            {formData.role !== "ADMIN" && (
                                <div className="form-group">
                                    <label htmlFor="warehouse_id">Assigned Warehouse</label>
                                    <select
                                        id="warehouse_id"
                                        name="warehouse_id"
                                        value={formData.warehouse_id}
                                        onChange={handleFormChange}
                                        className="form-select"
                                        required
                                    >
                                        <option value="" disabled>Select a warehouse</option>
                                        {warehouses.filter(w => w.is_active).map(w => (
                                            <option key={w.id} value={w.id}>
                                                {w.warehouse_name} ({w.warehouse_code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {formData.role !== "ADMIN" && (
                                <div className="form-group">
                                    <label>Permissions</label>
                                    <div className="checkbox-group">
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="can_upload_po"
                                                checked={formData.can_upload_po}
                                                onChange={handleFormChange}
                                            />
                                            Upload PO
                                        </label>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="can_download_reports"
                                                checked={formData.can_download_reports}
                                                onChange={handleFormChange}
                                            />
                                            Download Reports
                                        </label>
                                        <label className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                name="can_manage_products"
                                                checked={formData.can_manage_products}
                                                onChange={handleFormChange}
                                            />
                                            Manage Products
                                        </label>
                                    </div>
                                </div>
                            )}

                            {formData.role !== "ADMIN" && (
                                <div className="form-group">
                                    <label style={{ marginBottom: "8px" }}>
                                        📦 Inventory View Access
                                        <span style={{ fontWeight: 400, color: "#94a3b8", marginLeft: "6px", fontSize: "12px" }}>
                                            (Select warehouses this user can view in Inventory)
                                        </span>
                                    </label>
                                    {warehouses.filter(w => w.is_active).length === 0 ? (
                                        <p style={{ fontSize: "13px", color: "#94a3b8" }}>No active warehouses.</p>
                                    ) : (
                                        <div className="checkbox-group">
                                            {warehouses.filter(w => w.is_active).map(w => (
                                                <label key={w.id} className="checkbox-label" style={{ border: (formData.inventory_warehouse_access || []).includes(w.id) ? "1px solid #818cf8" : "1px solid #e2e8f0", background: (formData.inventory_warehouse_access || []).includes(w.id) ? "#eef2ff" : "#f8fafc" }}>
                                                    <input
                                                        type="checkbox"
                                                        name="inventory_warehouse_access"
                                                        value={w.id}
                                                        checked={(formData.inventory_warehouse_access || []).includes(w.id)}
                                                        onChange={handleFormChange}
                                                    />
                                                    {w.warehouse_name} ({w.warehouse_code})
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}



                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    {currentUser ? "Save Changes" : "Create User"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Reset Password</h3>
                            <button onClick={() => setShowResetModal(false)} className="modal-close">
                                &times;
                            </button>
                        </div>
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group">
                                <label htmlFor="newPassword">New Password</label>
                                <input
                                    type="password"
                                    id="newPassword"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="form-input"
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    onClick={() => setShowResetModal(false)}
                                    className="btn btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Reset Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Users;
