var vpncConfig = require('./lib/vpnc-config');
var spawn = require('child_process').spawn;

exports = module.exports = {
    connect: connect,
    disconnect: disconnect,
};

function connect(config, callback) {
    // Load kernel module if necessary
    // Create a config file for vpnc
    // Launch vpnc with sudo, enabling sudo to ask for password
    // Check exit status and/or output
    // Call callback with suitable parameters
}

function disconnect(callback) {
    // Run vpnc-disconnect
    // Check exit status and/or output
    // Call callback with suitable parameters
}
