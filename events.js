/*
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
 * LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, 
 * TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Event handling logic
 */
var phone 	= require('phone')
  , numeral	= require('numeral')
  , log   	= require('npmlog');

var bitly;
var nexmo; 
var ep;
var visitUrl;

var phone_param = "mobile";
var customer_param = "customers";

module.exports = function(config) {
	// include dependant services
	bitly = require('./lib/bitly')(config.bitly.id, config.bitly.secret, config.bitly.token);
	nexmo = require('./lib/nexmo')(config.nexmo.key, config.nexmo.secret);
	ep = require('./epclient')(config.orchestra.host, config.orchestra.port, config.orchestra.user, config.orchestra.password);
	
	// construct base URL to be used in SMS
	visitUrl = config.visit.url + '/visit/{branch}/{queue}/{visit}';
	
	phone_param = config.visit.phone_param;
	customer_param = config.visit.customer_param;
	
	return {
		handle: function(event, callback) {
			// return immediatley, and handle in background...
			callback();
			
			switch(event.eventName) {
			case 'VISIT_CREATE':
				// check for existance of the phone number param to send SMS to, if it doesn't exists there is nothing further we can do...
				if(event.parameters[phone_param] == undefined) {
					log.info('','VISIT_CREATE event does not contain phone param: %s', phone_param);
					return;
				}
				
				if(validateEvent(event))
					handleVisitCreate(event);
				break;
				
			case 'VISIT_CALL':
				if(validateEvent(event))
					handleVisitCall(event, config.visit.position);
				break;
				
			default:
				break;
			}
		}
	};
};

validateEvent = function(event) {
	
	//TODO - handle any logic here for filtering by branch, service, queue, or any other params on the event
	// default implementation sends messages for all visits created and called...
		
	return true;
};

handleVisitCreate = function(event) {
	log.verbose('', 'Handling visit create...');
	
	// get the visit
	ep.visit(event.parameters.branchId, event.parameters.visitId, function(err, visit) {
		if(err) {
			log.error('','Error fetching visit:');
			log.error('', err);
		} else {
			if(visit == null) {
				log.warn('', 'Visit not found in system.');
			} else {
				// get position in queue
				ep.positionInQueue(event.parameters.branchId, event.parameters.queueId, event.parameters.visitId, function(err, position) {
					if(err) {
						log.error('','Error fetching position for visit:');
						log.error('', err);
					}
					// create message
					var msg = 'Hi ' + visit.parameterMap[customer_param] + ', ';
					if(position > 0)
						msg += 'you are ' + numeral(position).format('0o') + ' in the queue. ';
					msg += 'We will notify you when to return. ';
		
					// create URL to visit page
					var url = visitUrl.replace(/{branch}/, event.parameters.branchId);
					url = url.replace(/{queue}/, event.parameters.queueId);
					url = url.replace(/{visit}/, visit.id);
		
					// shorten URL with bitly
					bitly.shorten(url, function(err, shortUrl) {
						if(err) {
							log.error('','Error shortening URL:');
							log.error('', err);
				
							// send message without URL
							sendMessage(visit.parameterMap[phone_param], msg);
						} else {
							// add url to message
							msg += 'Check your progress: ' + shortUrl;
				
							sendMessage(visit.parameterMap[phone_param], msg);
						}
					});
				});
			}
		}
	});
};

handleVisitCall = function(event, position) {
	log.verbose('', 'Handling visit call...');
	
	// get the visit from the queue for specified position
	ep.visitAtPosition(event.parameters.branchId, event.parameters.queueId, position, function(err, visit) {
		if(err) {
			log.error('','Error fetching visit:');
			log.error('', err);
		} else {
			if(visit == null) {
				log.warn('', 'Visit not found at position %d', position);
			} else {
				// get the visit
				ep.visit(event.parameters.branchId, visit.visitId, function(err, visit) {
					if(err) {
						log.error('','Error fetching visit:');
						log.error('', err);
					} else {
						if(visit == null) {
							log.warn('', 'Visit not found in system.');
						} else {
							if(visit.parameterMap[phone_param] == undefined) {
								log.info('','Visit does not contain phone param: %s', phone_param);
								return;
							}
							
							// create message
							var msg = 'Hi ' + visit.parameterMap[customer_param] + ', ';
							msg += 'Your about to be called. ';
							msg += 'Please return to the branch.';
				
							sendMessage(visit.parameterMap[phone_param], msg);
						}
					}
				});
			}
		}
	});
};

sendMessage = function(number, message) {
	
	// validate mobile number and format correctly via phone module (https://github.com/AfterShip/node-phone)
	var mobile = phone(number);

	if(mobile.length == 0) {
		log.warn('', 'Invalid phone number: %s, cannot send SMS.', number);
		return;
	}
	
	log.verbose('', 'Sending message: %s, to %s', message, mobile[0]);

	nexmo.send(mobile[0], message, function(err) {
		log.error('', 'Error sending SMS:');
		log.error('', err);
	});
};
