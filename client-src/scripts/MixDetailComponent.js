var $ = require('jquery'),
	React = require('react');

var MixDetail = module.exports = React.createClass({
	getInitialState: function () {
		return null;
	},

  render: function() {
    return (
        <tr id={this.props.key}>
            <td><img className="productImg" src={this.props.detail.pictureURL}/></td>
            <td>{this.props.detail.productName}</td>
            <td>${this.props.detail.price}</td>
            <td>{this.props.detail.qty}</td>
        </tr>
    );
  }
});
