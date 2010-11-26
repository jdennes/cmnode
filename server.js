var sys = require('sys'),
  fs = require('fs'),
  http = require('http'),
  ws = require('./lib/ws'),
  geoip = require('./lib/geoip'),
  dbpath = '/usr/local/share/GeoIP/GeoLiteCity.dat'
  campaign = null,
  opens = {};

try {
  var configJSON = fs.readFileSync(__dirname + "/config/app.json");
} catch(e) {
  sys.log("File config/app.json not found. Try: `cp config/app.json.example config/app.json`");
}
var config = JSON.parse(configJSON.toString());

function getCampaign() {
  // Finds the campaign from a list of the client's campaigns using 
  // the Campaign Monitor API
  var data = '';
  var cm = http.createClient(80, 'api.createsend.com');
  var request = cm.request('GET', '/api/v3/clients/' + config.client_id + '/campaigns.json',
    { 'host': 'api.createsend.com', 'Authorization': 'Basic ' + new Buffer(config.api_key + ':x').toString('base64') });
  request.end();
  request.addListener('response', function (response) {
    response.setEncoding('utf8');
    response.addListener('data', function (chunk) {
      data += chunk;
    });
    response.addListener('end', function() {
      var campaigns = JSON.parse(data);
      campaigns.forEach(function(c) {
        if (c.CampaignID == config.campaign_id) { campaign = c; }
      });
    });
  });
}

function processCMResponse(websocket, data) {
  // Grab the most recent 100 opens
  var _raw_opens = JSON.parse(data).Results;
  var _new_opens = null;

  if (_raw_opens) {
    _raw_opens.forEach(function(o) {
      key = o.EmailAddress + o.Date;
      if (!(key in opens)) {
        var con = new geoip.Connection(dbpath, function(con) {
          con.query(o.IPAddress, function(result) {
            o.latitude = result.latitude;
            o.longitude = result.longitude;
            con.close();
          });
        });
        opens[key] = o;
        if (!_new_opens) { _new_opens = {}; }
        _new_opens[key] = o;
      }
    });
  
    if (_new_opens) {
      var jsonResponse = {
        CampaignName: campaign.Name,
        CampaignSubject: campaign.Subject,
        NewOpens: _new_opens
      };
      console.log(jsonResponse);
      websocket.write(JSON.stringify(jsonResponse));
    }
  }
}

ws.createServer(function(websocket) {
  if (!campaign) {
    getCampaign();
  }

  // Server polls Campaign Monitor API for campaign opens
  setInterval(function() {
    var data = '';
    try {
      var now = new Date();
      var mindate = now.getUTCFullYear() + '-' + (now.getUTCMonth() + 1) + '-' + now.getUTCDate();
      var cm = http.createClient(80, 'api.createsend.com');
      var request = cm.request('GET', '/api/v3/campaigns/' + config.campaign_id + '/opens.json?date=2010-01-01&pagesize=100&orderfield=date&orderdirection=desc',
        { 'host': 'api.createsend.com', 'Authorization': 'Basic ' + new Buffer(config.api_key + ':x').toString('base64') });
      request.end();
      request.addListener('response', function (response) {
        response.setEncoding('utf8');
        response.addListener('data', function (chunk) {
          data += chunk;
        });
        response.addListener('end', function() {
          processCMResponse(websocket, data);
        });
      });
    } catch (e) {
      // If we can't make the call, just wait until we can
      sys.log("Failed to connect to Campaign Monitor API.");
    }
  }, 5000);
  
  websocket.addListener('connect', function(response) {
    sys.debug('connect: ' + response);
  }).addListener('data', function(data) {
    sys.debug(data);
  }).addListener('close', function() {
    sys.debug('close');
  });

}).listen(8000);
