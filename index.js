var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var tempFile = require('temp').path;
var writeFile = require('fs').writeFile;
var inpathSync = require('inpath').sync;

var vpncConfig = require('./lib/vpnc-config');

var path = process.env['PATH'].split(':');
path.push('/usr/local/sbin');

var vpncBinary = inpathSync('vpnc', path);
var vpncDisconnectBinary = inpathSync('vpnc-disconnect', path);

exports = module.exports = {
    available: available,
    connect: connect,
    disconnect: disconnect,
};

function available(callback) {
    if (!vpncBinary) {
        process.nextTick(function () {
            callback(new Error('Could not find vpnc in $PATH'));
        });
    } else {
        exec(vpncBinary + ' --version', function (err, stdout, stderr) {
            if (err) {
                callback(err);
            } else {
                var v = (stdout + stderr).match(/(vpnc version [0-9.]+)/);
                if (v) {
                    callback(null, { vpnc: vpncBinary, vpncDisconnect: vpncDisconnectBinary, version: v[1] });
                } else {
                    callback(new Error('Could not parse vpnc version string'));
                }
            }
        });
    }
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
        var sudo = spawn('sudo', [ vpncBinary, configFile ], { customFds: [0, 1, 2] });
        sudo.on('exit', function (code) {
            callback(null, code);
        });
    });
}

function disconnect(callback) {
    var sudo = spawn('sudo', [ vpncDisconnectBinary ], { customFds: [0, 1, 2] });
    sudo.on('exit', function (code) {
        callback(null, code);
    });
}
