/**
 * site
 */
(function(window, document, $){

var
  
  // database obj
  db = window.db = $.couch.db(document.location.href.split('/')[3]),
  
  // initialize the application
  app = window.app = $.sammy('#main', function() {
    
    // include a plugin
    this.use('Mustache');
    
    // user actions to implement:
    // * list existing tests
    // * add a test
    // * edit an existing test
    // * run a test
    // * view summary statistics and graphs
    
    /**
     * main route, show a list of tests
     */
    this.get('#/', function() {
      
      db.view('perception/tests', {
        success: function(result){
          console.log(result);
        }
      });
      
      
    });
    
  });

// start the application
app.run('#/');

})(window, document, jQuery);
