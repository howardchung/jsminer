var express = require('express');
var app = express();
var port = process.env.PORT || 5000;
var worker_name = '13XHeLLVeFtqef7WD4BDL3fQRqpVTUdG3i';
var curr_block = {};
var createHash = require('sha.js');
var sha256 = createHash('sha256');
var ba = require('binascii');
app.listen(port);
app.use('/public', express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.sendFile("index.html", {
        "root": __dirname
    });
});
app.get('/work', function(req, res) {
    console.log("client requested work!");
    //send constructed block to client
    //client mines block
    //when client succeeds, client hits /submit
    res.json({
        result: curr_block
    });
});
app.get('/submit', function(req, res) {
    console.log("client submitted work!");
    //endpoint for clients to submit work
    //server forwards to mining pool
    //req.query.nonce has the solution
    /*
    params[0] = Worker Name
params[1] = Job ID
params[2] = ExtraNonce 2
params[3] = nTime
params[4] = nonce
*/
    client.stratumSubmit(worker_name, curr_block.job_id, curr_block.extranonce2, curr_block.ntime, req.query.nonce);
    res.json({
        error: null
    });
});
//communicate with bitcoin network via stratum tcp protocol
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
        //console.log(JSON.stringify(data));
        /*
    params[0] = Job ID. This is included when miners submit a results so work can be matched with proper transactions.
params[1] = Hash of previous block. Used to build the header.
params[2] = Coinbase (part 1). The miner inserts ExtraNonce1 and ExtraNonce2 after this section of the coinbase.
params[3] = Coinbase (part 2). The miner appends this after the first part of the coinbase and the two ExtraNonce values.
params[4][] = List of merkle branches. The coinbase transaction is hashed against the merkle branches to build the final merkle root.
params[5] = Bitcoin block version, used in the block header.
params[6] = nBit, the encoded network difficulty. Used in the block header.
params[7] = nTime, the current time. nTime rolling should be supported, but should not increase faster than actual time.
params[8] = Clean Jobs. If true, miners should abort their current work and immediately use the new job. If false, they can still use the current job, but should move to the new one after exhausting the current nonce 
*/
        //build curr_block
        curr_block.job_id = data.params[0];
        //TODO: generate a block in getwork format for client to mine
        //generate an extranonce2 of the correct size.  typically the client would increment this but we already have 2^32 possible nonces per worker
        //therefore each client has 4 billion hashes to try before needing new work
        //ExtraNonce2_size: This is how many bytes should be used for the ExtraNonce2 counter.
        //ExtraNonce2 is a hexadecimal counter, and should be padded to fill up the number of bytes identified as the ExtraNonce2_size.  
        //static extranonce of 4 bytes in hex, could be incremented by the client miners if desired
        curr_block.extranonce2 = "00000000";
        curr_block.ntime = data.params[7];
        //construct the block header using double sha256, coinbase, etc.
        //To produce coinbase, we just concatenate Coinb1 + Extranonce1 + Extranonce2 + Coinb2 together. That's all!
        var coinbase = data.params[2] + curr_block.extranonce1 + curr_block.extranonce2 + data.params[3];
        console.log("coinbase: %s", coinbase);
        //double sha hash the coinbase
        var coinbase_hash_bin = sha256.update(sha256.update(coinbase, "hex").digest()).digest();
        //compute the merkle root
        var merkle_branches = data.params[4];
        var merkle_root = coinbase_hash_bin;
        for (var i = 0; i < merkle_branches.length; i++) {
            merkle_root = sha256.update(sha256.update(merkle_root + ba.unhexlify(merkle_branches[i])).digest()).digest();
        }
        merkle_root = merkle_root.toString('hex');
        console.log("merkle root: %s", merkle_root);
        var version = data.params[5];
        var prevhash = data.params[1];
        var ntime = data.params[7];
        var nbits = data.params[6];
        var header = version + prevhash + merkle_root + ntime + nbits + '00000000' + '000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000';
        curr_block.data = header;
        //big-endian difficulty 1 target
        curr_block.target = "00000000ffff0000000000000000000000000000000000000000000000000000";
        //we could use websockets to push new work to clients when curr_block updates, but we don't have to implement this
        //or they can just poll occasionally to get new work
        console.log("computed block!");
        console.log(JSON.stringify(curr_block));
    }
    else if (data.result) {
        /*
        result[0] = "mining.notify", "ae6812eb4cd7735a302a8a9dd95cf71f" - Unique string used for the subscription
        result[1] = ExtraNonce1, used for building the coinbase.
        result[2] = Extranonce2_size, the number of bytes that the miner users for its ExtraNonce2 counter 
        */
        //place subscription data in the current block
        curr_block.extranonce1 = data.result[1];
        curr_block.extranonce2_size = data.result[2];
        console.log('got subscription data');
        console.log(JSON.stringify(data));
    }
    if (!socket.authorized) {
        console.log('Asking for authorization');
        //any password can be used
        socket.stratumAuthorize(worker_name, 'x');
    }
    else {
        console.log("authorized");
    }
});
client.connect({
    //host: 'stratum.mining.eligius.st',
    //port: 3334
    host: 'stratum.bitcoin.cz',
    port: 3333
}).then(function(socket) {
    // deferred, this can be chained if needed, no callback hell
    // "socket" refers to the current client, in this case, the 'client'
    // variable
    console.log('Connected! subscribing');
    socket.stratumSubscribe();
});