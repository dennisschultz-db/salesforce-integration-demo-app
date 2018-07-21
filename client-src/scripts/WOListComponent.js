var $ = require('jquery'),
	React = require('react');

var WorkOrder = require('./WOComponent.js');
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
        console.log('WOListComponent:componentDidMount');

        socket.on('mix_submitted-' + this.props.id, function(newMix) {
            console.log('New mix socket event occured for ' + JSON.stringify(newMix));
            this.onSubmitMix(newMix);
        }.bind(this));

        socket.on('mix_unsubmitted-' + this.props.id, function(mix) {
            console.log('Unsubmit mix socket event occured for ' + JSON.stringify(mix.mixId));
            this.deleteMix(mix.mixId);
        }.bind(this));


        $.ajax({
            url: '/workorders',
            dataType: 'json',
            success: function (data) {
                this.setState({
                    workorders: data
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

                <div className="slds-page-header" role="banner">
                    <div className="slds-grid">

                        <div className="slds-col">
                            <div className="slds-media">

                                <div className="slds-media__figure">
                                    <span className="slds-avatar slds-avatar--large">
                                        <img src="assets/images/avatar1.jpg" alt="portrait" />
                                    </span>
                                </div>

                                <div className="slds-media__body">
                                    <p className="slds-text-heading--label">Work Orders</p>
                                    <h1 className="slds-text-heading--medium">My Work Orders</h1>
                                </div>
                            </div>
                        </div>

                        <div className="slds-col slds-no-flex slds-align-middle">
                            <div className="slds-button-group" role="group">
                                <a className="slds-button slds-button--neutral" href="/new">New Work Order</a>
                            </div>
                        </div>

                    </div>
                </div>


                <div className="myapp">
                    <div className="slds-scrollable--x">

                        { this.state.workorders ?
                            <table className="slds-table slds-table--bordered">
                            <thead>
                                <tr>
                                <th scope="col"></th>
                                <th scope="col">Work Order Number</th>
                                <th scope="col">Subject</th>
                                <th scope="col">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                { this.state.workorders.map(function(workorder, index){
                                    return <WorkOrder key= {index} workorder = {workorder} onApproval= {this.deleteWorkorder}/>; 
                                }.bind(this))}
                            </tbody>
                            </table>
                        :
                            <div> No workorders </div>
                        }

                    </div>
                </div>

            </div>
        );
    }
});
