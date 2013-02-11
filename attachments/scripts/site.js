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
     * form for adding a new test.
     */
    addTestForm: function(context) {
      context.$element().html(render('.manage-test', {
        action: 'add',
        label: 'add'
      }));
    },
    
    /**
     * form for editing an existing test.
     */
    editTestForm: function(context) {
      db.openDoc(this.params._id, {
        success: function(doc){
          context.$element().html(render('.manage-test', $.extend(doc,{
            action: 'edit',
            label: 'save'
          })));
        }
      });
    },
    
    /**
     * save a new or edited test.
     */
    saveTest: function(context) {
      db.saveDoc(context.params,{
        success: function(){
          app.setLocation('#/');
        }
      });
    },
    
    /**
     * form for deleting a test
     */
    deleteTestForm: function(context) {
      db.openDoc(this.params._id, {
        success: function(doc){
          context.$element().html(render('.manage-test', $.extend(doc, {
            action: 'delete',
            label: 'delete',
            modifiable: 'disabled'
          })));
        }
      });
    },
    
    
    /**
     * delete the specified test.
     */
    deleteTest: function(context) {
      db.removeDoc(context.params,{
        success: function(){
          app.setLocation('#/');
        }
      });
    },
    
    /**
     * run a given test.
     */
    runTest: function(context) {
      db.openDoc(this.params._id, {
        success: function(testDoc){
          var
            
            // set context element content to run-test template, then make
            // note of the .run-area element
            $area = context.$element()
              .html(render('.run-test', testDoc))
              .find('.run-area'),
            
            // get a handle on the big target which will be used to both
            // start tests and track when they've loaded
            $target = $area.find('.big-target'),
            
            // document to save a run's data
            runDoc;
          
          // state machine for the ready/running/done states
          $target.click(function(){
            if ($target.hasClass('ready')) {
              $target.removeClass('ready').addClass('running');
              runDoc.startTime = +new Date();
              $('<iframe></iframe>', {src: testDoc.url}).prependTo($area);
            } else if ($target.hasClass('running')) {
              $target.removeClass('running').addClass('done');
              runDoc.stopTime = +new Date();
              db.saveDoc(runDoc);
            } else {
              $target.removeClass('done').addClass('ready');
              $area.find('iframe').remove();
              runDoc = {
                test_id: testDoc._id,
                ua: window.navigator.userAgent
              };
            }
          }).click();
          
        }
      });
    },
    
    /**
     * analyze the runs for a given test.
     */
    analyzeTest: function(context) {
      db.openDoc(this.params._id, {
        success: function(doc){
          db.view('perception/runs', {
            startkey: doc._id,
            endkey: doc._id,
            success: function(runs) {
              context.$element().html(render('.analyze-test', {
                stats: [
                  { key: 'url', value: doc.url },
                  { key: 'description', value: doc.description },
                  { key: 'total runs', value: runs.total_rows }
                ]
              }));
            }
          });
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
    
    // adding or editing a test and saving the result
    this.get('#/add-test', views.addTestForm);
    this.get('#/edit-test/:_id', views.editTestForm);
    this.post('#/save-add-test', views.saveTest);
    this.post('#/save-edit-test', views.saveTest);
    
    // adding/edit or delete a test and save the results
    this.get('#/delete-test/:_id', views.deleteTestForm);
    this.post('#/save-delete-test', views.deleteTest);
    
    // run a test
    this.get('#/run-test/:_id', views.runTest);
    
    // show stats and charts for a test's runs
    this.get('#/analyze-test/:_id', views.analyzeTest);
    
  });

// start the application
app.run('#/');

})(window, document, jQuery, Mustache);
