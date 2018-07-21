var $ = require('jquery'),
    React = require('react');
var Link = require('react-router-dom').Link;

var WorkOrder = module.exports = React.createClass({

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
                <td>{this.props.workorder.description}</td>
            </tr>

    );
  }
});
