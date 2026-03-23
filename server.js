const express = require('express');
const cors = require('cors');
const path  = require('path');

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

let locations = [];


app.route('/')
.get((req, res)=>{
    res.send("Hello World");
})

app.route("/update_location")
    .post((req, res)=>{
        const { order_id, latitude, longitude } = req.body;

        if(!order_id){
            return res.status(400).json({ error: "order_id is required" });
        }
        locations[order_id] = { latitude, longitude , time: new Date() };

        console.log("Updated:", order_id, locations[order_id]);

        res.json({ success: true });
    })


app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
})