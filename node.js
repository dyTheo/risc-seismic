const express = require('express')
const app = express()
const port = 8080

app.use(express.static('public'))
const { parse } = require('csv-parse');
let fs = require("fs");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const axios = require("axios");


const {tile2lat, tile2lng, lng2tile, lat2tile} = require("./util.js");
const client = require('https');
const Jimp = require('jimp');

let results = [];
let markers = [];
let UPDATE_COORDS = false;
let UPDATE_IMAGES = true;
let totalRequest = 0;
let tiles = [];
let polygons = [];
let baseZ = 16;

// we need to time our requests for the addresses so we don't flood the server
function recursiveXHR(currentRequestCount)
{
    if (currentRequestCount == totalRequest)
    {
        fs.writeFile("markers.out", JSON.stringify(markers), ()=>{});
        console.log("done with updating coordinates");
        updateImages();
        return;
    }
    let val = results[currentRequestCount];
    let address = encodeURIComponent(val.Adresa + " " + val.Nr + ", Bucuresti");
    let xhr = new XMLHttpRequest();
    xhr.open('GET', 'http://api.positionstack.com/v1/forward?access_key=703db92b4a1f26a3252ada5f6bc3facd&query=' + address)
    xhr.onreadystatechange = function()
    {
        if (xhr.readyState === 4)
        {
            let myJson = JSON.parse(xhr.responseText);
            if (myJson.data == undefined || myJson.data[0] == undefined || myJson.data[0].latitude == undefined)
            {
                let ffunction = ((c)=>{return ()=>{recursiveXHR(c)}})(currentRequestCount + 1);
                setTimeout(ffunction, 100);
                return;
            } 
            let lat = myJson.data[0].latitude;
            let lng = myJson.data[0].longitude;
            markers.push({lat, lng, val});
            let ffunction = ((c)=>{return ()=>{recursiveXHR(c)}})(currentRequestCount + 1);
            setTimeout(ffunction, 100);
        }
    }
    xhr.send();
}

// somewhat presumptious: we only need at most those around our building.
function updateImages()
{
    // time to generate the polygons that are sent to the client to display

    // first, let's just get the images that we care about... zoom level?
    // 16 should be good enough... so that's 192*192 = 9 216 images. Doable
    fs.readFile('./markers.out', 'utf8', (err, data) => {
        markers = JSON.parse(data);
        markers.forEach(val => {
            let lng = lng2tile(val.lng, baseZ);
            let lat = lat2tile(val.lat, baseZ);
            // TODO: actually check if it is in bounds
            // (not necessary for a Romanian application,
            // or even most of the world really)
            for (let dx = -1; dx <= 1; dx++)
            {
                for (let dy = -1; dy <= 1; dy++)
                {
                    tiles.push({lng:lng + dx, lat:lat + dy});
                }
            }
        });
        totalRequest = tiles.length;
        schedule(0);
    });
}

function schedule(currentRequestCount)
{
    if (currentRequestCount == totalRequest)
    {
        console.log("done with updating files");
        totalRequest = markers.length;
        generatePolygon(0);
        return;
    }
    let val = tiles[currentRequestCount];
    let name1 = "files/" + val.lng + "_" + val.lat + ".png";
    let name2 = val.lng + "/" + val.lat + ".png";
    fs.access(name1, fs.constants.R_OK, (err) => {
        // for now we just won't download it anymore 
        if (err) {
            const options = {
                method: 'GET',
                url: 'https://retina-tiles.p.rapidapi.com/local/osm@2x/v1/' + baseZ + '/' + name2,
                responseType: 'arraybuffer',
                headers: {
                    'X-RapidAPI-Host': 'retina-tiles.p.rapidapi.com',
                    'X-RapidAPI-Key': '2d28a91ee5msh1e6a5654011f10ap196d4bjsnca8e75342264'
                }
            };
            axios.request(options).then(function (response) {
                fs.writeFile(name1, response.data, ()=>{});
                let ffunction = ((c)=>{return ()=>{schedule(c)}})(currentRequestCount + 1);
                setTimeout(ffunction, 100);
                console.log(`getting ${name1}`);
            }).catch(function (error) {
                console.log("Error", error);
            });
        }
        else {
            let ffunction = ((c)=>{return ()=>{schedule(c)}})(currentRequestCount + 1);
            ffunction();
        }
    });
}


function generatePolygon(currentRequestCount)
{
    if (currentRequestCount == totalRequest)
    {
        console.log("done with updating polygons");
        return;
    }
    let marker = markers[currentRequestCount];
    let x = lng2tile(marker.lng, baseZ);
    let y = lat2tile(marker.lat, baseZ);
    let fileName = "files/" + x + "_" + y + ".png";
    let intArray = new Array
    Jimp.read(fileName, function (err, image) {
        for (let x = 0; x < image.getWidth(); x++)
        {
            intArray.push([]);
            for (let y = 0; y < image.getHeight(); y++)
            {
                intArray[x].push([image.getPixelColor(x, y)]);
            }
        }
    });
    // now perform Lee on that thing... yikes

}

// preferably only update the addresses rarely or even manually
if (UPDATE_COORDS)
{
    fs.createReadStream('Export.csv', "utf16le")
        .pipe(parse({
            columns: true,
            skip_lines_with_error: true,
        }))
        .on('data', (data) => {
            results.push(data);
        })
        .on('error', (err) => {
            console.log(err);
        })
        .on('end', () => {
            totalRequest = results.length;

            let ffunction = ((c)=>{return ()=>{recursiveXHR(c)}})(0);
            setTimeout(ffunction, 100);
        })
}
else if (UPDATE_IMAGES)
    updateImages();

app.get('/markers', async (req, res) => {
    let mmarkers = markers.slice(0, 10);
    res.json(mmarkers);
})

app.listen(port, () => {
    console.log('Node.js web server at port 8080 is running..')
})