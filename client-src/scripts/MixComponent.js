var $ = require('jquery'),
	React = require('react');

var MixDetails = require('./MixDetailsComponent.js');


var Mix = module.exports = React.createClass({
	propTypes: {
        key:        React.PropTypes.number,
        mix:        React.PropTypes.object,
        onApproval: React.PropTypes.func
    },
    getInitialState: function () {
		return {
            mix : null,
            showDetails : false
		};
	},


	getMixDetails: function () {
        this.setState({
            showDetails: !this.state.showDetails
        })
        console.log('Toggling showDetails');
	},

	approveMix: function () {
        console.log('Approving mix ' + this.props.mix.mixId);

        $.ajax({
            url: '/approvals/' + this.props.mix.mixId,
            dataType: 'json',
            success: function (data) {
                this.props.onApproval(this.props.mix.mixId);
            }.bind(this),
            error: function (xhr, status, err) {
                if (xhr.status != 401) // Ignore 'unauthorized' responses before logging in
                    console.error('Failed to approve mix');
            }.bind(this)
        });
    },

  render: function() {
    return (
        <div className="col-sm-12">
            <div className={"panel panel-primary " + this.props.isAnimated ? "animateIn" : "" }>
                <div className="panel-heading">Mix ID: {this.props.mix.mixId}</div>
                <div className="panel-body">
                    <div className="col-md-12 col-lg-7">
                        <table>
                            <tr>
                                <td className="panel-table-label">Customer:</td><td>{this.props.mix.account}</td>
                            </tr>
                            <tr>
                                <td className="panel-table-label">Mix Name:</td><td>{this.props.mix.mixName}</td>
                            </tr>
                        </table>
                    </div>   
                    <div className="col-md-12 col-lg-5">
                        <button className="btn btn-info" onClick={this.getMixDetails}>
                            <span className="glyphicon glyphicon-zoom-in" aria-hidden="true"></span>
                            View Details
                        </button>
                        <button className="btn btn-info" onClick={this.approveMix}>
                            <span className="glyphicon glyphicon-ok" aria-hidden="true"></span>
                            Approve
                        </button>
                    </div>
                    { this.state.showDetails ?
                        <MixDetails index={this.props.index} mixId={this.props.mix.mixId}/> 
                        : 
                        ""
                    }
                </div>
            </div>
        </div>
    );
  }
});
