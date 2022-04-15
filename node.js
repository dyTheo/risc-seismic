const express = require('express')
const app = express()
const port = 8080

app.use(express.static('public'))

app.listen(port, () => {
    console.log('Node.js web server at port 8080 is running..')
})