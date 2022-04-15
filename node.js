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

let results = [];
let markers = [];
let UPDATE = false;
let totalRequest = 0;
let polygons = [];

// we need to time our requests for the addresses so we don't flood the server
function recursiveXHR(currentRequestCount)
{
    if (currentRequestCount == totalRequest)
    {
        fs.writeFile("markers.out", JSON.stringify(markers), ()=>{});
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
            console.log(myJson);
            if (myJson.data == undefined || myJson.data[0] == undefined || myJson.data[0].latitude == undefined)
            {
                let ffunction = ((c)=>{return ()=>{recursiveXHR(c)}})(currentRequestCount + 1);
                setTimeout(ffunction, 100);
                return;
            } 
            let lat = myJson.data[0].latitude;
            let lng = myJson.data[0].longitude;
            markers.push({lat, lng});
            let ffunction = ((c)=>{return ()=>{recursiveXHR(c)}})(currentRequestCount + 1);
            setTimeout(ffunction, 100);
        }
    }
    xhr.send();
}

function get_tile(latlng)
{

}

const options = {
    method: 'GET',
    url: 'https://retina-tiles.p.rapidapi.com/local/osm@2x/v1/7/20/49.png',
    headers: {
      'X-RapidAPI-Host': 'retina-tiles.p.rapidapi.com',
      'X-RapidAPI-Key': '2d28a91ee5msh1e6a5654011f10ap196d4bjsnca8e75342264'
    }
  };

// preferably only run update the addresses rarely or even manually
if (UPDATE)
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
else
{
    // time to generate the polygons that are sent to the client to display

    // first, let's just get the images that we care about... zoom level?
    // 17 should be good enough... so that's 192*192 = 36 864 images. Doable
    fs.readFile('./markers.out', 'utf8', (err, data) => {
        markers = JSON.parse(data);
        let z = 11;
        
        markers.forEach((val)=> {
            let name1 = "files/" + lng2tile(val.lng, z) + "_" + lat2tile(val.lat, z) + ".png";
            let name2 = lng2tile(val.lng, z) + "/" + lat2tile(val.lat, z) + ".png";
            fs.access(name1, fs.constants.R_OK, (err) => {
                // for now we just won't download it anymore 
                if (err) {
                    const options = {
                        method: 'GET',
                        url: 'https://retina-tiles.p.rapidapi.com/local/osm@2x/v1/' + z + '/' + name2,
                        responseType: 'arraybuffer',
                        headers: {
                            'X-RapidAPI-Host': 'retina-tiles.p.rapidapi.com',
                            'X-RapidAPI-Key': '2d28a91ee5msh1e6a5654011f10ap196d4bjsnca8e75342264'
                        }
                    };
                    axios.request(options).then(function (response) {
                        fs.writeFile(name1, response.data, ()=>{});
                    }).catch(function (error) {
                    });
                }
                else {
                    get_tile(val);
                }
            });
            
        });
    });
    
}

app.get('/markers', async (req, res) => {
    let mmarkers = markers.slice(0, 1);
    res.json(mmarkers);
})

app.listen(port, () => {
    console.log('Node.js web server at port 8080 is running..')
})