var $ = require('jquery'),
	React = require('react');

var Mix = require('./MixComponent.js');
var io = require('../assets/socket.io.js');
var socket = io();

var MixList = module.exports = React.createClass({
	getInitialState: function () {
		return {
			mixes: null
		};
	},

    onSubmitMix : function (newMix) {
        // if the mix is alresdy in the list: do nothing
        var exists = false;
        var _mixes = this.state.mixes;
        _mixes.forEach(function(mix) {
            if (mix.mixId == newMix.mixId) {
                exists = true;
            }
        });
        // if the mix is not in the list: add it
        if (!exists) {
            _mixes.push(newMix);
            this.setState({
                mixes : _mixes
            });
        }
    },


	componentDidMount: function () {
        // Get Mixes
        console.log('MixListComponent:componentDidMount');

        socket.on('mix_submitted', function(newMix) {
            console.log('New mix socket event occured for ' + JSON.stringify(newMix));
            this.onSubmitMix(newMix);
        }.bind(this));

        socket.on('mix_unsubmitted', function(mix) {
            console.log('Unsubmit mix socket event occured for ' + JSON.stringify(mix.mixId));
            this.deleteMix(mix.mixId);
        }.bind(this));


        $.ajax({
            url: '/mixes',
            dataType: 'json',
            success: function (data) {
                this.setState({
                    mixes: data
                });
            }.bind(this),
            error: function (xhr, status, err) {
                if (xhr.status != 401) // Ignore 'unauthorized' responses before logging in
                    console.error('Failed to retrieve mixes.');
            }.bind(this)
        });
	},
	
    deleteMix: function(mixId) {
        console.log('deleting mix ' + mixId);
        var _mixes = this.state.mixes;
        var index = _mixes.length - 1;
        while (index >= 0) {
            if (_mixes[index].mixId === mixId) {
                _mixes.splice(index, 1);
            }
            index -= 1;
        }
        this.setState({
            mixes: _mixes
        });
    },

	render: function() {
        return (
            <div>
             { this.state.mixes ?
				<div className="row">
					{ this.state.mixes.map(function(mix, index){
						return <Mix key= {index} mix = {mix} onApproval= {this.deleteMix}/>; 
					}.bind(this))}
				</div>
            :
                <div> No mixes </div>
            }
            </div>
      );
    }
});
