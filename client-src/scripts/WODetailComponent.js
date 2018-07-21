var $ = require('jquery'),
	React = require('react');
var io = require('../assets/socket.io.js');
var socket = io();
  
var WODetail = module.exports = React.createClass({
	getInitialState: function () {
		return null;
	},

	componentDidMount: function () {
    // Get this Work Order
    console.log('WODetailComponent:componentDidMount ' + JSON.stringify(this.props.match.params.id));

    socket.on('mix_submitted-' + this.props.id, function(newMix) {
         console.log('New mix socket event occured for ' + JSON.stringify(newMix));
         this.onSubmitMix(newMix);
    }.bind(this));

    socket.on('mix_unsubmitted-' + this.props.id, function(mix) {
        console.log('Unsubmit mix socket event occured for ' + JSON.stringify(mix.mixId));
        this.deleteMix(mix.mixId);
    }.bind(this));


    $.ajax({
        url: '/workorders/' + this.props.match.params.id,
        dataType: 'json',
        success: function (data) {
            this.setState({
                workorder: data
            });
            console.log('workorder ' + JSON.stringify(data));
        }.bind(this),
        error: function (xhr, status, err) {
            if (xhr.status != 401) // Ignore 'unauthorized' responses before logging in
                console.error('Failed to retrieve mixes.');
        }.bind(this)
    });
},

render: function() {
    return (
        <div>I'm here</div>
    );
  }
});
