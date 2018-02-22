// 3rd party dependencies
var httpClient = require("request"),
	path = require('path'),
	express = require('express'),
	session = require('express-session'),
	pgSession = require('connect-pg-simple')(session),
	SalesforceClient = require('salesforce-node-client');

// App dependencies
var config = require('./config');

// Configure Salesforce client while allowing command line overrides
if (process.env.sfdcDomain)
	config.sfdc.auth.domain = process.env.sfdcAuthDomain;
if (process.env.sfdcAuthConsumerKey)
	config.sfdc.auth.consumerKey = process.env.sfdcAuthConsumerKey;
if (process.env.sfdcAuthConsumerSecret)
	config.sfdc.auth.consumerSecret = process.env.sfdcAuthConsumerSecret;
if (process.env.sfdcAuthCallbackUrl)
	config.sfdc.auth.callbackUrl = process.env.sfdcAuthCallbackUrl;

var sfdc = new SalesforceClient(config.sfdc);

// Prepare command line overrides for server config
if (process.env.isHttps)
	config.server.isHttps = (process.env.isHttps === 'true');
if (process.env.sessionSecretKey)
	config.server.sessionSecretKey = process.env.sessionSecretKey;

// Setup HTTP server
var app = express();
var port = process.env.PORT || 8080;
app.set('port', port);
let server = require('http').Server(app);
const socketIO = require('socket.io');
const io = socketIO(server);


// Enable server-side sessions
app.use(session({
	store: new pgSession(), // Uses default DATABASE_URL
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
			console.log('authenticate sfdcAuth ' + JSON.stringify(payload));

			console.log("===================");
			console.log("subscribeToPlatformEvents from authenticate");
				subscribeToPlatformEvents(payload);

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
		console.log("===================");
		console.log("subscribeToPlatformEvents from getLoggedUser");
		subscribeToPlatformEvents(curSession.sfdcAuth);

		// Return user data
		response.send(userData);
		return;
	});
});


/**
 * Endpoint for retrieving all mixes submitted to manufacturing
 */
app.get('/mixes', function (request, response) {
	var curSession = getSession(request, response, true);
	console.log('/mixes sfdcAuth ' + JSON.stringify(curSession.sfdcAuth));
	if (curSession == null)
		return;

	let q = encodeURI("SELECT Id, Name, Account__r.Name FROM Merchandising_Mix__c WHERE Status__c='Submitted to Manufacturing'");

	var apiRequestOptions = sfdc.data.createDataRequest(curSession.sfdcAuth, 'query?q=' + q);
	apiRequestOptions.json = true;

	httpClient.get(apiRequestOptions, function (error, payload) {
		if (error) {
			console.error('Force.com data API error: ' + JSON.stringify(error));
			response.status(500).json(error);
			return;
		} else {
			let mixes = payload.body.records;
			let prettyMixes = [];
			mixes.forEach(mix => {
				prettyMixes.push({
					mixId: mix.Id,
					mixName: mix.Name,
					account: mix.Account__r.Name
				});
			});
			response.json(prettyMixes);
			return;
		}
	});
});

/**
 * Endpoint for retrieving details of a single mix
 */
app.get('/mixes/:mixId', function (request, response) {
	var curSession = getSession(request, response, true);
	console.log('/mixes/:mixId sfdcAuth ' + JSON.stringify(curSession.sfdcAuth));
	if (curSession == null)
		return;

	let mixId = request.params.mixId;
	let q = encodeURI("SELECT Id, Merchandise__r.Name, Merchandise__r.Price__c, Merchandise__r.Category__c, Merchandise__r.Picture_URL__c, Qty__c " +
		"FROM Mix_Item__c " +
		"WHERE Merchandising_Mix__c = '" + mixId + "'");

	var apiRequestOptions = sfdc.data.createDataRequest(curSession.sfdcAuth, 'query?q=' + q);
	apiRequestOptions.json = true;

	httpClient.get(apiRequestOptions, function (error, payload) {
		if (error) {
			console.error('Force.com data API error: ' + JSON.stringify(error));
			response.status(500).json(error);
			return;
		} else {
			let mixItems = payload.body.records;
			let prettyMixItems = [];
			mixItems.forEach(mixItem => {
				prettyMixItems.push({
					productName: mixItem.Merchandise__r.Name,
					price: mixItem.Merchandise__r.Price__c,
					pictureURL: mixItem.Merchandise__r.Picture_URL__c,
					mixId: mixItem.Id,
					productId: mixItem.Merchandise__r,
					qty: mixItem.Qty__c
				});
			});
			response.json(prettyMixItems);
			return;
		}
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
let subscribeToPlatformEvents = (auth) => {
	console.log('subscribeToPlatformEvents sfdcAuth ' + JSON.stringify(auth));
    var client = new faye.Client(auth.instance_url + '/cometd/40.0/');
    client.setHeader('Authorization', 'OAuth ' + auth.access_token);
    client.subscribe('/event/Mix_Submitted__e', function(message) {
		// Send message to all connected Socket.io clients
		console.log("***************");
		console.log("Server received Platform Event Mix_Submitted__e");
		console.log("  message " + JSON.stringify(message));
		console.log(' emitting ' + 'mix_submitted-' + auth.id);
        io.of('/').emit('mix_submitted-' + auth.id, {
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
		console.log(' emitting ' + 'mix_unsubmitted-' + auth.id);
        io.of('/').emit('mix_unsubmitted-' + auth.id, {
            mixId: message.payload.Mix_Id__c,
        });
    }.bind(this));
};

server.listen(app.get('port'), function () {
	console.log('Server started on port ' + app.get('port') + '/');
});
