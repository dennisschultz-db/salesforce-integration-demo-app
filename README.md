# Salesforce Integration Demo App

## About
This app demonstrates both inbound and outbound integrations to a Salesforce org.  In the inbound scenario, this app uses the REST API to modify a few selected fields on existing Work Order records.  In the outbound scenario, this app updates the UI dynamically in response to Platform Events being published by the Salesforce org when fields are updated through the Salesforce UI.

## Prerequisites
You need a Salesforce org.  This can be a Developer Org available at https://developer.salesforce.com/signup.

This app runs on Node.js.  As written, it runs on a local Node.js instance but it could easily be deployed to Heroku as well.

## Salesforce Org Setup
1. Create a Connected App in your Salesforce org.  Configure for OAuth.  Callback URL = https://localhost:8080/auth/callback.  Grant at least api, web, and refresh_token scopes.  Make note of the Consumer Key and Consumer Secret.
2. Create a Validation Rule on the Work Order object.  This will be used to demonstrate that workflows defined for the UI are also applicable and enforced for API access.
+ Error Condition Formula = ISPICKVAL(Status, "Completed") && ISBLANK(Description)
+ Error Message = Completed Work Order must have a Description
3. Create a Platform Event named WorkOrderUpdated.  Add the following custom fields:
+ Description - Text(255)
+ Status - Text(255)
+ Subject - Text(255)
+ WorkOrderId - Text(18)
+ WorkOrderNumber - Text(255)
4. Create a Process Builder process named *Work Order Update Events* triggered whenever a Work Order is created or changed.
+ Criteria - Whenever IS CHANGED is TRUE for the Subject, Status or Description fields
+ Immediate Action - Create a WorkOrderUpdated platform event.  Assign the corresponding field references from the WorkOrder record to the platform event fields.

## Installation
```sh
$ cd ~
$ git clone git https://github.com/dschultz-mo/salesforce-integration-demo-app.git
$ cd salesforce-integration-demo-app
$ npm install
```

The connection parameters for the Salesforce org are maintained in a .env file at the root of the project.  You must manually create this file and populate its contents:

```
CLIENT_ID=<id>
CLIENT_SECRET=<secret>
SFUSERNAME=<username>
SFPASSWORD=<password>
SECURITY_TOKEN=<token>
```

You can now build and start the code with

```sh
$ npm run build-n-start
```

Your app should now be running on [localhost:5000](http://localhost:8080/).

## Demonstration
### Inbound
1.  From the Node.js app, you should see a list of the most recent 25 Work Orders.  
1.  Drill into one and make a change to the Status, Subject and/or Description.
1.  Refresh your view in the Salesforce UI and you should see the changes.

### Outbound
1.  Activate the *Work Order Update Events* Process Builder process
1.  Make a change to the Status, Subject and/or Description fields of a Work Order in the Salesforce UI.
1.  Save your change.  You should immediately see the changes reflected in the Work Order in the Node.js app.

## Credits
Original Northern Trail Outfitters Manufacturing app source: https://github.com/ccoenraets/northern-trail-manufacturing
OAuth architecture and code borrowed heavily from source: https://github.com/pozil/bear-watch
