/**
 * site.js
 * main application logic appears here
 */
(function(window, document, $, Handlebars){

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
   * handlebar template.
   */
  templates = (function(){
    var templates = {};
    $('script[type="text/x-handlebars-template"]')
      .each(function(){
        templates[this.className] = Handlebars.compile($(this).text());
      });
    return templates;
  })(),
  
  /**
   * convenience method for looking up a template and performing a handlebars
   * transformation on it to return HTML.
   */
  render = function(name, data) {
    var template = templates[name];
    if (!template) {
      throw "no templates have the name: " + name;
    }
    return template(data || {});
  },

  /**
   * handler function for messages posted to the window
   */
  handleMessage = $.noop,
  
  /**
   * render a table of statistics for test results
   */
  stats = function(doc, values, $elem) {
    // statistics to display
    var stats = [
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
    
    // fill in stats table
    $elem
      .append(render('test-stats', { stats: stats }));
  },

  /**
   * render a histogram for test results
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
      var $elem = context.$element();
      db.view('perception/tests', {
        success: function(result){
          $.each(result.rows, function(index, row){
            purifyTest(row.value);
          });
          $elem.html(render('list-tests', result));
          $elem.find('a[href="#/compare-tests"]').on('click', function(event) {
            var ids = $elem.find(':checked').map(function() {
              return $(this).attr('name');
            }).toArray().join(',');
            event.preventDefault();
            window.location.hash = '#/compare-tests/' + ids;
          });
        }
      });
    },
    
    /**
     * form for adding a new test.
     */
    addTestForm: function(context) {
      context.$element().html(render('manage-test', {
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
            .html(render('manage-test', $.extend(purifyTest(doc),{
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
            .html(render('manage-test', $.extend(purifyTest(doc), {
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
     * compare different test runs
     */
    compareTests: function(context) {
      var
        ids = context.params._ids.split(','),
        results = [],
        $elem = context.$element();

      // display the top-matter
      $elem
        .attr('class', 'main compare-tests')
        .html(render('compare-tests'));

      // short-circuit things if we don't have at least two tests
      if (!ids || ids.length < 2) {
        $elem.append('<p>not enough tests to compare');
        return;
      }

      // string together callbacks for all the db requests
      ids.reduce(function(next, id) {
        return function() {
          db.openDoc(id, {
            success: function(doc){
              purifyTest(doc);
              db.view('perception/runs', {
                startkey: [doc._id, ''],
                endkey: [doc._id, '\u9999'],
                success: function(runs) {
                  results.push({
                    id: id,
                    doc: doc,
                    runs:runs
                  });
                  next();
                }
              });
            }
          });
        };
      }, function() {
        var result;
        
        // render the stats
        results.forEach(function(result) {

          // extract the delta values and store them for later
          result.values = $.map(result.runs.rows, function(row){
            return row.value.stopTime - row.value.startTime;
          }).sort(d3.ascending);
          
          // append the stats
          stats(result.doc, result.values, $elem);
        });

        // render the histograms
        results.forEach(function(result) {
          $elem.append('<h3>' + result.doc.description + '</h3>');
          histogram(result.values, $elem);
        });
        
      })();
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
              .html(render('run-test', testDoc))
              .find('.run-area'),
            
            // get a handle on the big target which will be used to both
            // start tests and track when they've loaded
            $target = $area.find('.big-target'),
            
            // document to save a run's data
            runDoc,

            // the iframe being tested
            $iframe,
          
            // save updates to the document
            updateDoc = function(callback) {
              callback = callback || $.noop;
              db.saveDoc(runDoc, {
                success: function(response) {
                  runDoc._id = response.id;
                  runDoc._rev = response.rev;
                  callback();
                }
              });
            };
          
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
              $iframe = $('<iframe></iframe>', {src: source}).prependTo($area);
              handleMessage = function(data) {
                runDoc.performance = JSON.parse(data);
                updateDoc();
              };
            } else if ($target.hasClass('running')) {
              $target.removeClass('running').addClass('done');
              runDoc.stopTime = +new Date();
              updateDoc(function() {
                $iframe[0].contentWindow.postMessage(0, '*');
              });
            } else if ($target.hasClass('done')) {
              $target.removeClass('done').addClass('ready');
              $iframe.remove();
              $iframe = null;
              handleMessage = $.noop;
              runDoc = {
                test_id: testDoc._id,
                ua: window.navigator.userAgent
              };
            } else {
              $target.addClass('ready');
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
                }).sort(d3.ascending);
              
              // generate the stats
              $elem
                .attr('class', 'main analyze-test')
                .html(render('analyze-test'));
              stats(doc, values, $elem);
              
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
                  if (runs.rows.length) {
                    var values = $.map(runs.rows, function(row){
                      return row.value.stopTime - row.value.startTime;
                    }).sort(d3.ascending);
                    $elem.append('<h3>iOS</h3>');
                    histogram(values, $elem);
                  }
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

    // compare selected tests
    this.get('#/compare-tests/:_ids', views.compareTests);
    
    // run a test
    this.get('#/run-test/:_id', views.runTest);
    
    // show stats and charts for a test's runs
    this.get('#/analyze-test/:_id', views.analyzeTest);
    
  });

// start the application
app.run('#/');

// messages posted from the iframe
window.addEventListener('message', function(e) {
  handleMessage(e.data);
}, false);

})(window, document, jQuery, Handlebars);
