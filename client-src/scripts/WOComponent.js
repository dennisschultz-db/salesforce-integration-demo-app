var $ = require('jquery'),
    React = require('react');
var Link = require('react-router-dom').Link;

var WorkOrder = module.exports = React.createClass({
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
            <tr>
                <td>
                    <span className="slds-icon__container slds-icon-standard-account">
                        <svg aria-hidden="true" className="slds-icon">
                            <use xlinkHref="/assets/icons/standard-sprite/svg/symbols.svg#task"></use>
                        </svg>
                        <span className="slds-assistive-text">Work Order</span>
                    </span>
                </td>
                <td><Link to={'/workorder/' + this.props.workorder.id}>{this.props.workorder.workordernumber}</Link></td>
                <td>{this.props.workorder.subject}</td>
                <td>{this.props.workorder.status}</td>
            </tr>

    );
  }
});
