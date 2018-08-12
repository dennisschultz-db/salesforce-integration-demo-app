var $ = require('jquery'),
	React = require('react');

var WorkOrder = require('./WOComponent.js');
var io = require('../assets/socket.io.js');
var socket = io();

var WOList = module.exports = React.createClass({
	getInitialState: function () {
		return {
			workorders: null
		};
	},

    onWorkorderUpdated : function (updatedWorkorder) {
        var _self = this;
        // if the workorder is in the list, update it
        console.log('List onWororderUpdated');
        console.log('current workorders ' + JSON.stringify(this.state.workorders));
        var _workorders = this.state.workorders;
        _workorders.forEach(function(workorder) {
            if (workorder.id == updatedWorkorder.WorkOrderId) {
                console.log('updating ' + JSON.stringify(workorder) + ' with ' + JSON.stringify(updatedWorkorder));
                workorder.workordernumber = updatedWorkorder.WorkOrderNumber
                workorder.subject = updatedWorkorder.Subject
                workorder.description = updatedWorkorder.Description;
                workorder.status = updatedWorkorder.Status;
                _self.setState({
                    workorders: _workorders
                });
            }
        });
    },



	componentDidMount: function () {
        console.log('WOListComponent:componentDidMount');

        socket.on('workorder-updated', function(updatedWorkorder) {
            console.log('Updated workorder event occured for ' + JSON.stringify(updatedWorkorder));
            this.onWorkorderUpdated(updatedWorkorder);
        }.bind(this));
      
        // Get Workorders
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
                    console.error('Failed to retrieve work orders.');
            }.bind(this)
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
                                <th scope="col">Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                { this.state.workorders.map(function(workorder, index){
                                    return <WorkOrder key= {index} workorder = {workorder} />; 
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
