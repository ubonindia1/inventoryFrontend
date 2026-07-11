import React, { useState } from "react";
import { uploadPO, approvePO } from "../services/poService";
import "../css/admin.css";
import "../css/dashboard.css";

function AmazonPO() {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isAdmin = user.role === "ADMIN";

    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Draft PO Preview state
    const [previewData, setPreviewData] = useState(null);
    const [approving, setApproving] = useState(false);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) {
            setError("Please select an Excel file to upload.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setSuccess("");
            setPreviewData(null);

            const res = await uploadPO("AMAZON", file);
            setSuccess(`Successfully parsed ${res.data.data.matched_items.length} items.`);
            setPreviewData(res.data.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to upload and parse PO file.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!previewData || !previewData.po_id) return;
        
        try {
            setApproving(true);
            setError("");
            await approvePO(previewData.po_id);
            setSuccess(`Purchase Order ${previewData.po_number} has been approved and stock allocated.`);
            
            // Clear preview after success
            setTimeout(() => {
                setPreviewData(null);
                setFile(null);
            }, 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Failed to approve PO.");
        } finally {
            setApproving(false);
        }
    };

    return (
        <div className="page-content">
            <div className="admin-header">
                <h2>Amazon Purchase Orders</h2>
            </div>

            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            {!previewData && (
                <div className="section" style={{ marginTop: 0, maxWidth: "600px" }}>
                    <h3>Upload New PO</h3>
                    <form onSubmit={handleUpload}>
                        <div className="form-group">
                            <label>Excel File (ASIN, Quantity)</label>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                onChange={handleFileChange} 
                                className="form-input" 
                            />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
                            {loading ? "Parsing File..." : "Upload and Preview"}
                        </button>
                    </form>
                </div>
            )}

            {previewData && (
                <div className="section" style={{ marginTop: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                        <h3>PO Review: {previewData.po_number}</h3>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleApprove} 
                            disabled={approving || previewData.matched_items.length === 0}
                        >
                            {approving ? "Allocating Stock..." : "Approve & Allocate Stock"}
                        </button>
                    </div>

                    {previewData.unmatched_items.length > 0 && (
                        <div className="alert alert-error" style={{ marginBottom: "20px" }}>
                            <strong>Warning:</strong> {previewData.unmatched_items.length} items could not be mapped to an internal ASIN and will be ignored.
                        </div>
                    )}

                    <table>
                        <thead>
                            <tr>
                                <th>ASIN</th>
                                <th>Internal Model</th>
                                <th>Required Qty</th>
                                <th>Available Global Stock</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {previewData.matched_items.length === 0 ? (
                                <tr><td colSpan="5" style={{ textAlign: "center" }}>No matched items found.</td></tr>
                            ) : (
                                previewData.matched_items.map((item, index) => (
                                    <tr key={index} style={item.status === "Shortage" ? { backgroundColor: "#fef2f2" } : {}}>
                                        <td>{item.identifier}</td>
                                        <td style={{ fontWeight: 500 }}>{item.internal_model}</td>
                                        <td>{item.required_quantity}</td>
                                        <td>{item.status === "Shortage" ? item.available_stock : "—"}</td>
                                        <td>
                                            {item.status === "Shortage" ? (
                                                <span className="badge badge-danger">Shortage</span>
                                            ) : (
                                                <span className="badge badge-success">Ready</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div style={{ marginTop: "20px" }}>
                        <button className="btn btn-secondary" onClick={() => {
                            setPreviewData(null);
                            setSuccess("");
                        }}>
                            Cancel / Upload Different File
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AmazonPO;
