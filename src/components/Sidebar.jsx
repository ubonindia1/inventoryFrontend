import React from "react";
import { NavLink } from "react-router-dom";
import { getUser } from "../utils/auth";
import "../css/sidebar.css";

function Sidebar() {
    const user = getUser();
    const role = user?.role ? user.role.toUpperCase().replace(/\s+/g, "_") : "";

    const getMenuItems = () => {
        switch (role) {
            case "ADMIN":
                return [
                    { path: "/dashboard", label: "Dashboard" },
                    { path: "/products", label: "Products" },
                    { path: "/inventory", label: "Inventory" },
                    { path: "/ready-to-move", label: "Ready To Move" },
                    { path: "/purchase-orders", label: "Purchase Orders" },
                    { path: "/available-quantity", label: "Available Quantity" },
                    { path: "/users", label: "Users" },
                    { path: "/warehouses", label: "Warehouses" },
                    { path: "/reports", label: "Reports" },
                    { path: "/settings", label: "Settings" }
                ];
            case "STAFF": {
                const items = [
                    { path: "/dashboard", label: "Dashboard" },
                    { path: "/inventory", label: "Inventory" },
                    { path: "/stock-entry", label: "Stock Entry" },
                    { path: "/available-quantity", label: "Available Quantity" },
                    { path: "/my-history", label: "My History" }
                ];
                if (user?.can_upload_po) {
                    items.splice(3, 0, { path: "/purchase-orders", label: "Purchase Orders" });
                }
                return items;
            }
            case "PO_OPERATOR":
                return [
                    { path: "/dashboard", label: "Dashboard" },
                    { path: "/inventory", label: "Inventory" },
                    { path: "/purchase-orders", label: "Purchase Orders" },
                    { path: "/available-quantity", label: "Available Quantity" },
                    { path: "/po-history", label: "PO History" },
                    { path: "/reports", label: "Reports" }
                ];
            default:
                return [];
        }
    };

    const menuItems = getMenuItems();

    return (
        <div className="sidebar">
            <h2>Inventory ERP</h2>
            <ul>
                {menuItems.map((item) => (
                    <li key={item.path}>
                        <NavLink 
                            to={item.path} 
                            className={({ isActive }) => isActive ? "active" : ""}
                        >
                            {item.label}
                        </NavLink>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default Sidebar;