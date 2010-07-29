var sys = require('sys'),
  fs = require('fs'),
  http = require('http'),
  ws = require('./lib/ws'),
  xml2js = require('./lib/xml2js'),
  opens = 0,
  uniqueOpens = 0,
  clicks = 0,
  unsubscribes = 0,
  bounces = 0;

try {
  var configJSON = fs.readFileSync(__dirname + "/config/app.json");
} catch(e) {
  sys.log("File config/app.json not found. Try: `cp config/app.json.example config/app.json`");
}
var config = JSON.parse(configJSON.toString());

var campaign = null;

function getCampaign() {
  // Finds the campaign from a list of the client's campaigns using 
  // the Campaign Monitor API
  var data = '';
  var cm = http.createClient(80, 'api.createsend.com');
  var request = cm.request('GET', '/api/api.asmx/Client.GetCampaigns?ApiKey=' + 
    config.api_key + '&ClientID=' + config.client_id, {'host': 'api.createsend.com'});
  request.end();
  request.addListener('response', function (response) {
    response.setEncoding('utf8');
    response.addListener('data', function (chunk) {
      data += chunk;
    });
    response.addListener('end', function() {
      var parser = new xml2js.Parser();
      parser.addListener('end', function(result) {
        if (result.Campaign) {
          result.Campaign.forEach(function(v) {
            if (v.CampaignID == config.campaign_id) {
              campaign = v;
            }
          });
        }
      });
      parser.parseString(data);
    });
  });
}
  
function processCMResponse(websocket, xml) {
  var parser = new xml2js.Parser();
  parser.addListener('end', function(result) {
    sys.debug(sys.inspect(result));
    var output = '<p>';
    var _opens = result.TotalOpened;
    var _uniqueOpens = result.UniqueOpened;
    var _clicks = result.Clicks;
    var _unsubscribes = result.Unsubscribed;
    var _bounces = result.Bounced;
    if (_opens && _uniqueOpens && _clicks && _unsubscribes && _bounces) {
      if (opens != _opens) {
        output += (_opens - opens) + ' new open' + ((_opens - opens) != 1 ? 's' : '') + ' ';
        opens = _opens;
      }
      if (uniqueOpens != _uniqueOpens) {
        output += (_uniqueOpens - uniqueOpens) + ' new unique open' + ((_uniqueOpens - uniqueOpens) != 1 ? 's' : '') + ' ';
        uniqueOpens = _uniqueOpens;
      }
      if (clicks != _clicks) {
        output += (_clicks - clicks) + ' new click' + ((_clicks - clicks) != 1 ? 's' : '') + ' ';
        clicks = _clicks;
      }
      if (unsubscribes != _unsubscribes) {
        output += (_unsubscribes - unsubscribes) + ' new unsubscribe' + ((_unsubscribes - unsubscribes) != 1 ? 's' : '') + ' ';
        unsubscribes = _unsubscribes;
      }
      if (bounces != _bounces) {
        output += (_bounces - bounces) + ' new bounce' + ((_bounces - bounces) != 1 ? 's' : '') + ' ';
        bounces = _bounces;
      }
      if (output === '<p>') {
        output = '.'; 
      } else {
        output += '</p>';
      }
    }
    var jsonResponse = {
      CampaignName: campaign.Name,
      Opens: opens,
      UniqueOpens: uniqueOpens,
      Clicks: clicks,
      Unsubscribes: unsubscribes,
      Bounces: bounces,
      New: output
    };
    sys.debug(JSON.stringify(jsonResponse));
    websocket.write(JSON.stringify(jsonResponse));
  });
  parser.parseString(xml); 
}

ws.createServer(function(websocket) {
  if (!campaign) { getCampaign(); }

  websocket.addListener('connect', function(response) {
    sys.debug('connect: ' + response);

    // Server polls Campaign Monitor API for a campaign's summary
    setInterval(function() {
      var data = '';
      var cm = http.createClient(80, 'api.createsend.com');
      var request = cm.request('GET', '/api/api.asmx/Campaign.GetSummary?ApiKey=' + 
        config.api_key + '&CampaignID=' + config.campaign_id, {'host': 'api.createsend.com'});
      request.end();
      request.addListener('response', function (response) {
        response.setEncoding('utf8');
        response.addListener('data', function (chunk) {
          data += chunk;
        });
        response.addListener('end', function() {
          //sys.debug('Response body: \n' + data);
          processCMResponse(websocket, data);
        });
      });
    }, 2000);

  }).addListener('data', function(data) {
    sys.debug(data);
  }).addListener('close', function() {
    sys.debug('close');
    
  });
}).listen(8000);
