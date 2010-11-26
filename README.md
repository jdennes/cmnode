cmnode
======

An experiment with node.js, WebSockets, GeoIP, and the Campaign Monitor API and how this combination be used for cool things.

Requirements
------------

 * node.js v0.2.5
 * node-geoip - https://github.com/strange/node-geoip/
 * A browser which supports WebSockets (e.g. Google Chrome)

Installation
--------------

    git clone git://github.com/jdennes/cmnode.git
    cd cmnode

    # Copy and edit the sample config file
    cp config/app.json.sample config/app.json

Running it
----------

To start the server (runs on port 8000), run:

    node server.js

Then open index.html to connect to the server.
