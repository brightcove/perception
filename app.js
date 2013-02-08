const
  couchapp = require('couchapp'),
  path = require('path');

module.exports = {
  
  _id: '_design/perception',
  
  rewrites: [
    {from:"/", to:'pages/index.html'},
    {from:"/api", to:'../../'},
    {from:"/api/*", to:'../../*'},
    {from:"/*", to:'*'}
  ],
  
  /**
   * views are map/reduce pairs which transform documents for querying.
   */
  views: {
  },
  
  /**
   * lists can aggregate map/reduce results and produce other, non-JSON
   * forms of output.
   */
  lists: {
  },
  
  /**
   * validation function for document updates
   */
  validate_doc_update: function (newDoc, oldDoc, userCtx) {   
    if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
      throw "Only admin can delete documents on this database.";
    } 
  }
  
};

couchapp.loadAttachments(module.exports, path.join(__dirname, 'attachments'));

