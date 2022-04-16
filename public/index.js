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
            var latlang = [];
            val.forEach((v)=> {
                latlang.push([v.lat, v.lng]);
            });
            var polygonOptions = {color:'red'};
            var polygon = L.polygon(latlang, polygonOptions);
            polygon.addTo(map);
     //       L.marker([val.lat, val.lng]).addTo(map)
             //   .bindPopup('A pretty CSS3 popup.<br> Easily customizable.')
            //    .openPopup();
        });
    }
}
xhr.send();