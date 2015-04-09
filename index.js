var express = require('express');
var app = express();
var port = process.env.PORT || 5000;
app.listen(port);
app.use('/public', express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.sendFile("index.html", {
        "root": __dirname
    });
});
//13XHeLLVeFtqef7WD4BDL3fQRqpVTUdG3i