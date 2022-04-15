var map = L.map('map', {drawControl: true}).setView([44.4, 26.1], 11);
L.tileLayer('tiles/{z}/{y}-{x}.png', {
    minZoom:11,
    maxZoom:15
}).addTo(map);