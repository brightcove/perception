/**
 * site.js
 * main application logic appears here
 */
(function(window, document, $, Mustache){

var
  
  /**
   * database object, used to communicate with couchdb.
   * principle methods include:
   * - openDoc() to read an existing document
   * - saveDoc() to save a new or existing document
   * - view() to retrieve data from a map/reduce view
   */
  db = window.db = $.couch.db(document.location.href.split('/')[3]),
  
  /**
   * jQuery result object containing a list of available templates.
   */
  $templates = $('script[type="text/mustache"]'),
  
  /**
   * convenience method for looking up a template and performing a mustache
   * transformation on it to return HTML.
   */
  render = function(selector, data) {
    var $elem = $templates.filter(selector);
    if (!$elem.length) {
      throw "no templates match the selector: " + selector;
    }
    return Mustache.to_html($elem.text(), data || {});
  },
  
  /**
   * application views (targets for Sammy routes)
   */
  views = {
    
    /**
     * list existing tests.
     */
    listTests: function(context) {
      db.view('perception/tests', {
        success: function(result){
          context.$element().html(render('.list-tests',result));
        }
      });
    },
    
    /**
     * add a new test or edit an existing test.
     */
    editTest: function(context) {
      if (this.params._id) {
        db.openDoc(this.params._id, {
          success: function(doc){
            context.$element().html(render('.edit-test', doc));
          }
        });
      } else {
        context.$element().html(render('.edit-test'));
      }
    },
    
    /**
     * save changes to a test.
     */
    saveTest: function(context) {
      db.saveDoc(context.params,{
        success: function(){
          app.setLocation('#/');
        }
      });
    }
    
  },
  
  /**
   * initialize the Sammy application, specifying routes.
   */
  app = window.app = $.sammy('.main', function() {
    
    // main entry point to app lists available tests
    this.get('#/', views.listTests);
    this.get('#/list-tests', views.listTests);
    
    // adding/editing tests and saving the results
    this.get('#/edit-test', views.editTest);
    this.get('#/edit-test/:_id', views.editTest);
    this.post('#/save-test', views.saveTest);
    
    // run a test
    this.get('#/run-test/:_id', views.runTest);
    
    // show stats and charts for a test's runs
    this.get('#/analyze-test/:_id', views.analyzeTest);
    
  });

// start the application
app.run('#/');

})(window, document, jQuery, Mustache);
