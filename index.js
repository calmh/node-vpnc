var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var tempFile = require('temp').path;
var writeFile = require('fs').writeFile;

var vpncConfig = require('./lib/vpnc-config');

exports = module.exports = {
    available: available,
    connect: connect,
    disconnect: disconnect,
};

function available(callback) {
    exec('vpnc --version', function (err, stdout, stderr) {
        if (err) {
            callback(err);
        } else {
            var v = (stdout + stderr).match(/(vpnc version [0-9.]+)/);
            if (v) {
                callback(null, v[1]);
            } else {
                callback(new Error('Could not parse vpnc version string'));
            }
        }
    });
}

function connect(config, callback) {
    // FIXME: Load kernel module if necessary

    // Create a config file for vpnc
    var configFile = tempFile({ suffix: '.vpnc.conf' });
    writeFile(configFile, vpncConfig(config), 'utf-8', function (err) {
        if (err) {
            return callback(err);
        }

        // Launch vpnc with sudo, enabling sudo to ask for password
        var sudo = spawn('sudo', [ 'vpnc', configFile ], { customFds: [0, 1, 2] });
        sudo.on('exit', function (code) {
            callback(null, code);
        });
    });
}

function disconnect(callback) {
    var sudo = spawn('sudo', [ 'vpnc-disconnect' ], { customFds: [0, 1, 2] });
    sudo.on('exit', function (code) {
        callback(null, code);
    });
}
