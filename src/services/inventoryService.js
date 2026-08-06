import API from "./api";

// Get live warehouse inventory
export const getWarehouseInventory = async (warehouseId) => {
    return API.get(`/inventory/warehouse/${warehouseId || 'all'}`);
};

// Save a new stock entry
export const saveStockEntry = async (entryData) => {
    return API.post("/inventory/stock-entry", entryData);
};

// Shift stock from one warehouse to another
export const shiftStock = async (shiftData) => {
    return API.post("/inventory/shift-stock", shiftData);
};

// Mark ready-to-move stock as dispatched
export const markDispatched = async (dispatchData) => {
    return API.post("/inventory/mark-dispatched", dispatchData);
};

// Get current user's own stock transaction history
export const getMyHistory = async () => {
    return API.get("/inventory/my-history");
};

// Get all ready-to-move stock items
export const getReadyToMove = async () => {
    return API.get("/inventory/ready-to-move");
};

// Admin direct inventory quantity update
export const updateStockQuantity = async (updateData) => {
    return API.post("/inventory/stock-entry", {
        warehouse_id: updateData.warehouse_id,
        product_id: updateData.product_id,
        boxes: 0,
        quantity: updateData.new_quantity,
        type: 'SET',
        remarks: updateData.remarks
    });
};
