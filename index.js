var  _ = require('underscore');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var tempFile = require('temp').path;
var writeFile = require('fs').writeFile;
var inpathSync = require('inpath').sync;
var sudo = require('sudo');

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

function lenToMask(len) {
    var masks = [
        '0.0.0.0',
        '128.0.0.0',
        '192.0.0.0',
        '224.0.0.0',
        '240.0.0.0',
        '248.0.0.0',
        '252.0.0.0',
        '254.0.0.0',
        '255.0.0.0',
        '255.128.0.0',
        '255.192.0.0',
        '255.224.0.0',
        '255.240.0.0',
        '255.248.0.0',
        '255.252.0.0',
        '255.254.0.0',
        '255.255.0.0',
        '255.255.128.0',
        '255.255.192.0',
        '255.255.224.0',
        '255.255.240.0',
        '255.255.248.0',
        '255.255.252.0',
        '255.255.254.0',
        '255.255.255.0',
        '255.255.255.128',
        '255.255.255.192',
        '255.255.255.224',
        '255.255.255.240',
        '255.255.255.248',
        '255.255.255.252',
        '255.255.255.255'
    ];
    return masks[parseInt(len, 10)];
}

function connect(config, routes, callback) {
    if (typeof routes === 'function') {
        callback = routes;
        routes = {};
    } else if (!routes) {
        routes = {};
    }

    // Create a config file for vpnc
    var configFile = tempFile({ suffix: '.vpnc.conf' });
    writeFile(configFile, vpncConfig(config), 'utf-8', function (err) {
        if (err) {
            return callback(err);
        }

        // Prepare environment with routes
        var env = process.env;
        if (_.size(routes) > 0) {
            env['NODE_SPLIT_INC'] = _.size(routes);
            var i = 0;
            _.each(routes, function (mask, net) {
                env['NODE_SPLIT_INC_' + i + '_ADDR'] = net;
                env['NODE_SPLIT_INC_' + i + '_MASKLEN'] = mask;
                env['NODE_SPLIT_INC_' + i + '_MASK'] = lenToMask(mask);
                i += 1;
            });
        }

        // Launch vpnc with sudo, enabling sudo to ask for password
        options = { cachePassword: true, spawnOptions: { env: env } };
        var cp = sudo([ '-E', vpncBinary, configFile ], options);
        cp.on('exit', function (code) {
            callback(null, code);
        });
    });
}

function disconnect(callback) {

    var cp = sudo([ vpncDisconnectBinary ], { cachePassword: true });
    cp.on('exit', function (code) {
        callback(null, code);
    });
}
