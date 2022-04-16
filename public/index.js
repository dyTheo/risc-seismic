var map = L.map('map', {drawControl: true}).setView([44.43, 26.08], 11);

L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
    minZoom: 0
}).addTo(map);

let xhr = new XMLHttpRequest();
xhr.open('GET', '/polygons');
xhr.onreadystatechange = function()
{
    if (xhr.readyState === 4)
    {
        let myJson = JSON.parse(xhr.responseText);
        myJson.forEach((val)=> {
            var points = [];
            var latlang = [];
            val.forEach((v)=> {
                points.push({y: v.lat, x: v.lng, val: v.val});
            });
            points = L.LineUtil.simplify(points);
            points.forEach((p)=> {
                latlang.push([p.y, p.x]);
            });
            var polygonOptions = {color:'white'};
            if (val[0].val["Clasa de risc seismic"].startsWith("2"))
                polygonOptions = {color:'yellow'};
            if (val[0].val["Clasa de risc seismic"].startsWith("1"))
                polygonOptions = {color:'red'};
            console.log(latlang);
            var polygon = L.polygon(latlang, polygonOptions);
            polygon.addTo(map);
            polygon.bindPopup(`Anul construirii: ${val[0].val["Anul construirii"]}<br/>
            Clasa de risc seismic:${val[0].val["Clasa de risc seismic"]}<br/>
            Adresa:${val[0].val["Adresa"]}
            `);
        });
    }
}
xhr.send();
