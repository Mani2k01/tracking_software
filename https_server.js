// const fs = require('fs');
// const https = require('https');
const express = require('express');
const Database = require("./db");

const app = express();

app.use(express.json());
app.use(express.static("public"));

const db = new Database();
const PORT = 3000;

app.get("/", (req, res) => {
    res.send("HTTPS working ✅");
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