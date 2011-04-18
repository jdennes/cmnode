cmnode
======

An experiment with node.js, WebSockets, GeoIP, and the Campaign Monitor API and how this combination be used for cool things.

**Update:** This little project was the inspiration for what became [Campaign Monitor Worldview](http://www.campaignmonitor.com/worldview/ "Campaign Monitor Worldview")

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

Then open index.html to connect to the server. If people like your campaign, you should see something like this:

![cmnode in action](http://farm6.static.flickr.com/5130/5221794697_f1317c14d0_z.jpg)

Have fun!
