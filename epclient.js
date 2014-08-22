/*
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Orchestra entrypoint REST client
 */
var http  = require('http')
  , log   = require('npmlog');

module.exports = function(host, port, username, password) {
	
	return {
		positionInQueue: function(branchId, queueId, visitId, callback) {
			getQueue(host, port, username, password, branchId, queueId, function(err, visits) {
				if(err) {
					callback(err, 0);
				} else {
					var position = 0;
				
					for (var key in visits) {
						if(visits.hasOwnProperty(key)) {
							if(visits[key].visitId == visitId) {
								position = parseInt(key)+1;
								break;
							} 
						}
					}
				
					callback(null, position);
				}
			});
		},
		visit: function(branchId, visitId, callback) {
			var req = http.request({
				'hostname': host,
				'port': port,
				'path': '/qsystem/rest/entrypoint/branches/' + branchId + '/visits/' + visitId,
				'method': 'GET',
				'auth': username + ':' + password
			}, function (res) {
				var body = '';
				
				res.on('data', function (chunk) {
					body += chunk;
				});
				
				res.on('end', function() {
					if(res.statusCode == 200) {
						var json = JSON.parse(body);
					
						log.verbose('', 'Received an response:');
						log.verbose('', json);
					
						callback(null, json);
					} else {
						log.error('', 'Error returned from EntryPoint REST interface: %s', res.headers['error_message']);
						callback({
							code: res.headers['error_code'],
							message: res.headers['error_message']
						});
					}
				});
				
				res.on('error', function(e) {
					log.error('', 'Error calling EntryPoint REST interface: %s', e.message);
					callback(e);
				});
			});
			
			req.end();
		},
		visitAtPosition: function(branchId, queueId, position, callback) {
			
			getQueue(host, port, username, password, branchId, queueId, function(err, visits) {
				if(err) {
					callback(err);
				} else {
					var visit = null;
					
					if(visits.length >= position) {
						visit = visits[position - 1];
					}
				
					callback(null, visit);
				}
			});
		}
	};
};

var getQueue = function(host, port, username, password, branchId, queueId, callback) {
	
	var req = http.request({
		'hostname': host,
		'port': port,
		'path': '/qsystem/rest/entrypoint/branches/' + branchId + '/queues/' + Math.round((queueId / 100000000000)) + '/visits',
		'method': 'GET',
		'auth': username + ':' + password
	}, function (res) {
		var body = '';
		
		res.on('data', function (chunk) {
			body += chunk;
		});
		
		res.on('end', function() {
			if(res.statusCode == 200) {
				var json = JSON.parse(body);
			
				log.verbose('', 'Received an response:');
				log.verbose('', json);
			
				callback(null, json);
			} else {
				log.error('', 'Error returned from EntryPoint REST interface: %s', res.headers['error_message']);
				callback({
					code: res.headers['error_code'],
					message: res.headers['error_message']
				});
			}
		});
		
		res.on('error', function(e) {
			log.error('', 'Error calling MI REST interface: %s', e.message);
			callback(e);
		});
	});
	
	req.end();
};