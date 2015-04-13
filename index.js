var express = require('express');
var app = express();
var port = process.env.PORT || 5000;
var curr_block = null;
app.listen(port);
app.use('/public', express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.sendFile("index.html", {
        "root": __dirname
    });
});
app.get('/work', function(req, res) {
    /*
        result: {
        "midstate": "eae773ad01907880889ac5629af0c35438376e8c4ae77906301c65fa89c2779c",
        "data": "0000000109a78d37203813d08b45854d51470fcdb588d6dfabbe946e92ad207e0000000038a8ae02f7471575aa120d0c85a10c886a1398ad821fadf5124c37200cb677854e0603871d07fff800000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000",
        "hash1": "00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000",
        "target": "0000000000000000000000000000000000000000000000000000f8ff07000000",
        "sol": "31952e35"
    }
    */
    //TODO: generate a block in getwork format for client to mine
    //send it to client
    //need data and target?
    //client mines block
    //when client succeeds, client hits /submit
    res.json(curr_block);
});
app.get('/submit', function(req, res) {
    //TODO
    //endpoint for clients to submit work
    //server forwards to mining pool
    //req.query.nonce has the solution
    /*
    client.stratumSubmit('worker', 'job_id', 'extranonce2', 'ntime', 'nonce')
    */
});
//option 1, stratum
var Client = require('stratum').Client;
var client = Client.create();
client.on('mining.error', function(msg, socket) {
    console.log(msg);
});
// the client is a one-way communication, it receives data from the server after issuing commands
client.on('mining', function(data, socket, type) {
    // type will be either 'broadcast' or 'result'
    //console.log('Mining data (%s): %s', type, JSON.stringify(data));
    // you can issue more commands to the socket, it's the exact same socket as "client" variable
    // in this example
    // the socket (client) got some fields like:
    // client.name = name of the worker
    // client.authorized = if the current connection is authorized or not
    // client.id = an UUID ([U]niversal [U]nique [ID]entifier) that you can safely rely on it's uniqueness
    // client.subscription = the subscription data from the server
    if (data.method === "notify") {
        //TODO handle new block
        console.log(JSON.stringify(data));
        //we could use websockets to push new work to clients when curr_block updates, but we don't have to implement this
        //or they can just poll occasionally to get new work
    }
    if (!socket.authorized) {
        console.log('Asking for authorization');
        socket.stratumAuthorize('13XHeLLVeFtqef7WD4BDL3fQRqpVTUdG3i', 'x');
    }
    else {
        console.log("authorized");
        //socket.stratumSubmit('', '', '', ' ', '');
    }
});
client.connect({
    //host: 'stratum.mining.eligius.st',
    //port: 3334
    host: 'stratum.bitcoin.cz',
    port: 3333
}).then(function(socket) {
    // defered, this can be chained if needed, no callback hell
    // "socket" refers to the current client, in this case, the 'client'
    // variable
    console.log('Connected! subscribing');
    socket.stratumSubscribe();
});