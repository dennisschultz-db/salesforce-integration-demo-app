var $ = require('jquery'),
	React = require('react');
var io = require('../assets/socket.io.js');
var socket = io();
  
var WODetail = module.exports = React.createClass({
	getInitialState: function () {
		return {
      workorder :null
    };
	},

  onWorkorderUpdated : function (updatedWorkorder) {
    var _self = this;
    // if the workorder is in the list, update it
    console.log('Detail onWororderUpdated');
    var _workorder = this.state.workorder;
      if (_workorder.record.id == updatedWorkorder.WorkOrderId) {
          console.log('updating ' + JSON.stringify(_workorder) + ' with ' + JSON.stringify(updatedWorkorder));
          _workorder.record.workordernumber = updatedWorkorder.WorkOrderNumber
          _workorder.record.subject = updatedWorkorder.Subject
          _workorder.record.description = updatedWorkorder.Description;
          _workorder.record.status = updatedWorkorder.Status;
          _self.setState({
              workorder: _workorder
          });
        }
},


componentDidMount: function () {
    // Get this Work Order
    console.log('WODetailComponent:componentDidMount ' + JSON.stringify(this.props.match.params.id));

    socket.on('workorder-updated', function(updatedWorkorder) {
      console.log('Updated workorder event occured for ' + JSON.stringify(updatedWorkorder));
      this.onWorkorderUpdated(updatedWorkorder);
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

changeSubject: function(event) {
  console.log('subject=' + event.target.value);
  var wo = this.state.workorder;
  wo.record.subject = event.target.value;
  this.setState({workorder: wo});
},

changeStatus: function(event) {
  console.log('status=' + event.target.value);
  var wo = this.state.workorder;
  wo.record.status = event.target.value;
  this.setState({workorder: wo});
},

changeDescription: function(event) {
  console.log('description=' + event.target.value);
  var wo = this.state.workorder;
  wo.record.description = event.target.value;
  this.setState({workorder: wo});
},

onSubmit: function(event) {
  event.preventDefault();
  console.log('submit workorder ');

  $.ajax({
    url: '/workorder/' + this.state.workorder.record.id,
    data: this.state.workorder.record,
    dataType: "json",
    success: function (data) {
      if (data.status == 'failure') {
        alert ('Failed to update Work Order\n\n' + data.errorcode + '\n' + data.message);
      }
      console.log('posted workorder ');
      this.props.history.push('/')
    }.bind(this),
    error: function (xhr, status, err) {
        if (xhr.status != 401) // Ignore 'unauthorized' responses before logging in
            console.error('Failed to update workorder ' + xhr.status + ' ' + JSON.stringify(status));
            this.props.history.push('/')
          }.bind(this)
  });

  return false;
},

createSelectItems: function() {
  var items = [];
  var options =['New', 'Scheduled', 'Assigned', 'In Progress', 'Completed', 'Closed'];

  for (var i = 0; i < options.length; i++) {
//    if (this.state.workorder.record.status == options[i]) 
//      items.push(<option selected="selected" value={options[i]}>{options[i]}</option>);
//    else
      items.push(<option value={options[i]}>{options[i]}</option>);
  }

  return items;
},

render: function() {  
  
    return (
        <div>
          { this.state.workorder ?
            <div>
<div className="slds-page-header" role="banner">

  <div className="slds-grid">

    <div className="slds-col">

      <div className="slds-media">

        <div className="slds-media__figure">
          <svg aria-hidden="true" className="slds-icon slds-icon--large slds-icon-standard-user">
            <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#task"></use>
          </svg>
        </div>

        <div className="slds-media__body">
          <p className="slds-text-heading--label">Work Order</p>
          <h1 className="slds-text-heading--medium">{this.state.workorder.record.workordernumber}</h1>
        </div>

      </div>

    </div>

  </div>
  
</div>

<div className="myapp">

    <div aria-labelledby="newaccountform">

      <fieldset className="slds-theme--default">

        <legend id="editaccountform" className="slds-text-heading--medium slds-p-vertical--medium">Edit Work Order</legend>

        <form onSubmit={this.onSubmit} className="slds-form--stacked">

          <div className="slds-grid">
            <div className="slds-col--padded slds-size--1-of-2">

              <div className="slds-form-element slds-is-required">
                <label className="slds-form-element__label" htmlFor="subject">Subject</label>
                <div className="slds-form-element__control">
                  <input name="subject" id="subject" className="slds-input" type="text" onChange={this.changeSubject} value={this.state.workorder.record.subject} required/>
                </div>
              </div>

              <div className="slds-form-element">
                <div className="slds-form-element">
                  <label className="slds-form-element__label" htmlFor="status">Status</label>
                  <div className="slds-form-element__control">
                    <select name="status" value={this.state.workorder.record.status} onChange={this.changeStatus} id="status" className="slds-select">
                      {this.createSelectItems()}
                    </select>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="slds-grid slds-p-top--small">
            <div className="slds-col--padded">

              <div className="slds-form-element">
                <label className="slds-form-element__label" htmlFor="name">Description</label>
                <div className="slds-form-element__control">
                  <textarea name="description" id="description" className="slds-textarea" onChange={this.changeDescription} value={this.state.workorder.record.description}></textarea>
                </div>
              </div>

            </div>
          </div>


          <button className="slds-button slds-button--brand slds-m-top--medium" type="submit">Save</button>
        </form>

      </fieldset>

    </div>

</div>
</div>
                        :
                        <div> No workorder </div>
                    }

        </div>
    );
  }
});
