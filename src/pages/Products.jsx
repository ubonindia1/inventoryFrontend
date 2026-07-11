import { useEffect, useState } from "react";
import API from "../services/api";

function Products() {

    const [products, setProducts] = useState([]);
    const [search, setSearch] = useState("");

    const loadProducts = async () => {

        try {

            const res = await API.get("/products");

            setProducts(res.data.data);

        } catch (err) {

            console.log(err);

        }

    };

    useEffect(() => {

        loadProducts();

    }, []);

    const searchProducts = async (value) => {

        setSearch(value);

        if (value === "") {

            loadProducts();
            return;

        }

        try {

            const res = await API.get(
                `/products/search?search=${value}`
            );

            setProducts(res.data.data);

        } catch (err) {

            console.log(err);

        }

    };

    return (

        <div className="page">

            <h2>Products</h2>

            <input
                type="text"
                placeholder="Search Internal Model..."
                value={search}
                onChange={(e) => searchProducts(e.target.value)}
            />

            <br /><br />

            <table border="1" cellPadding="8">

                <thead>

                    <tr>

                        <th>Internal Model</th>
                        <th>ASIN</th>
                        <th>Blinkit PID</th>
                        <th>Zepto SKU</th>
                        <th>Stock</th>
                        <th>Ready</th>

                    </tr>

                </thead>

                <tbody>

                    {

                        products.map((item) => (

                            <tr key={item.id}>

                                <td>{item.internal_model}</td>
                                <td>{item.amazon_asin}</td>
                                <td>{item.blinkit_pid}</td>
                                <td>{item.zepto_sku}</td>
                                <td>{item.current_stock}</td>
                                <td>{item.ready_to_move}</td>

                            </tr>

                        ))

                    }

                </tbody>

            </table>

        </div>

    );

}

export default Products;