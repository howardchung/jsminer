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
    //TODO: generate a block in getwork format for client to mine
    //send it to client
    //need data and target?
    //client mines block
    //when client succeeds, client hits /submit
    res.json(curr_block);
    //we could use websockets to push new work to clients when curr_block updates, but we don't have to implement this
    //or they can just poll occasionally to get new work
});
app.get('/submit', function(req, res) {
    //endpoint for clients to submit work
    //server forwards to mining pool
    //req.query.nonce has the solution
    /*
    console.log('Lets submit fake data once for test purposes);
    client.stratumSubmit('worker', 'job_id', 'extranonce2', 'ntime', 'nonce')
    */
});
//option 1, stratum
var Client = require('stratum').Client;
var client = Client.create();
client.on('mining.error', function(msg, socket) {
    console.log(msg);
});
client.on('mining.notify', function(msg, socket) {
    //how to get params/data to build a block to mine?
    console.log(msg);
});
// the client is a one-way communication, it receives data from the server after issuing commands
client.on('mining', function(data, socket, type) {
    // type will be either 'broadcast' or 'result'
    console.log('Mining data: %s', JSON.stringify(data));
    // you can issue more commands to the socket, it's the exact same socket as "client" variable
    // in this example
    // the socket (client) got some fields like:
    // client.name = name of the worker
    // client.authorized = if the current connection is authorized or not
    // client.id = an UUID ([U]niversal [U]nique [ID]entifier) that you can safely rely on it's uniqueness
    // client.subscription = the subscription data from the server
    if (!socket.authorized) {
        console.log('Asking for authorization');
        socket.stratumAuthorize('13XHeLLVeFtqef7WD4BDL3fQRqpVTUdG3i', 'pass');
    }
});
client.connect({
    host: 'stratum.mining.eligius.st',
    port: 3334
}).then(function(socket) {
    // defered, this can be chained if needed, no callback hell
    // "socket" refers to the current client, in this case, the 'client'
    // variable
    console.log('Connected! lets ask for subscribe');
    // After the first stratumSubscribe, the data will be handled internally
    // and returned deferreds to be resolved / rejected through the event 'mining'
    // above
    socket.stratumSubscribe('Node.js Stratum');
});
/*
//option 2, getblocktemplate
//use a valid bitcoin address to authenticate with pool
//http://gbt.mining.eligius.st:9337/
//13XHeLLVeFtqef7WD4BDL3fQRqpVTUdG3i
//the POST body to send to pool
//{"id": 0, "method": "getblocktemplate", "params": [{"capabilities": ["coinbasetxn", "workid", "coinbase/append"]}]}
//the response from the pool
{
    "result": {
        "previousblockhash": "00000000000000000caa7d4dc5487d166d9dda5c6e89f08ab05ce8d127ecf8f7",
        "target": "0000000001ffffffffffffffffffffffffffffffffffffffffffffffffffffff",
        "noncerange": "00000000ffffffff",
        "transactions": [],
        "mintime": 1428579458,
        "sigoplimit": 20000,
        "expires": 120,
        "longpoll": "/LP",
        "height": 351376,
        "coinbasetxn": {
            "data": "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4603905c050e00456c6967697573005526653604fabe6d6d8f555d7079ad46a8dfde627ee89164eaafaf643a41656b0508dc69a8a81141520400000000000000002f7367312f00ffffffff0100f90295000000001976a9145399c3093d31e4b0af4be1215d59b857b861ad5d88ac00000000"
        },
        "version": 2,
        "time": 1428579638,
        "submitold": true,
        "mutable": [
            "coinbase/append",
            "submit/coinbase"
        ],
        "sizelimit": 1000000,
        "maxtime": 1428579758,
        "curtime": 1428579638,
        "longpollid": "bootstrap",
        "bits": "18163c71"
    },
    "id": 0,
    "error": null
}
//how to build a block from this data
//https://en.bitcoin.it/wiki/Getblocktemplate
//build block and send in getwork format
*/
