node-vpnc
=========

[![build status](https://secure.travis-ci.org/calmh/node-vpnc.png)](http://travis-ci.org/calmh/node-vpnc)

Use vpnc to connect to a remote Cisco VPN, using a specified configuration.

Example
-------

    var vpnc = require('vpnc');
    
    var config = {
        IPSec_ID: 'foobar',
        IPSec_gateway: 'vpn.example.com',
        IPSec_secret: 'topSecret',
    
        Xauth_username: 'test@example',
        Xauth_password: 'r00barb',
    
        IKE_Authmode: 'psk',
        IKE_DH_Group: 'dh2',
        DNSUpdate: 'no',
        NAT_Traversal_Mode: 'force-natt',
        Local_Port: 0,
        Cisco_UDP_Encapsulation_Port: 0,
    };
    
    function connect() {
        vpnc.connect(config, function (err, code) {
            if (err) {
                console.log('Error connecting VPN:');
                console.log(err);
            } else {
                console.log('VPN connected. Disconnecting in five seconds.');
                setTimeout(disconnect, 5000);
            }
        });
    }
    
    function disconnect() {
        vpnc.disconnect(function (err, code) {
            if (err) {
                console.log('Error disconnecting VPN:');
                console.log(err);
            } else {
                console.log('VPN disconnected.');
            }
        });
    }
    
    connect();

