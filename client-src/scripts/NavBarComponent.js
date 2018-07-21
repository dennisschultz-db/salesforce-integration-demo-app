var React = require('react');

var NavBar = module.exports = React.createClass({
  logout: function() {
    window.location = '/auth/logout';
  },

  render: function() {
    return (
        <div className="slds-page-header" role="banner">
            <nav className="slds-p-bottom_none" role="navigation">
                <p id="bread-crumb-label" className="slds-assistive-text">You are here:</p>
                <ol className="slds-breadcrumb slds-list--horizontal" aria-labelledby="bread-crumb-label">
                    <li className="slds-list__item slds-text-heading--label"><a href="/">TA Road Squad Work Order System Web Demo</a></li>
                </ol>
            </nav>
        </div>
      
    );
  }
});
