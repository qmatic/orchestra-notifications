/*
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Main
 */
var express 	 = require('express')
  , http		 = require('http')
  , log  		 = require('npmlog')
  , swig  		 = require('swig')
  , numeral 	 = require('numeral')
  , yaml_config  = require('node-yaml-config');

var config;

// load config from file
try { 
	config = yaml_config.load('./config.yml');
} catch(err) {
	log.error('','Error parsing config file');
	log.error('', err);
	process.exit();
}

var events 	= require('./events')(config);
var ep 		= require('./epclient')(config.orchestra.host, config.orchestra.port, config.orchestra.user, config.orchestra.password);
var app 	= express();

// configure express
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/views');
app.use(express.static('public'));

// handle events posted from orchestra
app.post('/', function(req, res) {
	var body = '';

	req.on('data', function(chunk) {
		body += chunk;
	});
	
	req.on('end', function() {
		var json = JSON.parse(body);
		log.verbose('', 'Received an event:');
		log.verbose('', json);
		
		// handle event
		events.handle(json, function() {
			res.statusCode = 200;
			res.end();
		});
	});
});

// handle requests for visit pages
app.get('/visit/:branch/:queue/:visit', function(req, res) {
	
	// get the visit
	ep.visit(req.params.branch, req.params.visit, function(err, visit) {
		if(err) {
			log.error('','Error fetching visit:');
			log.error('', err);
			res.render('notfound');
		} else {
			if(visit == null) {
				log.verbose('', 'Visit not found in system.');
				res.render('notfound');
			} else {
				if(visit.timeSinceCalled > 0) {
					// visit has been called
					res.render('called', {
						ticketNumber: visit.ticketId, 
						service: visit.currentVisitService.serviceExternalName, 
						waitingTime: numeral(visit.waitingTime).format('00:00:00')
					});
				} else {
					// visit is waiting
					// get position in queue
					ep.positionInQueue(req.params.branch, req.params.queue, req.params.visit, function(err, position) {
						if(err) {
							log.error('','Error fetching position for visit:');
							log.error('', err);
						}
					
						res.render('index', {
							ticketNumber: visit.ticketId, 
							service: visit.currentVisitService.serviceExternalName, 
							waitingTime: numeral(visit.waitingTime).format('00:00:00'), 
							position: numeral(position).format('0o')
						});
					});
				}
			}
		}
	});
});

// start express server
app.listen(config.port, function() {
	log.info('', 'HTTP server listening on port %d', config.port);
	
	// register for events
	http.get(config.orchestra.hookurl + '/register?url=' + config.url, function(res) {
		log.info('', 'Registered for events.');
	});
});

// trap shutdown to handle de-registering from event web-hook
process.on('SIGINT', function() {
  log.info('', 'Gracefully shutting down from SIGINT (Ctrl-C)');

  // un-register events
  http.get(config.orchestra.hookurl + '/deregister?url=' + config.url, function(res) {
	  log.info('', 'Deregistered for events.');
  
	  process.exit();
  });
});