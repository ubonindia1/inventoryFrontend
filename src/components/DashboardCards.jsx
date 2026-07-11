import React from "react";
import Card from "./card";

function DashboardCards({ dashboard }) {
    return (
        <div className="cards">
            <Card
                title="Total Products"
                value={dashboard.totalProducts}
            />

            <Card
                title="Stock In Hand"
                value={dashboard.stockInHand}
            />

            <Card
                title="Ready To Move"
                value={dashboard.readyToMove}
            />

            <Card
                title="Pending PO"
                value={dashboard.pendingPO}
            />
        </div>
    );
}

export default DashboardCards;