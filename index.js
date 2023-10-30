const express = require('express');
const cors = require("cors");
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();

const CESIUM_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIxZDEzNDFjZC1hMTU2LTQxZTAtODAwYy0wMDdhZDk2ZjRiNjciLCJpZCI6MTc0MDI3LCJpYXQiOjE2OTgzMDYwOTN9._yz8fsU4g44poarvkoqg-XRH9n7HerxtMa9QLQEld0k"

app.use(bodyParser.json({
    limit: '50mb', extended: true
}));
app.use(bodyParser.urlencoded({
limit: '50mb',
parameterLimit: 100000,
extended: true 
}));

app.use(cors({origin:"*"}))

app.use((req, res, next) => {
res.header("Access-Control-Allow-Origin", "*");
res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
next();
}) 

const port = 5001;


app.post("/download",async(req,res)=>{
    const body = req.body
    try {
        const response = await axios({
        method: 'get',
        url: body.url,
        responseType: 'stream',
        headers: { 
            'Content-Type': 'application/json', 
            'Authorization': 'Bearer '+CESIUM_API_KEY
        },
        });

        const writer = fs.createWriteStream(body.destinationPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        res.send({status:1, message:"File Downloaded Successfully!!!!"})
        });
    } catch (error) {
        console.error('File download failed:', error);
        res.send({status:0, message:"File Download Error!!!!!"})
    }
})

app.get("/",(req,res)=>{
    res.send({status:1})
})

//listen server
app.listen(port, () => console.log(`listening on port ${port}!`))