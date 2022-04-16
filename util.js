
function tile2lat(y, z)
{
    let n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function tile2lng(x, z)
{
    return -180 + (x * 360 / Math.pow(2, z));
}

function lng2tile(lng, z)
{
    return Math.floor((lng + 180) / 360 * Math.pow(2, z));
}

function lat2tile(lat, z)
{
    return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
}

function pixel2lng(x, z)
{
    let formula = -180 + (x * 360 / (512 * Math.pow(2, z)));
    return formula;
}

function pixel2lat(y, z)
{
    let n = Math.PI - 2 * Math.PI * y / (512 * Math.pow(2, z));
    let formula = (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
    return formula;
}

function lng2tilePixel(lng, zoom)
{
    let formula = (lng * 512 + 180) / 360 * Math.pow(2, zoom);
    return Math.round(formula) % 512;
}

function lat2tilePixel(lat, zoom)
{
    let formula = (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom);
    return Math.round(formula) % 512;
}


module.exports = {
	tile2lat, tile2lng, lng2tile, lat2tile, pixel2lat, pixel2lng, lat2tilePixel, lng2tilePixel
};
