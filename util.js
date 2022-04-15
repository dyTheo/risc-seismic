
function tile2lat(y, z)
{
    let n = Math.PI - 2 * Math.PI * y / Math.pow(2,z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function tile2lng(x, z)
{
    return -180 + (x * 360 / Math.pow(2, z));
}

function lng2tile(lng, zoom)
{
    return Math.floor((lng + 180) / 360 * Math.pow(2, zoom));
}

function lat2tile(lat, zoom)
{
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom));
}


module.exports = {
	tile2lat, tile2lng, lng2tile, lat2tile
};
