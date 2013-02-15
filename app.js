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
    
    /**
     * list all the documents representing tests that can be run
     */
    tests: {
      map: function(doc) {
        if (doc.type === 'test') {
          emit([doc.source || doc.url, doc._id], doc);
        }
      }
    },
    
    /**
     * list all the documents representing runs for tests
     */
    runs: {
      map: function(doc) {
        if ('test_id' in doc) {
          if ('ua' in doc) {
            var platform = ~doc.ua.indexOf('(iP') ? 'ios' : ~doc.ua.indexOf('Android') ? 'android' : 'etc';
            emit([doc.test_id, platform], doc);
          } else {
            emit([doc.test_id, 'unknown'], doc);
          }
        }
      }
    }
    
  },
  
  /**
   * lists can aggregate map/reduce results and produce other, non-JSON
   * forms of output.
   */
  lists: {
  },
  
  /**
   * filters create separate channels for listening for change notifications.
   */
  filters: {
    
    /**
     * filter test runs by their test_id, the _id of the test document.
     */
    runs: function(doc, req){
      if ('test_id' in doc) {
        if (req.query.test_id) {
          return doc.test_id === req.query.test_id;
        } else {
          return true;
        }
      }
      return false;
    }
    
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

