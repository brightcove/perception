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
   * render a histogram for test results.
   */
  histogram = function(values, $elem) {
    var
    
      // formatter for counts.
      formatCount = d3.format(",.0f"),

      // calculate high bound for x axis
      ninetyfifth = d3.quantile(values, 0.95),
      maxX = ninetyfifth * 1.25,
      
      // chart dimensions
      margin = {top: 10, right: 30, bottom: 30, left: 30},
      width = $elem.width() - margin.left - margin.right,
      height = 200 - margin.top - margin.bottom,
      
      // x scale
      x = d3.scale.linear()
        .domain([0, maxX])
        .range([0, width]),
      
      // generate a histogram using twenty uniformly-spaced bins.
      data = d3.layout.histogram()
        .bins(x.ticks(20))
      (values),
      
      // y scale
      y = d3.scale.linear()
        .domain([0, d3.max(data, function(d) { return d.y; })])
        .range([height, 0]);
      
      // x-axis
      xAxis = d3.svg.axis()
        .scale(x)
        .orient("bottom");
      
      // insert svg image for actual chart into context element
      svg = d3.select($elem[0]).append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")"),
      
      // adjust chart bars
      bar = svg.selectAll(".bar")
        .data(data)
        .enter().append("g")
        .attr("class", "bar")
        .attr("transform", function(d) { return "translate(" + x(d.x) + "," + y(d.y) + ")"; });
      
      // append svg rect to each bar
      bar.append("rect")
        .attr("x", 1)
        .attr("width", x(data[0].dx) - 1)
        .attr("height", function(d) { return height - y(d.y); });
      
      // append formatted text label to each bar
      bar.append("text")
        .attr("dy", ".75em")
        .attr("y", 6)
        .attr("x", x(data[0].dx) / 2)
        .attr("text-anchor", "middle")
        .text(function(d) { return formatCount(d.y); });
      
      // append x-axis to the image
      svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);
  },
  
  /**
   * convenience method to attempt to correct legacy test documents.
   */
  purifyTest = function(doc) {
    if (!('source' in doc)) {
      doc.source = doc.url;
    }
    return doc;
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
          $.each(result.rows, function(index, row){
            purifyTest(row.value);
          });
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
          context.$element()
            .html(render('.manage-test', $.extend(purifyTest(doc),{
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
      db.saveDoc(purifyTest(context.params), {
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
          context.$element()
            .html(render('.manage-test', $.extend(purifyTest(doc), {
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
          
          purifyTest(testDoc);
          
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
              var source = testDoc.source;
              if (!(/^\w+:/).test(source)) {
                if (source.indexOf('<body') === -1) {
                  source = '<body>' + source + '</body>';
                }
                source = 'data:text/html;base64,' + btoa(source);
              }
              $('<iframe></iframe>', {src: source}).prependTo($area);
            } else if ($target.hasClass('running')) {
              $target.removeClass('running').addClass('done');
              runDoc.stopTime = +new Date();
              db.saveDoc(runDoc);
            } else {
              $target.removeClass('done').addClass('ready');
              $area.find('iframe').remove();
              runDoc = {
                test_id: testDoc._id,
                ua: window.navigator.userAgent,
                performance: window.performance
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
          purifyTest(doc);
          db.view('perception/runs', {
            startkey: [doc._id, ''],
            endkey: [doc._id, '\u9999'],
            success: function(runs) {
              
              var
                
                // context element (.main)
                $elem = context.$element(),
                
                // extract the delta values
                values = $.map(runs.rows, function(row){
                  return row.value.stopTime - row.value.startTime;
                }).sort(d3.ascending),
                
                // statistics to display
                stats = [
                  { key: 'source', value: doc.source },
                  { key: 'description', value: doc.description },
                  { key: 'total runs', value: values.length }
                ];
              
              if (values.length) {
                stats = stats.concat([
                  { key: 'median load time', value: d3.round(d3.median(values)) + ' ms' },
                  { key: 'mean load time', value: d3.round(d3.mean(values)) + ' ms' },
                  { key: '90th percentile', value: d3.round(d3.quantile(values, 0.9)) + ' ms' },
                  { key: '95th percentile', value: d3.round(d3.quantile(values, 0.95)) + ' ms' }
                ]);
              }
                
              // fill in main content, then generate histogram
              $elem
                .attr('class', 'main analyze-test')
                .html(render('.analyze-test', { stats: stats }));
              
              // no need to render a chart if there's no data to render
              if (!values.length) {
                return;
              }

              $elem.append('<h3>All</h3>');
              histogram(values, $elem);

              db.view('perception/runs', {
                startkey: [doc._id, 'ios'],
                endkey: [doc._id, 'ios\u9999'],
                success: function(runs) {
                  // extract the delta values
                  var values = $.map(runs.rows, function(row){
                    return row.value.stopTime - row.value.startTime;
                  }).sort(d3.ascending);
                  $elem.append('<h3>iOS</h3>');
                  histogram(values, $elem);
                }
              });
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
