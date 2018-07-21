var config = {};


// Salesforce client settings for Force.com connection
config.sfdc = {
  // OAuth2 service
  auth : {
    // OAuth authentication domain
    // For production or DE use
    domain : 'https://login.salesforce.com',
    // For sandbox use
    //domain : 'https://test.salesforce.com',

    // URL called by Force.com after authorization and used to extract an authorization code.
    // This should point to your app and match the value configured in your App in SFDC setup)
    callbackUrl : 'https://localhost:8080/auth/callback',

    // Set of secret keys that allow your app to authenticate with Force.com
    // These values are retrieved from your App configuration in SFDC setup.
    // NEVER share them with a client.
    consumerKey : '3MVG9oNqAtcJCF.EHMiss3trv1.BqKS36Lj40k5aowxt7ZyzjaM4NCxNwWVmsDKMJ8iWiN155BYvlCKEY1gCH',
    consumerSecret : '8649432588843192933',
  },
  // Data service
  data : {
    // Force.com API version
    apiVersion : 'v43.0'
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
