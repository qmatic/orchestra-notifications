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
var S = require('string');

var phone_param = "mobile";
var customer_param = "customers";

// Fetch branch settings
var branches = require('./branches.json');

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
			// return immediately, and handle in background...
			callback();
			//Get the branch configuration for the event received 
			for(var i = 0; i<branches.length; i++) {
				if(branches[i].branchId == event.parameters.branchId){
					//log.info('','Branch configuration found for: %s', event.parameters.branchName);
					switch(event.eventName) {
					case 'VISIT_CREATE':
						if(branches[i].events.VISIT_CREATE && event.parameters[phone_param] != undefined){
							log.info('','visit create event recieved for: %s', event.parameters.branchName);
							if('appointmentId' in event.parameters){
								handleAppointmentArrive(event, branches[i]);
							}else{
								handleVisitCreate(event, branches[i]);
							}
						}
						break;
						
					case 'VISIT_CALL':
						if(branches[i].events.VISIT_CALL)
							log.info('','visit call event recieved for: %s', event.parameters.branchName);
							handleVisitCall(event, branches[i]);
						break;
						
					case 'VISIT_END':
						if(branches[i].events.VISIT_END)
							log.info('','visit end event recieved for: %s', event.parameters.branchName);
							handleVisitEnd(event, branches[i]);
						break;
						
					default:
						break;
					}
				
				}
			}
		}
	};
};

handleAppointmentArrive = function(event, setting) {
	// get the visit
	ep.visit(event.parameters.branchId, event.parameters.visitId, function(err, visit) {
		if(err) {
			log.error('','Error fetching visit:');
			log.error('', err);
		} else {
			if(visit == null) {
				log.warn('', 'Visit not found in system.');
			} else {
				// create message
				var msg = setting.eventMessages.appointment_arrive_message;
				//Replace any msg parameters 
				msg = replaceMessageParams(msg,visit,event,'0');
								
				//Check msg for link parameter
				if(msg.indexOf("{{LINK}}") != -1){
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
							sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
						} else {
							// add url to message
							msg = msg.replace(/{{LINK}}/, shortUrl);
							sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
						}
					});
				}else{
					sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
				}
			}
		}
	});
};

handleVisitCreate = function(event, setting) {
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
					var msg = "";
					if(position > 0 && position < (setting.queuePositionToNotify+1)){
						msg = setting.eventMessages.visit_create_below_queue_position_message;
					}else{
						msg = setting.eventMessages.visit_create_above_queue_position_message;
					}
					
					//Replace any msg parameters 
					msg = replaceMessageParams(msg,visit,event,position);
					
					//Check msg for link parameter
					if(msg.indexOf("{{LINK}}") != -1){
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
								log.info('','Sending visit create message without link due to shorten error');	
								sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
							} else {
								// add url to message
								msg = msg.replace(/{{LINK}}/, shortUrl);
								log.info('','Sending visit create message with link');	
								sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
							}
						});
					}else{
						log.info('','Sending visit create message without link');	
						sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
					}
				});
			}
		}
	});
};

handleVisitCall = function(event, setting) {
	// check for existence of the phone number param to send SMS to, if it doesn't exists there is nothing further we can do...
	if(event.parameters[phone_param] != undefined) {
		//Send Message to customer for current ticket call
		// get the visit
		ep.visit(event.parameters.branchId, event.parameters.visitId, function(err, visit) {
			if(err) {
				log.error('','Error fetching visit:');
				log.error('', err);
			} else {
				if(visit == null) {
					log.warn('', 'Visit not found in system.');
				} else {
					// create message
					var msg = setting.eventMessages.visit_call_message;
					//Replace any msg parameters 
					msg = replaceMessageParams(msg,visit,event,'0');
					log.info('','Sending visit call message');			
					sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
				}
			}
		});
	}
	
	//Send message to customer at X in the queue to return back to branch
	if(setting.enableCallbackMessage){
		//Wait a second for previous visit call message to be sent
		setTimeout(function () {
		  handleVisitCallBack(event, setting);
		}, 1000)
	}
};

handleVisitCallBack = function(event, setting) {
	// get the visit from the queue for specified position
	ep.visitAtPosition(event.parameters.branchId, event.parameters.queueId, setting.queuePositionToNotify, function(err, visit) {
		if(err) {
			log.error('','Error fetching visit:');
			log.error('', err);
		} else {
			if(visit == null) {
				log.warn('', 'Callback visit not found at position %d', setting.queuePositionToNotify);
			} else {
				// get the visit
				ep.visit(event.parameters.branchId, visit.visitId, function(err, visit) {
					if(err) {
						log.error('','Error fetching callback visit:');
						log.error('', err);
					} else {
						if(visit == null) {
							log.warn('', 'Callback visit not found in system.');
						} else {
							if(visit.parameterMap[phone_param] == undefined) {
								log.info('','Callback visit does not contain phone param: %s', phone_param);
								return;
							}
							if(!typeof visit.appointmentId == null){
								log.info('','Callback visit is an appointment, they should already be here!');
								return;
							}
							
							// create message
							var msg = setting.eventMessages.visit_callback_message;
							//Replace any msg parameters 
							msg = replaceMessageParams(msg,visit,event,'0');
							log.info('','Sending visit callback message');						
							sendMessage(visit.parameterMap[phone_param], msg, setting.smsFromName);
						}
					}
				});
			}
		}
	});
};

handleVisitEnd = function(event, setting) {
	// check for existence of the phone number param to send SMS to, if it doesn't exists there is nothing further we can do...
	if(event.parameters[phone_param] != undefined) {
		var msg = setting.eventMessages.visit_ended_message;
		//Replace any msg parameters - have to do it here as we do not have the visit
		msg = msg.replace(/{{BRANCH}}/, event.parameters.branchName);
		log.info('','Sending visit end message');		
		sendMessage(event.parameters[phone_param], msg, setting.smsFromName);
	}
};


replaceMessageParams = function(msg, visit, event, position){
	msg = msg.replace(/{{NAME}}/, visit.parameterMap[customer_param]);
	msg = msg.replace(/{{VISIT}}/, visit.ticketId);
	msg = msg.replace(/{{BRANCH}}/, visit.parameterMap.branchName);
	msg = msg.replace(/{{SERVICE}}/, visit.currentVisitService.serviceExternalName);
	msg = msg.replace(/{{QUEUE}}/, event.parameters.queueName);
	msg = msg.replace(/{{STAFF}}/, event.parameters.firstName);
	msg = msg.replace(/{{SERVICEPOINT}}/, event.parameters.servicePointName);
	msg = msg.replace(/{{POSITION}}/, numeral(position).format('0o'));
	msg = msg.replace(/{{CUSTOM1}}/, visit.parameterMap.custom1);
	msg = msg.replace(/{{CUSTOM2}}/, visit.parameterMap.custom2);
	msg = msg.replace(/{{CUSTOM3}}/, visit.parameterMap.custom3);
	msg = msg.replace(/{{CUSTOM4}}/, visit.parameterMap.custom4);
	msg = msg.replace(/{{CUSTOM5}}/, visit.parameterMap.custom5);
	return msg;
};

sendMessage = function(number, message, sender) {
	
	//Check if UK number, if starting with "07" then strip and add UK country code
	var intlCode = '+44';
	if(S(number).left(2).s == 07){			
		number = intlCode + S(number).chompLeft('0').s;
	}
	
	// validate mobile number and format correctly via phone module (https://github.com/AfterShip/node-phone)
	var mobile = phone(number);

	if(mobile.length == 0) {
		log.warn('', 'Invalid phone number: %s, cannot send SMS.', number);
		return;
	}
	
	log.verbose('', 'Sending message: %s, to %s', message, mobile[0]);

	nexmo.send(sender, mobile[0], message, function(err) {
		log.error('', 'Error sending SMS:');
		log.error('', err);
	});
};
