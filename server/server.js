// 3rd party dependencies
var express = require('express');
var path = require('path');
var dotenv = require('dotenv');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var Promise = require("bluebird");
var nforce = require('nforce');
var session = require('express-session');
var request = require('request');  // For demonstration of raw HTTP interaction with Salesforce

// App dependencies
var config = require('./config');

var subscriptionComplete = false;

dotenv.config({path: './.env'});
dotenv.load();


// Create connection to Salesforce
var org = nforce.createConnection({
	clientId: process.env.CLIENT_ID,
	clientSecret: process.env.CLIENT_SECRET,
	redirectUri: 'http://localhost:3000/oauth/_callback',
	environment: 'production',
	mode: 'single'
  });
  
  // Authenticate to Salesforce
  org.authenticate({ 
	username: process.env.SFUSERNAME, 
	password: process.env.SFPASSWORD
	}, function(err, resp){
	  // the oauth object was stored in the connection object
	  if(!err) {
		console.log('Cached Token: ' + org.oauth.access_token);
		
	  } else {
		console.log('error ' + err);
	  }
  
  });
  


// Setup HTTP server
var app = express();
var port = process.env.PORT || 8080;
app.set('port', port);
let server = require('http').Server(app);
const socketIO = require('socket.io');
const io = socketIO(server);

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());


// Enable server-side sessions
app.use(session({
	secret: config.server.sessionSecretKey,
	cookie: {
		secure: config.server.isHttps,
		maxAge: 60 * 60 * 1000 // 1 hour
	},
	resave: false,
	saveUninitialized: false
}));

// Serve HTML pages under root directory
app.use('/', express.static(path.join(__dirname, '../public')));


/**
 *  Attemps to retrieves the server session.
 *  If there is no session, redirects with HTTP 401 and an error message
 */
function getSession(request, response, isRedirectOnMissingSession) {
	var curSession = request.session;
	if (!curSession.sfdcAuth) {
		if (isRedirectOnMissingSession) {
			response.status(401).send('No active session');
		}
		return null;
	}
	return curSession;
}


/**
 * Login endpoint
 */
app.get("/auth/login", function (request, response) {
	// Redirect to Salesforce login/authorization page
	var uri = sfdc.auth.getAuthorizationUrl({
		scope: 'api'
	});
	return response.redirect(uri);
});


/**
 * Login callback endpoint (only called by Force.com)
 */
app.get('/auth/callback', function (request, response) {
	if (!request.query.code) {
		response.status(500).send('Failed to get authorization code from server callback.');
		return;
	}

	// Authenticate with Force.com via OAuth
	sfdc.auth.authenticate({
		'code': request.query.code
	}, function (error, payload) {
		if (error) {
			console.log('Force.com authentication error: ' + JSON.stringify(error));
			response.status(500).json(error);
			return;
		} else {
			// Store oauth session data in server (never expose it directly to client)
			var session = request.session;
			session.sfdcAuth = payload;

			// Redirect to app main page
			return response.redirect('/index.html');
		}
	});
});


/**
 * Logout endpoint
 */
app.get('/auth/logout', function (request, response) {
	var curSession = getSession(request, response, false);
	if (curSession == null)
		return;

	// Revoke OAuth token
	sfdc.auth.revoke({
		token: curSession.sfdcAuth.access_token
	}, function (error) {
		if (error) {
			console.error('Force.com OAuth revoke error: ' + JSON.stringify(error));
			response.status(500).json(error);
			return;
		}

		// Destroy server-side session
		curSession.destroy(function (error) {
			if (error)
				console.error('Force.com session destruction error: ' + JSON.stringify(error));
		});

		// Redirect to app main page
		return response.redirect('/index.html');
	});
});


/**
 * Endpoint for retrieving currently connected user
 */
app.get('/auth/whoami', function (request, response) {
	var curSession = getSession(request, response, false);
	if (curSession == null) {
		response.send({
			"isNotLogged": true
		});
		return;
	}

	// Request user info from Force.com API
	sfdc.data.getLoggedUser(curSession.sfdcAuth, function (error, userData) {
		if (error) {
			console.log('Force.com identity API error: ' + JSON.stringify(error));
			response.status(500).json(error);
			return;
		}

		// If existing session, subscribe to events
		subscribeToPlatformEvents(curSession.sfdcAuth);

		// Return user data
		response.send(userData);
		return;
	});
});


/**
 * Endpoint for retrieving all work orders
 */
app.get('/workorders', function (request, response) {

	if (!subscriptionComplete) {
		subscribeToPlatformEvents(org.oauth);
		subscriptionComplete = true;
	}

	org.query({ 
		query: "Select Id, WorkOrderNumber, WorkTypeId, Subject, Status, Description " +
		       "from WorkOrder Order By LastModifiedDate DESC Limit 25" 
	}).then(function(results){
		response.json(results.records);
		return;
    });
});

/**
 * Endpoint for retrieving details of a single work order
 */
app.get('/workorders/:woId', function (request, response) {

  // query for record, contacts and opportunities
  Promise.join(
    org.getRecord({ type: 'workorder', id: request.params.woId }),
    org.query({ query: "Select Id, Description, Status From WorkOrderLineItem where WorkOrderId = '" + request.params.woId + "'"}),
    org.query({ query: "Select Id, Contact.Name, Status, SchStartDateFormatted__c, SchStartTimeFormatted__c From ServiceAppointment where ParentRecordId = '" + request.params.woId + "'"}),
    function(workorder, lineitems, appointments) {
        response.json({ record: workorder, lineitems: lineitems.records, appointments: appointments.records });
	});
});

/**
 * Endpoint for publishing updates to a workorder
 */
app.get('/workorder/:woId', function(request, response) {
//	updateUsingNforce(request, response);
	updateUsingRequest(request, response);
});





// *********************************************
// Examples of multiple methods that can be used
// to update an existing Work Order record
// *********************************************

// *********************************************
// Updates a record using the Nforce library
//
// nforce is node.js a REST API wrapper for force.com, database.com, and salesforce.com.
// https://www.npmjs.com/package/nforce 
// *********************************************
function updateUsingNforce(request, response) {
	console.log(' ');
	console.log('Update workorder using Nforce library');
	var body = request.query;
	
	var wo = nforce.createSObject('WorkOrder');
	wo.set('Id', request.params.woId);
	wo.set('Subject', body.subject);
	wo.set('Status', body.status);
	wo.set('Description', body.description);
  
	org.update({ sobject: wo })
	  .then(function(workorder){
		  console.log("Updated record in Salesforce using Nforce");
		// Redirect to app main page
		return response.end('done');
	});
};





// *********************************************
// Updates a record using the Request library
// Request is designed to be the simplest way possible to make http calls.
// 
// https://www.npmjs.com/package/request
// https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/dome_update_fields.htm 
// *********************************************
function updateUsingRequest (req, response) {
	console.log('Update workorder using Request library');
	var body = req.query;

	// Use PATCH method to update existing records
	request.patch(
	  org.oauth.instance_url + '/services/data/v43.0/sobjects/WorkOrder/' + req.params.woId,
	  {headers: {
		'Authorization' : 'Bearer ' + org.oauth.access_token,
		'Content-Type': 'application/json'
	   },
	   body: JSON.stringify({
		  Subject: body.subject,
		  Status: body.status,
		  Description: body.description})
	  },
	  function(err,resp,body) {
		console.log('error:', err); // Print the error if one occurred
  
		// Redirect back to the record detail page
		return response.end('done');
	  });
  
  };
  



// *********************************************
// Using platform events to subscribe to 
// Work Order changes
// *********************************************
let faye = require('faye');
let bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
bayeux.attach(server);
bayeux.on('disconnect', function(clientId) {
    console.log('Bayeux server disconnect');
});

// Subscribe to Platform Events
let subscribeToPlatformEvents = (auth) => {
	console.log('subscribeToPlatformEvents');
  	var client = new faye.Client(auth.instance_url + '/cometd/43.0/');
  	client.setHeader('Authorization', 'OAuth ' + auth.access_token);
  	client.subscribe('/event/WorkOrderUpdated__e', function(message) {
		// Platform Event has been received
		console.log(' ');
	  	console.log("***************");
	  	console.log("Server received Platform Event WorkOrderUpdated__e");
	  	console.log("  message " + JSON.stringify(message, null, 2));
		// Send message to all connected Socket.io clients
    	io.of('/').emit('workorder-updated', {
      		WorkOrderId: message.payload.WorkOrderId__c,
      		WorkOrderNumber: message.payload.WorkOrderNumber__c,
      		Subject: message.payload.Subject__c,
      		Description: message.payload.Description__c,
      		Status: message.payload.Status__c
    	});
  	}.bind(this));
};



server.listen(app.get('port'), function () {
	console.log('Server started on port ' + app.get('port') + '/');
});
