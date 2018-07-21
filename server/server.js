// 3rd party dependencies
var express = require('express');
var path = require('path');
var dotenv = require('dotenv');
var Promise = require("bluebird");
var nforce = require('nforce');
var session = require('express-session');

// App dependencies
var config = require('./config');

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
		subscribeToPlatformEvents(curSession.sfdcAuth, JSON.parse(userData).organization_id);

		// Return user data
		response.send(userData);
		return;
	});
});


/**
 * Endpoint for retrieving all work orders
 */
app.get('/workorders', function (request, response) {

	org.query({ query: "Select Id, WorkOrderNumber, WorkTypeId, Subject, Status from WorkOrder Order By LastModifiedDate DESC Limit 25" })
    .then(function(results){
		response.json(results.records);
		return;
    });
});

/**
 * Endpoint for retrieving details of a single work order
 */
app.get('/workorders/:woId', function (request, response) {

	console.log('workorder detail ' + request.params);
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
 * Endpoint for publishing approval of a given mix
 */
app.get('/approvals/:mixId', function (request, response) {
	var curSession = getSession(request, response, true);
	console.log('/approvals/:mixId sfdcAuth ' + JSON.stringify(curSession.sfdcAuth));
	if (curSession == null)
		return;

	let mixId = request.params.mixId;

	var apiRequestOptions = sfdc.data.createDataRequest(curSession.sfdcAuth, 'sobjects/Mix_Approved__e');
	apiRequestOptions.body = {
		"Mix_Id__c": mixId,
		"Confirmation_Number__c": "xyz123"
	};
	apiRequestOptions.json = true;

	httpClient.post(apiRequestOptions, function (error, payload) {
		if (error) {
			console.error('Force.com data API error: ' + JSON.stringify(error));
			response.status(500).json(error);
			return;
		} else {
			response.send(payload.body);
			return;
		}
	});
});

// Subscribe to Salesforce Platform Events using
// Faye and Bayeux
let faye = require('faye');
let bayeux = new faye.NodeAdapter({mount: '/faye', timeout: 45});
bayeux.attach(server);
bayeux.on('disconnect', function(clientId) {
    console.log('Bayeux server disconnect');
});

// Subscribe to Platform Events
let subscribeToPlatformEvents = (auth, id) => {
	console.log('subscribeToPlatformEvents');
    var client = new faye.Client(auth.instance_url + '/cometd/40.0/');
    client.setHeader('Authorization', 'OAuth ' + auth.access_token);
    client.subscribe('/event/Mix_Submitted__e', function(message) {
		// Send message to all connected Socket.io clients
		console.log("***************");
		console.log("Server received Platform Event Mix_Submitted__e");
		console.log("  message " + JSON.stringify(message));
		console.log(' emitting ' + 'mix_submitted-' + id);
        io.of('/').emit('mix_submitted-' + id, {
            mixId: message.payload.Mix_Id__c,
            mixName: message.payload.Mix_Name__c,
			account: message.payload.Account__c
        });
    }.bind(this));
    client.subscribe('/event/Mix_Unsubmitted__e', function(message) {
        // Send message to all connected Socket.io clients
		console.log("***************");
		console.log("Server received Platform Event Mix_Unsubmitted__e");
		console.log("  message " + JSON.stringify(message));
		console.log(' emitting ' + 'mix_unsubmitted-' + id);
        io.of('/').emit('mix_unsubmitted-' + id, {
            mixId: message.payload.Mix_Id__c,
        });
    }.bind(this));
};

server.listen(app.get('port'), function () {
	console.log('Server started on port ' + app.get('port') + '/');
});
