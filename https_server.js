// const fs = require('fs');
// const https = require('https');
const express = require('express');
const Database = require("./db");
const fetch = require("node-fetch");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = new Database();
const PORT = 3000;

app.get("/", async (req, res) => {
    res.sendFile("delivery_orders.html", { root: "./public" });
});

app.get("/online-orders", async (req, res) => {

    try {

        const pending = await db.fetch_all_data(
            "SELECT * FROM food_order WHERE order_type='ONLINE' AND order_status ='PICKED'"
        );

        const picked = await db.fetch_all_data(
            "SELECT * FROM food_order WHERE order_type='ONLINE' AND order_status='DELIVERY_PICKED'"
        );

        res.json({
            pending,
            picked
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: "Failed to fetch orders" });

    }

});

app.post("/start-delivery", async (req, res) => {

    const { order_id } = req.body;

    try {

        await db.update_data(
            "UPDATE food_order SET order_status='DELIVERY_PICKED' WHERE order_id=$1",
            [order_id]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: "Failed to start delivery" });

    }

});

app.get("/order-status/:order_id", async (req, res) => {

    const order_id = req.params.order_id;

    try {

        const result = await db.fetch_data(
            "SELECT order_status FROM food_order WHERE order_id=$1",
            [order_id]
        );

        res.json({ status: result[0].order_status });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: "Failed to fetch status" });

    }

});

// app.get("/destination/:order_id", async (req, res) => {

//     console.log("Fetching destination for order_id:", req.params.order_id);
//     const order_id = req.params.order_id;

//     try {

//         const result = await db.fetch_data(
//             `SELECT delivery_address, customer_lat, customer_lng
//              FROM food_order
//              WHERE order_id=$1`,
//             [order_id]
//         );

//         if (!result || result.length === 0) {
//             return res.status(404).json({ error: "Order not found" });
//         }

//         let address = result[0].delivery_address;
//         let lat = result[0].customer_lat;
//         let lng = result[0].customer_lng;

//         // If coordinates already exist → return them
//         if (lat && lng) {
//             return res.json({
//                 delivery_address: address,
//                 customer_lat: lat,
//                 customer_lng: lng
//             });
//         }

//         // Otherwise convert address → coordinates
//         const geo = await geocodeAddress(address);
//         console.log("Geocode result:", geo);

//         if (!geo) {
//             return res.json({
//                 delivery_address: address,
//                 customer_lat: null,
//                 customer_lng: null
//             });
//         }

//         lat = geo.lat;
//         lng = geo.lng;

//         console.log("Coordinates found:", lat, lng);
//         // Save coordinates in DB
//         await db.update_data(
//             `UPDATE food_order
//              SET customer_lat=$1, customer_lng=$2
//              WHERE order_id=$3`,
//             [lat, lng, order_id]
//         );

//         res.json({
//             delivery_address: address,
//             customer_lat: lat,
//             customer_lng: lng
//         });

//     } catch (err) {

//         console.error(err);
//         res.status(500).json({ error: "Failed to fetch destination" });

//     }

// });

app.get("/destination/:order_id", async (req, res) => {

    console.log("Fetching destination for order_id:", req.params.order_id);

    const order_id = req.params.order_id;

    try {

        const result = await db.fetch_data(
            `SELECT delivery_address
             FROM food_order
             WHERE order_id=$1`,
            [order_id]
        );

        if (!result || result.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }

        const address = result[0].delivery_address;

        if (!address) {
            return res.json({
                delivery_address: null,
                customer_lat: null,
                customer_lng: null
            });
        }

        // address format: "12.856301,77.676331"
        const parts = address.split(",");

        const lat = parseFloat(parts[0]);
        const lng = parseFloat(parts[1]);

        console.log("Destination coordinates:", lat, lng);

        res.json({
            delivery_address: address,
            customer_lat: lat,
            customer_lng: lng
        });

    } catch (err) {

        console.error(err);

        res.status(500).json({ error: "Failed to fetch destination" });

    }

});


async function geocodeAddress(address) {
    console.log("Geocoding address:", address);
    try {

        const cleaned = address
            .replace(/[0-9\/\-]+/g, "")   // remove house numbers
            .replace(/,+/g, ",")          // remove duplicate commas
            .replace(/^,|,$/g, "")        // remove starting or ending comma
            .trim();

        const url =
            "https://nominatim.openstreetmap.org/search?format=json&q=" +
            encodeURIComponent(cleaned + ", Tamil Nadu, India");

        console.log("Cleaned address:", cleaned);
        console.log("Geocode URL:", url);

        const response = await fetch(url, {
            headers: { "User-Agent": "restaurant-delivery-app" }
        });

        const data = await response.json();

        if (data.length === 0) {
            return null;
        }

        return {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon)
        };

    } catch (err) {

        console.error("Geocode error:", err);
        return null;

    }

}


app.post("/order-delivered", async (req, res) => {

    const { order_id } = req.body;

    try {

        await db.update_data(
            "UPDATE food_order SET order_status='ORDER_DELIVERED' WHERE order_id=$1",
            [order_id]
        );

        res.json({ success: true });

    } catch (err) {

        console.error(err);
        res.status(500).json({ error: "Failed to update status" });

    }

});

const locations = {};
// console.log("Locations object initialized:", locations);

// app.route("/update_location")
//     .post((req, res)=>{
//         const { order_id, latitude, longitude } = req.body;

//         if(!order_id){
//             return res.status(400).json({ error: "order_id is required" });
//         }
//         locations[order_id] = { latitude, longitude , time: new Date() };

//         // console.log("Updated:", order_id, locations[order_id]);

//         res.json({ success: true });
//     })



app.post("/update_location", async (req, res) => {

    const { order_id, latitude, longitude } = req.body;

    if (!order_id) {
        return res.status(400).json({ error: "order_id is required" });
    }

    try {

        const query = `
            INSERT INTO track_order (order_id, latitude, longitude)
            VALUES ($1, $2, $3)
            ON CONFLICT (order_id)
            DO UPDATE SET
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                updated_at = CURRENT_TIMESTAMP
        `;

        await db.insert_data(query, [order_id, latitude, longitude]);

        console.log("DB Updated:", order_id, latitude, longitude);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB error" });
    }

});

// app.get("/get-location/:order_id", (req, res) => {

//     const order_id = req.params.order_id;
//     console.log("raw location data:", locations);
//     const data = locations[order_id];

//     if (!data) {
//         return res.json(null);
//     }

//     res.json(data);
// });


app.get("/get-location/:order_id", async (req, res) => {

    const order_id = req.params.order_id;

    try {

        const result = await db.fetch_data(
            "SELECT latitude, longitude FROM track_order WHERE order_id=$1",
            [order_id]
        );

        if (!result || result.length === 0) {
            return res.json(null);
        }

        res.json(result[0]);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "DB error" });
    }

});


// https.createServer(
//     {
//         key: fs.readFileSync("server.key"),
//         cert: fs.readFileSync("server.cert"),
//     },
//     app
// ).listen(PORT, "0.0.0.0", () => {
//     console.log("🚀 HTTPS Server running at https://0.0.0.0:3000");
// });


app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
});