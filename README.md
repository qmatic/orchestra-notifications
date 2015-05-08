# Orchestra Notifications

Send customer notifications on Orchestra events

## Overview

Extended the original application to send notifications to customers,  Additional configuration in branches.json allows settings per branch.
Relies on the [orchestra-events](https://github.com/qmatic/orchestra-events) application to recieve events.

![sms_1](../master/docs/sms_1.png) ![sms_2](../master/docs/sms_2.png)

![iphone_1](../master/docs/iphone_1.png) ![iphone_2](../master/docs/iphone_2.png) ![iphone_3](../master/docs/iphone_3.png)

## Functionality

* Registers itself to recieve events from the orchestra-events application via web-hooks.
* Handles VISIT_CREATE and VISIT_CALL events
* Sends SMS to customers on events
* Provides URL in SMS message for customer to monitor progress

## SMS

Uses [Nexmo](https://www.nexmo.com) SMS service that provides global SMS coverage.

## URL Shortening

Uses [Bitly](https://bitly.com) service to shorten URLs before sending in SMS message body.

## Using

* You must have a running Orchestra system v5.3 >
* Deploy [orchestra-events](https://github.com/qmatic/orchestra-events) application to running Orchestra instance
* Sign-up for a [Bitly](https://bitly.com) account (its free), and create an API key
* Sing-up for a [Nexmo](https://www.nexmo.com) account (a free trial is offered)
* Clone this repo `git clone git@github.com:qmatic/orchestra-notifications.git`
* Install [node.js](http://nodejs.org)
* Run `npm install` from repo root to install node.js dependencies
* Apply configuration in [config.yml](../master/config.yml)
* Run `node app` from repo root to start server

## Configuration

Settings can be configured in the [config.yml](../master/config.yml) YAML file:

```
default:
  port: 9090                                         # port http server listens on
  url: "http://192.168.1.8:9090"                     # URL to recieve events on
  orchestra:
    host: localhost                                  # Hostname / IP of orchestra host
    port: 8080                                       # HTTP port orchestra is running on
    user: myuser                                     # Username used when calling Orchestra entrypoint REST interface
    password: mypassword                             # Password used when calling Orchestra entrypoint REST interface
    hookurl: "http://localhost:8080/qpevents/hooks"  # URL to orchestra-events web-hook endpoint
  visit:
    url: "http://192.168.1.8:9090"                   # Base URL used in SMS messages
    position: 5                                      # Position in queue that will be notified on VIST_CALL events
    phone_param: "mobile"                            # Parameter on visit that holds the mobile phone number SMS is sent to
    customer_param: "customers"                      # Parameter on visit that holds customer name
  bitly:
    id: "user@example.com"                           # Bitly user account id
    secret: password                                 # Bitly user account password
    token: XXXXXXXXXXXXXXXXXXXXXXXXXXXX              # Bitly api token
  nexmo:
    key: xxxxxxx                                     # Nexmo API key
    secret: xxxxxxxx                                 # Nexmo API secret
```

Uses the [node-yaml-config](https://www.npmjs.org/package/node-yaml-config) package.


## Branch Settings

branches.js is used for configuring per branch.  To add a branch, copy and extend the json.

```
{
"branchId" : 1,						
	"branchName" : "My Branch Name",
	"smsFromName" : "Branch",							    # Name displayed as SMS sender (keep short)
	"companyFolder" : "qmatic",								# Folder location for status pages within /views - this allows customisation per "company" (additional reference to css and image files within each html)
	"events" : 
		{
		"VISIT_CREATE" : true,
		"VISIT_CALL" : true,
		"VISIT_TRANSFER_TO_QUEUE" : false, 					# NOT IMPLEMENTED
		"VISIT_TRANSFER_TO_USER_POOL" : false,				# NOT IMPLEMENTED
		"VISIT_TRANSFER_TO_SERVICE_POINT_POOL" : false,		# NOT IMPLEMENTED
		"VISIT_END" : true
		},
	"eventMessages" : 
		{
		"visit_create_below_queue_position_message" : "Hi {{NAME}}, your visit ref is: {{VISIT}}.  You are currently {{POSITION}} in the queue. {{LINK}}",
		"visit_create_above_queue_position_message" : "Hi {{NAME}}, your visit ref is: {{VISIT}}.  You are currently {{POSITION}} in the queue, we will notify when to return. {{LINK}}",
		"appointment_arrive_message" : "Hi {{NAME}}, we shall call you shortly for your {{SERVICE}} appointment, your visit ref is: {{VISIT}}.",
		"visit_call_message" : "Hi {{NAME}}, Please go to {{SERVICEPOINT}}, where {{STAFF}} is waiting to serve you.",
		"visit_callback_message" : "Hi {{NAME}}, We shall be ready to serve you soon, please make your way back to {{BRANCH}}.",
		"transfer_to_queue_message" : "",
		"transfer_to_user_message" : "",
		"transfer_to_servicepoint_message" : "",
		"visit_ended_message" : "Thank you for visiting {{BRANCH}}, we look forward to seeing you again soon."
		},
	"enableCallbackMessage" : true,
	"queuePositionToNotify" : 3
}
```

The following message parameters can be used:

* {{NAME}} = Customer Name
* {{VISIT}}	= Ticket Id
* {{BRANCH}} = Branch Name
* {{SERVICE}} = Service Name
* {{QUEUE}}	= Queue Name
* {{STAFF}}	= Staff first Name
* {{SERVICEPOINT}} = ServicePoint Name
* {{POSITION}} = Queue Position
* {{LINK}} = Link to url to check progress
* {{CUSTOM1}} = Custom1 visit parameter
* {{CUSTOM2}} = Custom2 visit parameter
* {{CUSTOM5}} = Custom3 visit parameter
* {{CUSTOM4}} = Custom4 visit parameter
* {{CUSTOM5}} = Custom5 visit parameter



## Customising

### Progress Page

The HTML page that is provided via a URL in the SMS message for customers to track progress can be customised to meet specific requirements. 

The [swig](http://paularmstrong.github.io/swig/) templating engine is used to provide the HTML content, source HTML is found in /views. All static CSS and JavaScript resources are located in the /public directory.

[Grunt](http://gruntjs.com) tasks are already defined to provide some basic minification and concatenation of css, js, and image resources. To use install the grunt cli if not already installed:

	npm install -g grunt-cli

and run `grunt` from the repo root. 

For more information see the [Grount documentation](http://gruntjs.com/getting-started).


### Events

You could also update event.js to handle other events, see the orchestra-events [wiki](https://github.com/qmatic/orchestra-events/wiki/Events) for a list of events and their payloads.

### SMS

The SMS provider could also be easily swapped out for a different implementation if desired.

## License

The Orchestra Notifications is licensed under the MIT License. Details can be found in the file LICENSE.