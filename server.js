var sys = require('sys'),
  fs = require('fs'),
  http = require('http'),
  ws = require('./lib/ws'),
  xml2js = require('./lib/xml2js'),
  opens = []; // open count indexed by email address

try {
  var configJSON = fs.readFileSync(__dirname + "/config/app.json");
} catch(e) {
  sys.log("File config/app.json not found.");
}
var config = JSON.parse(configJSON.toString());
  
function process_cm_response(websocket, xml) {
  var parser = new xml2js.Parser();
  parser.addListener('end', function(result) {
    sys.debug(sys.inspect(result));
    var output = '';
    var subs = result.SubscriberOpen;
    if (subs) {
      subs.forEach(function(s) {
        var email = s.EmailAddress;
        var openCount = s.NumberOfOpens;
        if (!opens[email]) {
          opens[email] = openCount;
          output += '<p>' + opens[email] + ' new opens from ' + email + '</p>';
        } else {
          if (opens[email] != openCount) {
            var newOpens = openCount - opens[email];
            opens[email] = openCount;
            output += '<p>' + newOpens + ' new opens from ' + email + '</p>';
          }
        }
      });
    }
    if (output === '') { output = '...'; }
    websocket.write(output);
  });
  parser.parseString(xml); 
}

ws.createServer(function(websocket) {
  websocket.addListener('connect', function(response) {
    sys.debug('connect: ' + response);

    // Server polls Campaign Monitor API for a campaign's opens
    setInterval(function() {
      var cm = http.createClient(80, 'api.createsend.com');
      var request = cm.request('GET', '/api/api.asmx/Campaign.GetOpens?ApiKey=' + 
        config.api_key + '&CampaignID=' + config.campaign_id, {'host': 'api.createsend.com'});
      request.end();
      request.addListener('response', function (response) {
        sys.debug('STATUS: ' + response.statusCode);
        sys.debug('HEADERS: ' + JSON.stringify(response.headers));
        response.setEncoding('utf8');
        response.addListener('data', function (data) {
          sys.debug('BODY: \n' + data);
          process_cm_response(websocket, data);
        });
      });
    }, 2000);

  }).addListener('data', function(data) {
    sys.debug(data);
  }).addListener('close', function() {
    sys.debug('close');
    
  });
}).listen(8000);
