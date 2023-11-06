const express = require('express');
const cors = require("cors");
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require("path")
const unzipper = require('unzipper');

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

app.use(cors({ origin: "*" }))

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
})

const port = 5001;


app.post("/download", async (req, res) => {
    const body = req.body
    console.log(body)
    try {
        const response = await axios({
            method: 'get',
            url: body.url,
            responseType: 'stream',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + CESIUM_API_KEY
            },
        });


        const writer = fs.createWriteStream(body.destinationPath);

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', resolve);
            writer.on('error', reject);
        }).then(() => {
            // Unzip the downloaded file
            fs.createReadStream(body.destinationPath)
                .pipe(unzipper.Extract({ path: body.extractPath })) // Specify the extraction path
                .on('finish', () => {
                    console.log('File Unzipped Successfully');
                    fs.unlinkSync(body.destinationPath)
                    console.log("Zip File deleted Successfully");
                    res.send({ status: 1, message: "File Downloaded and Unzipped Successfully!!!!" })

                    // Respond or perform further actions here
                });
        })


    } catch (error) {
        console.error('File download failed:', error);
        res.send({ status: 0, message: "File Download Error!!!!!" })
    }
})

app.post("/thumbnailDownload", async (req, res) => {
    // Assuming you have received the response in a variable called 'response'
    const bodyData = req.body
    const fileData = bodyData.data
    const fileName = req.body.fileName
    const imageType = req.body.type;
    const projectName = req.body.projectName;
    const randomId = "test123"
    // Convert the ArrayBuffer to a Buffer
    const buffer = Buffer.from(fileData);

    // Define the path and filename for the saved file
    var localDirPath = ''
    if(imageType=="ProjectThumbs"){
        console.log("ProjectThumbs");
        let subDirPath = imageType +'/'+ projectName;
        localDirPath = '../../Asset-Server/dist/public/assets/'+ subDirPath;
    }
    else{
        console.log("VRTour");
        let subDirPath = imageType +'/Images_Testing/'+ randomId;
        localDirPath = '../../Asset-Server/dist/public/assets/'+ subDirPath;
    }
    // const localDirPath = '../../Asset-Server/dist/public/assets/VRTour/Images_Testing/' + randomId;
    //const localFilePath = path.join(__dirname, 'downloads/', fileName);
    //console.log(localFilePath)
    // Create the directory if it doesn't exist
    fs.mkdir(localDirPath, { recursive: true }, (error) => {
        if (error) {
            console.log("directory error", error)
        }
        else {
            console.log("New Directory")
            var localFilePath=''
            var subPath=''
            if(imageType=="ProjectThumbs"){
                console.log("ProjectThumbs");
                subPath = imageType +'/' +projectName +'/' + fileName
                localFilePath = '../../Asset-Server/dist/public/assets/'+ subPath;
            }
            else if(imageType=="360"){
                console.log("VRTour");
                subPath = 'Images_Testing/'+ randomId + '/' + fileName
                localFilePath = '../../Asset-Server/dist/public/assets/VRTour/'+ subPath;
            }
            else{
                console.log("Minimap");
                subPath = 'Minimap_Testing/'+ randomId + '/' + fileName
                localFilePath = '../../Asset-Server/dist/public/assets/VRTour/'+ subPath;
            }
            // Save the Buffer as a file
            fs.writeFile(localFilePath, buffer, (err) => {
                console.log("sdfsdfsdfsdfsdf")
                if (err) {
                    console.error('Error saving the file:', err);
                    //   res.status(500).send('Error saving the file');
                } else {
                    console.log("else")
                    const thumbnailurl = 'https://iron-storageserver.propvr.in/public/assets/'+subPath
                    console.log(thumbnailurl)
                    res.send({ status: 1, thumbnailUrl: thumbnailurl });
                }
            });
        }
    })
})

app.get("/", (req, res) => {
    res.send({ status: 1 })
})

//listen server
app.listen(port, () => console.log(`listening on port ${port}!`))
