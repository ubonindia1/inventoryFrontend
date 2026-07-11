import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import "../css/layout.css";

function MainLayout({ children }) {
    return (
        <div className="main-layout">
            <Sidebar />
            <div className="content-area">
                <Header />
                <div className="page-content">
                    {children || <Outlet />}
                </div>
            </div>
        </div>
    );
}

export default MainLayout;