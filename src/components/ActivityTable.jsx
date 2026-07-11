function ActivityTable() {

    return (

        <div className="section">

            <h2>Recent Activity</h2>

            <table>

                <thead>

                    <tr>

                        <th>Date</th>
                        <th>Product</th>
                        <th>Type</th>
                        <th>Quantity</th>

                    </tr>

                </thead>

                <tbody>

                    <tr>

                        <td>-</td>
                        <td>No Activity</td>
                        <td>-</td>
                        <td>-</td>

                    </tr>

                </tbody>

            </table>

        </div>

    );

}

export default ActivityTable;