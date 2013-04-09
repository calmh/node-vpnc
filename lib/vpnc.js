var  _ = require('underscore');
var con = require('yacon');
var exec = require('child_process').exec;
var inpathSync = require('inpath').sync;
var kext = require('kext');
var spawn = require('child_process').spawn;
var sudo = require('sudo');
var tempFile = require('temp').path;
var fs = require('fs');

var vpncConfig = require('./vpnc-config');

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
        function run(err, loaded) {
            if (err) {
                return callback(err);
            }
            if (!loaded) {
                callback(new Error('Tunnel module not loadable'));
            }

            exec(vpncBinary + ' --version', function (err, stdout, stderr) {
                if (err) {
                    return callback(err);
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

        if (process.platform === 'darwin')
            kext.ensure(['foo.tun', 'net.tunnelblick.tun', 'com.viscosityvpn.Viscosity.tun'], '/Library/Extensions/tun.kext', run);
        else
            run(null, true);
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
    con.debug('config file: ', configFile);
    fs.writeFileSync(configFile, vpncConfig(config), 'utf-8');

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
    var options = { cachePassword: true, spawnOptions: { env: env } };
    var args = [ '-E', vpncBinary, '--debug', '1', configFile ];
    con.debug('sudo ' + args.join(' '));
    var cp = sudo(args, options);

    function logVpnc(line) { con.debug(line); } // Present save caller function to dlog
    cp.stderr.on('data', function (data) { data.toString().split('\n').forEach(logVpnc); });
    cp.stdout.on('data', function (data) { data.toString().split('\n').forEach(logVpnc); });

    cp.on('exit', function (code) {
        fs.unlinkSync(configFile);
        callback(null, code);
    });
}

function disconnect(callback) {
    con.debug('sudo ' + vpncDisconnectBinary);
    var cp = sudo([ vpncDisconnectBinary ], { cachePassword: true });
    cp.on('exit', function (code) {
        callback(null, code);
    });
}
