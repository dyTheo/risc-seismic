var map = L.map('map', {drawControl: true}).setView([44.4, 26.1], 11);

L.tileLayer('tiles/{z}/{y}-{x}.png', {
    minZoom:11,
    maxZoom:17
}).addTo(map);

let address = "Strada Blanari 2, Bucuresti, Sector 3";

// Read CSV file
d3.csv("cladiri_risc_seismic.csv", function(data) {

	// Loop through data
	for (let i = 0; i < data.length; i++) {
		console.log(data[i]);
	}
});

fetch('http://api.positionstack.com/v1/forward?access_key=703db92b4a1f26a3252ada5f6bc3facd&query=' + address)
	.then(function(response) {
		return response.json();
	})
	.then(function(myJson) {
		console.log(myJson);
		let lat = myJson.data[0].latitude;
		let lng = myJson.data[0].longitude;
		L.marker([lat, lng]).addTo(map);
	});
