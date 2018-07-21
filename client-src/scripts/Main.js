var React = require('react'),
  ReactDOM = require('react-dom');

var Switch = require('react-router-dom').Switch;
var Route = require('react-router-dom').Route;

var WOList = require('./WOListComponent.js');
var WODetail = require('./WODetailComponent.js');

var Main = module.exports = React.createClass({
    render: function() {
        return (
            <Switch>
                <Route exact path='/' component={WOList}/>
                <Route path='/workorder/:id' component={WODetail}/>
            </Switch>
        );
    }
});
    