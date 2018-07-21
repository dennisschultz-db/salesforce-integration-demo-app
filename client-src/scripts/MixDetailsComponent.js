var $ = require('jquery'),
	React = require('react');

var MixDetail = require('./WODetailComponent.js');

var MixDetails = module.exports = React.createClass({
	getInitialState: function () {
		return {
            mixDetails : null
        };
	},

	componentDidMount: function () {
        // Get Mixes
        console.log('MixDetailsComponent:componentDidMount');
        $.ajax({
            url: '/mixes/' + this.props.mixId,
            dataType: 'json',
            success: function (data) {
                this.setState({
                    mixDetails: data
                });
            }.bind(this),
            error: function (xhr, status, err) {
                if (xhr.status != 401) // Ignore 'unauthorized' responses before logging in
                    console.error('Failed to retrieve mix details.');
            }.bind(this)
        });
	},

  render: function() {
    return (
        <div>
            { this.state.mixDetails ?
                <table className="table">
                    <tr>
                        <th></th>
                        <th>Product</th>
                        <th>MSRP</th>
                        <th>Qty</th>
                    </tr>

			        { this.state.mixDetails.map(function(item, index){
				        return <MixDetail key={index} detail={item} />;
                    })}
                </table>
            :
                ""
            }
        </div>
    );
  }
});
