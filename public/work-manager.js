if (typeof(derMiner) == 'undefined') var derMiner = {};
derMiner.Util = {
    hex_to_uint32_array: function(hex) {
        var arr = [];
        for (var i = 0, l = hex.length; i < l; i += 8) {
            arr.push((parseInt(hex.substring(i, i + 8), 16)));
        }
        return arr;
    },
    hex_to_uint16_array: function(hex) {
        var arr = [];
        for (var i = 0, l = hex.length; i < l; i += 4) {
            arr.push((parseInt(hex.substring(i, i + 4), 16)));
        }
        return arr;
    },
    uint32_array_to_hex: function(arr) {
        var hex = '';
        for (var i = 0; i < arr.length; i++) {
            hex += derMiner.Util.byte_to_hex(arr[i] >>> 24);
            hex += derMiner.Util.byte_to_hex(arr[i] >>> 16);
            hex += derMiner.Util.byte_to_hex(arr[i] >>> 8);
            hex += derMiner.Util.byte_to_hex(arr[i]);
        }
        return hex;
    },
    uint16_array_to_hex: function(arr) {
        var hex = '';
        for (var i = 0; i < arr.length; i++) {
            hex += derMiner.Util.byte_to_hex(arr[i] >>> 8);
            hex += derMiner.Util.byte_to_hex(arr[i]);
        }
        return hex;
    },
    to_uint16_array: function(w) {
        return [(w & 0xffff0000) >> 16, (w & 0x0000ffff)];
    },
    byte_to_hex: function(b) {
        var tab = '0123456789abcdef';
        b = b & 0xff;
        return tab.charAt(b / 16) + tab.charAt(b % 16);
    },
    reverseBytesInWord: function(w) {
        return ((w << 24) & 0xff000000) | ((w << 8) & 0x00ff0000) | ((w >>> 8) & 0x0000ff00) | ((w >>> 24) & 0x000000ff);
    },
    reverseBytesInInt: function(w) {
        return ((w << 8) & 0x0000ff00 | (w >> 8) & 0x000000ff);
    },
    reverseBytesInWords: function(words) {
        var reversed = [];
        for (var i = 0; i < words.length; i++) reversed.push(derMiner.Util.reverseBytesInWord(words[i]));
        return reversed;
    },
    reverseBytesInInts: function(words) {
        var reversed = [];
        for (var i = 0; i < words.length - 1; i += 2) {
            reversed.push(derMiner.Util.reverseBytesInInt(words[i + 1]));
            reversed.push(derMiner.Util.reverseBytesInInt(words[i]));
        }
        return reversed;
    },
    fromPoolString: function(hex, gl) {
        return gl ? derMiner.Util.reverseBytesInInts(derMiner.Util.hex_to_uint16_array(hex)) : derMiner.Util.reverseBytesInWords(derMiner.Util.hex_to_uint32_array(hex));
    },
    toPoolString: function(data, gl) {
        return gl ? derMiner.Util.uint16_array_to_hex(derMiner.Util.reverseBytesInInts(data)) : derMiner.Util.uint32_array_to_hex(derMiner.Util.reverseBytesInWords(data));
    },
    ToUInt32: function(x) {
        return x >>> 0;
    }
};
var console = window.console ? window.console : {
    log: function() {}
};
var worker = null;
var testmode = false;
var init = false;
var start;
var id = 1;
// use this in case we can directly connect to a given pool
// var _url = 'http://' + g_user + ':' + g_password + '@' + g_url + ':' + g_port;
var _url = '/work';

function readScript(n) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", n, false);
    xhr.send(null);
    var x = xhr.responseText;
    return x;
}

function onError(data) {
    $('#info').val(data.status + " " + data.responseText);
}

function onSuccess(jsonresp) {
    //got work from server
    //contact the server for work, expects and submits in old getwork format
    if (worker) {
        try {
            worker.postMessage({
                run: false
            });
            worker.terminate();
        }
        catch (e) {
            console.log(e);
        }
    }
    id = Number(jsonresp.id) + 1;
    var response = jsonresp.result;
    var data = JSON.stringify(response);
    $('#info').val(data);
    //figure out what miner to use
    var type = $('[type=radio]');
    if (type.length == 0) type = [{
        checked: true
    }, {
        checked: false
    }, {
        checked: false
    }];
    var job = {};
    var gl = type[2].checked;
    job.run = true;
    job.work = data;
    job.midstate = derMiner.Util.fromPoolString(response.midstate, gl);
    job.half = derMiner.Util.fromPoolString(response.data.substr(0, 128), gl);
    job.data = derMiner.Util.fromPoolString(response.data.substr(128, 256), gl);
    job.hash1 = derMiner.Util.fromPoolString(response.hash1, gl);
    job.target = derMiner.Util.fromPoolString(response.target, gl);
    var t = derMiner.Util.ToUInt32(derMiner.Util.fromPoolString(response.target, false)[6]);
    var d = (4273753909.69051265) / t;
    $('#target').val(t + "/" + d.toFixed(3));
    if (testmode) {
        job.nonce = derMiner.Util.fromPoolString("204e2e35")[0];
    }
    else {
        job.nonce = Math.floor(Math.random() * 0xFFFFFFFF);
    }
    job.hexdata = response.data;
    if (type[2].checked) {
        //webgl miner
        var postMessage = function(m) {
            onWorkerMessage({
                data: m
            });
        }
        var th = $('#threads')[0].value;
        if (!init) meinWebGLStart(th);
        worker = {
            postMessage: function(m) {
                worker.intMessage({
                    data: m
                })
            },
            intMessage: glminer(job, postMessage)
        };
    }
    else if (type[0].checked) {
        var postMessage = function(m) {
            onWorkerMessage({
                data: m
            });
        }
        worker = {
            postMessage: function(m) {
                worker.intMessage({
                    data: m
                });
            },
            intMessage: function() {}
        };
        //single js worker
        var m = readScript('/public/miner.js');
        var s = '(function() {' + m + ';\n' + 'onmessage({ data: job });' + ' worker.intMessage = onmessage; })';
        var run = eval(s);
        run();
    }
    else {
        //multiple js workers
        worker = new Worker("/public/miner.js");
        worker.onmessage = onWorkerMessage;
        worker.onerror = onWorkerError;
        worker.postMessage(job);
    }
    init = true;
}

function begin_mining() {
    var tm = $('#testmode');
    testmode = tm.length > 0 && tm[0].checked;
    start = (new Date()).getTime();
    if (testmode) {
        onSuccess({
            //work on fake data
            result: {
                "midstate": "eae773ad01907880889ac5629af0c35438376e8c4ae77906301c65fa89c2779c",
                "data": "0000000109a78d37203813d08b45854d51470fcdb588d6dfabbe946e92ad207e0000000038a8ae02f7471575aa120d0c85a10c886a1398ad821fadf5124c37200cb677854e0603871d07fff800000000000000800000000000000000000000000000000000000000000000000000000000000000000000000000000080020000",
                "hash1": "00000000000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000010000",
                "target": "0000000000000000000000000000000000000000000000000000f8ff07000000",
                "sol": "31952e35"
            }
        });
    }
    else {
        //real mode, get actual work from server
        $.get(_url, onSuccess, "text json");
        /*
        //set timeout, get new work every x seconds?
        if (use_to) {
            var enqueuMiner = function() {
                get_work();
                repeat_to = window.setTimeout(enqueuMiner, use_to * 1000);
            };
            repeat_to = window.setTimeout(enqueuMiner, 1000);
        }
        else {
            //use long polling to get new work?  fewer stale
            get_work(true);
            long_poll();
        }
    }
    */
    }
}

function onWorkerMessage(event) {
    var job = event.data;
    if (job.print) console.log('worker:' + job.print);
    if (job.golden_ticket) {
        if (job.nonce) console.log("nonce: " + job.nonce);
        //we succeeded!  check nonce and golden ticket
        console.log("golden ticket!");
    }
    console.log(event);
    //TODO update webpage state to show user progress
    /*
    if (!job.total_hashes) job.total_hashes = 1;
    var total_time = ((new Date().getTime()) - start) / 1000;
    var total_hashed = job.total_hashes + Number($('#total-hashes').val());
    var hashes_per_second = total_hashed / (total_time + 1);
    $('#total-hashes').val(total_hashed);
    var old = Number($('#hashes-per-second').val());
    if (old == "NaN" || old == "Infinity") old = 0;
    $('#hashes-per-second').val(Math.round((old + hashes_per_second) / 2));
    */
}

function onWorkerError(event) {
        throw event.data;
    }
    /*
    var long_poll_suc = null;

    function long_poll() {
        var done = function(resp) {
            if (resp.result || long_poll_suc) {
                long_poll_suc = true;
                if (resp.result) onSuccess(resp);
                long_poll();
            }
            else if (long_poll_suc === null) {
                console.log('Stop polling!!!!');
                long_poll_suc = false;
                window.setInterval(get_work, 3 * 60 * 1000);
            }
        };
        $.ajax({
            url: _url + "/LP" + (no_cache ? "?cache=0&ts=" + (new Date().getTime()) : ''),
            data: '{ "method": "long-poll", "id": "' + id + ' ", "params": [] }',
            type: "POST",
            headers: {},
            success: done,
            error: done,
            dataType: "json"
        });
    }
    */
    /*
    window.onload = function() {
        onl();
        // try {
        var d = document.createElement('div');
        d.setAttribute('style', 'display:none');
        var add = false;
        var arr = ["total-hashes", "hashes-per-second", "golden-ticket", "info"];
        for (var i = 0; i < arr.length; i++) {
            var n = arr[i];
            var l = document.getElementById(n);
            if (!l) {
                var e = document.createElement('input');
                d.appendChild(e);
                add = true;
            }
            else {
                l.value = "";
            }
        }
        if (add) {
            document.body.appendChild(d);
        }
        // } catch (e) {
        //     console.log("manager:" + e);
        // }
    }
    */