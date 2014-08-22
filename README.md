# Orchestra Notifications

Send customer notifications on Orchestra events

## Overview

Application to send notifications to customers, relies on the [orchestra-events](https://github.com/qmatic/orchestra-events) application to recieve events.

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

## Customising

### Progress Page

The HTML page that is provided via a URL in the SMS message for customers to track progress can be customised to meet specific requirements. 

The [swig](http://paularmstrong.github.io/swig/) templating engine is used to provide the HTML content, source HTML is found in /views. All static CSS and JavaScript resources are located in the /public directory.

[Grunt](http://gruntjs.com) tasks are already defined to provide some basic minification and concatenation of css, js, and image resources. To use install the grunt cli if not already installed:

	npm install -g grunt-cli

and run `grunt` from the repo root. 

For more information see the [Grount documentation](http://gruntjs.com/getting-started).

### Filtering

The default implementation will try and send an SMS for each VISIT_CALL and VISIT_CREATE event received, in reality that is probably not a wanted situation and you will
want to add your own logic to filter events by service etc.

For convenience a method has already been added in [events.js](../master/events.js) that is called on receiving an event:

```java
validateEvent = function(event) {
	
	//TODO - handle any logic here for filtering by branch, service, queue, or any other params on the event
	// default implementation sends messages for all visits created and called...
		
	return true;
};
```
### Events

You could also update event.js to handle other events, see the orchestra-events [wiki](https://github.com/qmatic/orchestra-events/wiki/Events) for a list of events and their payloads.

### SMS

The SMS provider could also be easily swapped out for a different implementation if desired.

## License

The Orchestra Notifications is licensed under the MIT License. Details can be found in the file LICENSE.