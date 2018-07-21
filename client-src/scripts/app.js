var React = require('react'),
  ReactDOM = require('react-dom');

var BrowserRouter = require('react-router-dom').BrowserRouter;
var App = require('./AppComponent.js');

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById('content')
);
