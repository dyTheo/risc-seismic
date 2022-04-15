const express = require('express')
const app = express()
const port = 8080

app.use(express.static('public'))
const { parse } = require('csv-parse');
let fs = require("fs");
var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;

let results = [];
let markers = [];
let UPDATE = false;
let totalRequest = 0;

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
    fs.readFile('./markers.out', 'utf8', (err, data) => {
        markers = JSON.parse(data);
    });
}

app.get('/markers', async (req, res) => {
    res.json(markers.slice(0, 500));

})

app.listen(port, () => {
    console.log('Node.js web server at port 8080 is running..')
})