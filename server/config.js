var config = {};


// Salesforce client settings for Force.com connection
config.sfdc = {
  // OAuth2 service
  auth : {
    // OAuth authentication domain
    // For production or DE use
    //domain : 'https://login.salesforce.com',
    // For sandbox use
    domain : 'https://test.salesforce.com',

    // URL called by Force.com after authorization and used to extract an authorization code.
    // This should point to your app and match the value configured in your App in SFDC setup)
    callbackUrl : 'https://dws-platform-events.herokuapp.com/auth/callback',

    // Set of secret keys that allow your app to authenticate with Force.com
    // These values are retrieved from your App configuration in SFDC setup.
    // NEVER share them with a client.
    consumerKey : '3MVG9uudbyLbNPZP7aQ7CnYiXVgGwQ8vT7DSjQoDKu26QtBuzJHWtwAgS5..BpbJjzJUEjF9rceAdXx7JSYJ9',
    consumerSecret : '2353754977662899459',
  },
  // Data service
  data : {
    // Force.com API version
    apiVersion : 'v41.0'
  }
};


// Express server configuration
config.server = {
  // Server HTTP port
  port : 3000,

  // Whether the server is configured with HTTPS
  isHttps : false,

  // Secret key used to encrypt user sessions
  sessionSecretKey : 'platformeventsrock'
};


module.exports = config;
