const express = require('express');
const cors = require("cors");
const axios = require('axios');
const bodyParser = require('body-parser');
const fs = require('fs-extra');
const path = require("path")
const AdmZip = require('adm-zip');
const { exec } = require('child_process');
require("dotenv").config();
const util = require('util');
const execPromise = util.promisify(exec);
const app = express();
console.log(process.env.THUMBNAIL_URL)
const CESIUM_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiIyZGMxNzIxYi1kNDljLTQzYmMtODY5Mi00N2Q1MWFiZjA0YzciLCJpZCI6MzAyNjgzLCJpYXQiOjE3NDcyOTU4NTF9.Hi8Zz8OtZIa2gbLqyqpdnvUX6DblHO6zQ4nMpWYSz9Q"

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

function generateRandomId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomId = '';
    for (let i = 0; i < 8; i++) {
        randomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return randomId;
}

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
            console.log("ExtractPath")
            console.log(body.extractPath)
            const zip = new AdmZip(body.destinationPath);

            try {
                // Extract the contents to the destination folder
                zip.extractAllTo(body.extractPath, /*overwrite*/ true);
                console.log('Unzip completed successfully.');
                fs.unlinkSync(body.destinationPath)
                res.status(200).send({status:1,tileSetUrl:body.extractPath+'\tileset.json'})
            } catch (err) {
                console.error('Error during unzip:', err);
            }
        })


    } catch (error) {
        console.error('File download failed:', error);
        reject(error)
    }
})

app.post("/thumbnailDownload", async (req, res) => {
    // Assuming you have received the response in a variable called 'response'
    const bodyData = req.body
    const fileData = bodyData.data
    const fileName = req.body.fileName
    const imageType = req.body.type;
    const projectName = req.body.projectName;
    const randomId = generateRandomId();
    // Convert the ArrayBuffer to a Buffer
    const buffer = Buffer.from(fileData);

    // Define the path and filename for the saved file
    var localDirPath = ''
    if(imageType=="ProjectThumbs"){
        console.log("ProjectThumbs");
        let subDirPath = imageType +'/'+ projectName;
        localDirPath = '../../Asset-Server/dist/public/assets/'+ subDirPath;
    }
    else if(imageType=="360"){
        let subDirPath = 'Images_Testing/'+ randomId;
        localDirPath = '../../Asset-Server/dist/public/assets/VRTour/'+ subDirPath;
    }
    else{
        let subDirPath =  'Minimap_Testing/'+ randomId;
        localDirPath = '../../Asset-Server/dist/public/assets/VRTour/'+ subDirPath;
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
                subPath =  'Minimap_Testing/'+ randomId + '/' + fileName
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
                    var thumbnailurl = ''
                    if(imageType=="ProjectThumbs"){
                        thumbnailurl = process.env.THUMBNAIL_URL+'/public/assets/'+subPath

                    }else{
                        thumbnailurl = process.env.THUMBNAIL_URL+'/public/assets/VRTour/'+subPath
                    }
                    console.log(thumbnailurl)
                    res.send({ status: 1, thumbnailUrl: thumbnailurl });
                }
            });
        }
    })
})
function convertToGsUtilPath(firebaseUrl) {
  const match = firebaseUrl.match(/https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/(.+)/);
  if (!match) return null;

  const bucket = match[1];
  const encodedPath = match[2].split('?')[0]; // in case there's a query string
  const decodedPath = decodeURIComponent(encodedPath);

  return `gs://${bucket}/${decodedPath}`;
} 
async function StoreTileRenderImage(u_id,projectName,tileUrl,fileName,thumbnailUrl,type) {
    return new Promise((resolve,reject)=>{
        const myHeaders = new Headers();
        myHeaders.append("Content-Type", "application/json");
        const raw = JSON.stringify({
                "u_id": u_id,
                "projectName": projectName,
                "tileUrl": tileUrl,
                "name": fileName,
                "thumbnailUrl": thumbnailUrl,
                "type": type
            });
        console.log("raw",raw)
            const requestOptions = {
                method: "POST",
                headers: myHeaders,
                body: raw,
                redirect: "follow"
            };
            fetch(`${process.env.CREATOR_BACKEND}/storeTileRenderImage`, requestOptions) //http://localhost:6002
            .then((response) => response.text())
            .then((result) =>{
                console.log(result);
                resolve();
            })
            .catch((error) =>{
                console.error(error);
                reject()
            });    
    })    
}
app.post("/firebaseTilesAPI", async (req, res) => {
  const body = req.body;
  const {u_id,projectName,type,thumbnail_url,fileName} = req.body;
  console.log(body);

  try {
    const bucketPath = convertToGsUtilPath(body.firebase_tile_url);
    const folderName = bucketPath.split('/').pop();
    console.log("folderName",folderName)
    const targetPath = '../../Asset-Server/dist/public/assets/VRTour/Tiles_Testing';

    await fs.ensureDir(targetPath); // Ensure target directory exists

    console.log("Downloading from:", bucketPath);

    // Step 1: Download with gsutil
    await execPromise(`gsutil -m cp -r "${bucketPath}" .`).then(async ()=>{
    await fs.copy(folderName, path.join(targetPath, folderName), { overwrite: true }).then(()=>{
      fs.remove(folderName);
    })
    })
    const assetURL = process.env.THUMBNAIL_URL+'/public/assets/VRTour/Tiles_Testing/'+ folderName
    await StoreTileRenderImage(u_id,projectName,assetURL,fileName,thumbnail_url,type)
    res.send({ status: 1, URL :assetURL });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).send({ status: 0, error: err.message });
  }
});
app.get("/", (req, res) => {
    res.send({ status: 1 })
})

//listen server
app.listen(port, () => console.log(`listening on port ${port}!`))
