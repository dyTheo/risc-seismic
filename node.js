const express = require('express')
const app = express()
const port = 8080

app.use(express.static('public'))
const { parse } = require('csv-parse');
let fs = require("fs");
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const axios = require("axios");


const {tile2lat, tile2lng, lng2tile, lat2tile, pixel2lat,
    pixel2lng, lat2tilePixel, lng2tilePixel} = require("./public/util.js");
const client = require('https');
const Jimp = require('jimp');

let results = [];
let markers = [];
let markers2 = [];
let UPDATE_COORDS = false;
let UPDATE_IMAGES = true;
let UPDATE_POLYGONS = true;
let totalRequest = 0;
let tiles = [];
let polygons = [];
let baseZ = 16;
let minZ = 11;

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
        checkIfToGenerateMaps();
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

function readImages(intArray, x, y, dx, dy, func)
{
    let aX = x + dx;
    let aY = y + dy;
    let fileName = "files/" + aX + "_" + aY + ".png";
    let functionn = (function (intArray, dx, dy, func) {
        return function (err, image) {
            for (let i = 0; i < image.getHeight(); i++)
            {
                for (let j = 0; j < image.getWidth(); j++)
                {
                    intArray[dx * 512 + 512 + j][dy * 512 + 512 + i] = image.getPixelColor(j, i);
                }
            }
            dx++;
            if (dx === 2)
            {
                dy++;
                dx = -1;
            }
            if (dy === 2)
            {
                func(intArray);
                return;
            }
            readImages(intArray, x, y, dx, dy, func);
        }
    })(intArray, dx, dy, func);
    return Jimp.read(fileName, functionn);
}

function checkIfToGenerateMaps()
{
    if (!UPDATE_POLYGONS)
    {
        return;
    }
    /*fs.access("polygons.json", fs.constants.R_OK, (err) => {
        // for now we just won't create it anymore
        if (err) {
            return;
        }
        else {
            generateMapsFor(0);
        }
    });*/
    generateMapsFor(0);
}

function generateMapsFor(currentRequestCount)
{
    if (currentRequestCount == 0)
    {
        markers2 = [];
    }
    if (currentRequestCount == totalRequest)
    {
        fs.write("polygons.json", JSON.stringify(polygons));
        console.log("done updating polygons");
        return;
    }
    let marker = markers[currentRequestCount];
    let x = lng2tile(marker.lng, baseZ);
    let y = lat2tile(marker.lat, baseZ);

    let functionn = ((c)=>{return (ints)=>calcPolygon(ints, c)})(currentRequestCount);
    let array = new Array(512 * 3);
    for (let i = 0; i < 512 * 3; i++)
    {
        array[i] = new Array(512 * 3);
    }
    readImages(array, x, y, -1, -1, functionn);
}

let mapD = new Map();
let mapp = new Map();
const INSIDE_BUILDING = 3654339071;

function dfs(startX, startY, intArray, depth)
{
    mapD.set(startX + " " + startY, depth);
    
    let dx = [-1, 0, 1, 0];
    let dy = [ 0, 1, 0,-1];
    for (let k = 0; k < 4; k++)
    {
        newX = startX + dx[k];
        newY = startY + dy[k];
        if (!mapD.has(newX + " " + newY) && intArray[newX] != undefined &&intArray[newX][newY] == INSIDE_BUILDING)
            dfs(newX, newY, intArray, depth + 1);
    }
}

//intArray[512][512], intArray[x][y]
function calcPolygon(intArray, currentRequestCount)
{
    // now perform Lee on that thing... yikes
    //... how do we figure where we were again?
    let tileX = lng2tile(markers[currentRequestCount].lng, baseZ);
    let tileY = lat2tile(markers[currentRequestCount].lat, baseZ);
    let startX = lng2tilePixel(markers[currentRequestCount].lng, baseZ) + 512;
    let startY = lat2tilePixel(markers[currentRequestCount].lat, baseZ) + 512;
    let first = 0;
    let queue = [{x: startX, y: startY}];
    let mapA = new Map();
    if (intArray[startX][startY] == INSIDE_BUILDING)
    {
        mapp.set(startX + " " + startY, 1);
        mapA.set(startX + " " + startY, 0);
    }
    while (queue.length != first)
    {
        let elem = queue[first];
        let elemKey = elem.x + " " + elem.y;
        first++;
        if (intArray[elem.x][elem.y] != INSIDE_BUILDING)
            continue;
        let dx = [-1, 0, 1, 0];
        let dy = [ 0, 1, 0,-1];
        for (let k = 0; k < 4; k++)
        {
            let newElem = {x: elem.x + dx[k], y: elem.y + dy[k]};
            if (newElem.x < 0 || newElem.x >= 512 * 3
                || newElem.y < 0 || newElem.y >= 512 * 3)
                continue;
            let newElemKey = newElem.x + " " + newElem.y;
            if (intArray[newElem.x][newElem.y] != INSIDE_BUILDING)
                continue;
            if (!mapA.has(newElemKey))
                mapA.set(newElemKey, 1);
            else
                mapA.set(newElemKey, mapA.get(newElemKey) + 1);
            mapA.set(elemKey, mapA.get(elemKey) + 1);
            if (mapp.has(newElemKey))
                continue;
            queue.push(newElem);
            mapp.set(newElemKey, 1);
        }
    }
    if (intArray[startX][startY] == INSIDE_BUILDING)
        dfs(startX, startY, intArray, 0);
    let points = [];
    mapA.forEach((val, key)=>{
        if (val > 7) return;
        let x = parseInt(key.split(" ")[0]);
        let y = parseInt(key.split(" ")[1]);
        points.push({lng:pixel2lng(x - 512 + tileX * 512, baseZ),
            lat: pixel2lat(y - 512 + tileY * 512, baseZ),
            val: markers[currentRequestCount].val, ind: mapD.get(key)});
    });
    points.sort((a, b)=>{return a.ind - b.ind});
    if (points.length != 0)
        polygons.push(points);
    generateMapsFor(currentRequestCount + 1);
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

app.get('/polygons', async (req, res) => {
    res.json(polygons);
})

app.listen(port, () => {
    console.log('Node.js web server at port 8080 is running..')
})