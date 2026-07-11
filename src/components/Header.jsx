import React from "react";
import { useNavigate } from "react-router-dom";
import { getUser, logout } from "../utils/auth";
import "../css/header.css";

function Header() {
    const navigate = useNavigate();
    const user = getUser();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    return (
        <div className="header">
            <h2>Inventory Management</h2>
            <div className="header-right">
                <span className="user-info">
                    {user ? `${user.name} (${user.role})` : "Guest"}
                </span>
                <button onClick={handleLogout} className="logout-btn">
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Header;