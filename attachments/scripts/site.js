/**
 * site
 */
(function(window, document, $, Mustache){

var
  
  // database obj
  db = window.db = $.couch.db(document.location.href.split('/')[3]),
  
  // list of templates
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
  
  // initialize the application
  app = window.app = $.sammy('.main', function() {
    
    // user actions to implement:
    // * list existing tests
    // * add a test
    // * edit an existing test
    // * run a test
    // * view summary statistics and graphs
    
    /**
     * main route, show a list of tests
     */
    this.get('#/', function(context) {
      db.view('perception/tests', {
        success: function(result){
          context
            .$element()
              .html(render('.list-tests',result));
        }
      });
    });
    
    /**
     * add a new test
     */
    this.get('#/add-test', function(context) {
      context
        .$element()
          .html(render('.add-test'));
    });
    
    /**
     * handle submission of new test
     */
    this.post('#/add-test', function(context) {
      db.saveDoc(context.params,{
        success: function(){
          app.setLocation('#/');
        }
      });
    });
    
  });

// start the application
app.run('#/');

})(window, document, jQuery, Mustache);
