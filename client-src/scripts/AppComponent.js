var $ = require('jquery'),
  React = require('react');

var NavBar = require('./NavBarComponent.js');
var Main = require('./Main.js');


var App = module.exports = React.createClass({
  getInitialState: function() {
    return {
      user: null
    };
  },

  render: function() {
    return (
      <div>
        <NavBar />
        <Main />
      </div>
    );
  }
});
