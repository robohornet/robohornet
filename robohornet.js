var robohornet = {};

robohornet.Status = {
  LOADING: 0,
  READY: 1,
  RUNNING: 2
};

robohornet.BenchmarkStatus = {
  NO_STATUS: -1,
  SUCCESS: 0,
  LOADING: 1,
  RUNNING: 2,
  LOAD_FAILED: 3,
  RUN_FAILED: 4,
  SKIPPED: 5
};

/**
 * Class representing a the RoboHornet test runner.
 *
 * @param {string} version String describing this version of the benchmark.
 * @param {Array.<Object>} benchmarks Array of benchmark json objects.
 * @constructor
 */
robohornet.Runner = function(version, benchmarks) {
  this.testsContainer = document.getElementById('tests');
  this.statusElement_ = document.getElementById('status');
  this.runElement_ = document.getElementById('runButton');
  this.progressElement_ = document.getElementById('progress');
  this.indexElement_ = document.getElementById('index');

  document.getElementById('index-prefix').textContent = version + ':';

  this.initBenchmarks_(benchmarks);
  this.setStatus_(robohornet.Status.READY);
};

(function() {

  var _p = robohornet.Runner.prototype;

  _p.init = function() {

  };

  _p.run = function() {
    this.setStatus_(robohornet.Status.RUNNING);
    this.currentIndex_ = -1;
    this.score_ = 0;
    window.setTimeout(bind(this.next_, this), 25);
  };

  _p.next_ = function() {
    var benchmark;
    while (!benchmark) {
      benchmark = this.benchmarks_[++this.currentIndex_];
      if (!benchmark)
        break;
      if (!document.getElementById('benchmark-' + benchmark.index + '-toggle').checked) {
        this.setBenchmarkStatus_(benchmark, robohornet.BenchmarkStatus.SKIPPED);
        benchmark = null;
      }
    }

    this.activeBenchmark_ = benchmark;
    if (benchmark) {
      this.loadBenchmark_(benchmark);
    } else {
      this.done_();
    }
  };

  _p.done_ = function() {
    var successfulRuns = 0, failedRuns = 0;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (benchmark.status == robohornet.BenchmarkStatus.SUCCESS)
        successfulRuns++;
      else if (benchmark.status != robohornet.BenchmarkStatus.SKIPPED)
        failedRuns++;
    }

    if (successfulRuns == this.benchmarks_.length) {
      this.setScore_(this.score_, true /* opt_finalScore */);
      this.statusElement_.textContent = 'The RoboHornet index is normalized to 100 and roughly shows your browser\'s performance compared to other modern browsers.';
    } else if (failedRuns) {
      this.statusElement_.textContent = failedRuns + ' out of ' + this.benchmarks_.length + ' benchmark(s) failed.';
    } else {
      this.statusElement_.textContent = 'Enable all benchmarks to compute index.';
    }
    this.setStatus_(robohornet.Status.READY);
  };

  _p.benchmarkLoaded = function() {
    var benchmark = this.activeBenchmark_;
    if (!benchmark)
      return;

    var self = this;
    var suite = new Benchmark.Suite(this.name, {
      onComplete: function() { self.onBenchmarkComplete_(this, benchmark); }
    });

    var win = this.benchmarkWindow_;
    for (var run, i = 0; run = benchmark.runs[i]; i++) {
      var argument = run[1];
      suite.add(run[0], bind(win.test, win, argument), {
        setup: bind(win.setUp, win, argument),
        teardown: bind(win.tearDown, win, argument)
      });
    }

    this.setBenchmarkStatus_(benchmark, robohornet.BenchmarkStatus.RUNNING);
    suite.run(true);
  };

  _p.initBenchmarks_ = function(benchmarks) {
    var totalWeight = 0;
    var benchmark;

    for (var details, i = 0; details = benchmarks[i]; i++) {
      totalWeight += details.weight;
    }

    this.benchmarks_ = [];
    this.benchmarksById_ = {};
    for (var details, i = 0; details = benchmarks[i]; i++) {
      benchmark = new robohornet.Benchmark(details);
      benchmark.index = i;
      benchmark.computedWeight = (benchmark.weight / totalWeight) * 100;
      this.benchmarks_.push(benchmark);
      this.benchmarksById_[benchmark.id] = benchmark;
      this.registerBenchmark_(benchmark);
    }
  };

  _p.loadBenchmark_ = function(benchmark) {
    if (this.benchmarkWindow_)
      this.benchmarkWindow_.close();

    this.setBenchmarkStatus_(benchmark, robohornet.BenchmarkStatus.LOADING);
    this.activeBenchmark_ = benchmark;
    this.benchmarkWindow_ = window.open(benchmark.filename, 'benchmark', 'width=1024,height=768');
    if (!this.benchmarkWindow_) {
      this.activeBenchmark_ = null;
      alert('Popup required by benchmark suite blocked.');
      return;
    }

  };

  _p.onBenchmarkComplete_ = function(suite, benchmark) {
    this.benchmarkWindow_.close();
    var results = [];
    for (var run, i = 0; run = suite[i]; i++) {
      results.push({
        name: run.name,
        mean: run.stats.mean * 1000,
        rme: run.stats.RME,
        runs: run.stats.size
      });
    }
    benchmark.results = results;
    this.setBenchmarkStatus_(benchmark, robohornet.BenchmarkStatus.SUCCESS);
    this.showBenchmarkResults_(benchmark);
    window.setTimeout(bind(this.next_, this), 25);
  };

  _p.registerBenchmark_ = function(benchmark) {
    var identifier = 'benchmark-' + benchmark.index;

    // Append summary row.
    var row = document.createElement('tr');
    row.id = identifier;
    var cell = document.createElement('td');
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = identifier + '-toggle';
    checkbox.checked = true;
    cell.appendChild(checkbox);

    var label = document.createElement('span');
    label.appendChild(document.createTextNode(benchmark.name));
    label.addEventListener('click', bind(this.toggleBenchmarkDetails_, this, benchmark), false);
    cell.appendChild(label);

    row.appendChild(cell);

    addCell(row, '-');
    addCell(row, '-', 'number');
    addCell(row, benchmark.baselineTime.toFixed(2) + 'ms', 'number');
    addCell(row, benchmark.computedWeight.toFixed(2) + '%', 'number');
    addCell(row, '-', 'number');
    this.testsContainer.tBodies[0].appendChild(row);
    benchmark.summaryRow_ = row;

    // Append details row.
    row = document.createElement('tr');
    cell = document.createElement('td');
    cell.className = 'details';
    cell.colSpan = 7;

    var detailsElement = document.createElement('div');
    detailsElement.className = '';
    cell.appendChild(detailsElement);
    detailsElement.appendChild(document.createTextNode(benchmark.description));

    // Append list of runs/parameters.
    var runsTable = document.createElement('table');
    runsTable.id = identifier + '-runs';
    runsTable.className = 'runs';
    runsTable.appendChild(document.createElement('thead'));

    var headerRow = document.createElement('tr');
    addCell(headerRow, 'Parameters');
    addCell(headerRow, 'Runs', 'number');
    addCell(headerRow, 'Error', 'number');
    addCell(headerRow, 'Mean', 'number');
    runsTable.tHead.appendChild(headerRow);

    runsTable.appendChild(document.createElement('tbody'));
    for (var i = 0; i < benchmark.runs.length; i++) {
      var runsRow = document.createElement('tr');
      addCell(runsRow, benchmark.runs[i][0], 'name');
      addCell(runsRow, '0', 'number');
      addCell(runsRow, '0', 'number');
      addCell(runsRow, '0', 'number');
      runsTable.tBodies[0].appendChild(runsRow);
    }
    detailsElement.appendChild(runsTable);
    var linkElement = document.createElement('a');
    linkElement.target = '_new';
    linkElement.href = benchmark.filename;
    linkElement.appendChild(document.createTextNode('Open test in new window'));
    detailsElement.appendChild(linkElement);
    benchmark.detailsElement_ = detailsElement;

    row.appendChild(cell);
    this.testsContainer.tBodies[0].appendChild(row);
    row.className = 'details';
  };

  _p.showBenchmarkResults_ = function(benchmark) {
    var results = benchmark.results;

    var row = benchmark.summaryRow_;
    row.cells[1].textContent = 'Computing Index...';

    var accumulatedMean = 0;
    var runsTable = document.getElementById(row.id + '-runs');
    for (var result, i = 0; result = results[i]; i++) {
      var runCells = runsTable.tBodies[0].rows[i].cells;
      runCells[1].textContent = result.runs;
      runCells[2].textContent = String.fromCharCode(177) +
          result.rme.toFixed(2) + '%';
      runCells[3].textContent = result.mean.toFixed(2) + 'ms';
      accumulatedMean += result.mean;
    }

    var diff = accumulatedMean - benchmark.baselineTime;
    var score = benchmark.baselineTime * benchmark.computedWeight / accumulatedMean;
     this.score_ += score;
    this.setScore_(this.score_);

    row.cells[1].textContent = 'Completed successfully ';
    row.cells[2].textContent = accumulatedMean.toFixed(2) + 'ms';
    row.cells[5].textContent = score.toFixed(2);
  };


  _p.setBenchmarkStatus_ = function(benchmark, status) {
    benchmark.status = status;
    switch (benchmark.status) {
      case robohornet.BenchmarkStatus.SUCCESS:
        caption = 'Completed successfully';
        break;
      case robohornet.BenchmarkStatus.LOADING:
        caption = 'Loading...';
        break;
      case robohornet.BenchmarkStatus.RUNNING:
        caption = 'Running...';
        break;
      case robohornet.BenchmarkStatus.LOAD_FAILED:
        caption = 'Failed to load';
        break;
      case robohornet.BenchmarkStatus.RUN_FAILED:
        caption = 'Failed to run';
        break;
      case robohornet.BenchmarkStatus.SKIPPED:
        caption = 'Skipped';
        break;
      default:
        caption = 'Unknown failure';
    }

    var row = benchmark.summaryRow_;
    row.cells[1].textContent = caption;
  };

  _p.setStatus_ = function(status) {
    this.status_ = status;
    switch (this.status_) {
      case robohornet.Status.READY:
        caption = 'Run';
        break;
      case robohornet.Status.RUNNING:
        caption = 'Running...';
        break;
      default:
        caption = 'Loading...';
    }
    this.runElement_.textContent = caption;
    this.runElement_.disabled = this.status_ != robohornet.Status.READY;
  };

  _p.setScore_ = function(index, opt_finalScore) {
    // Ensure that we have 4 digits in front of the dot and 2 after.
    var parts = (Math.round(index * 100) / 100).toString().split('.');
    if (parts.length < 2)
      parts.push('00');
    while (!opt_finalScore && parts[0].length < 3) {
      parts[0] = '0' + parts[0];
    }
    while (parts[1].length < 2) {
      parts[1] = parts[1] + '0';
    }
    this.indexElement_.textContent = '';
    this.indexElement_.textContent = parts.join('.');
    this.indexElement_.className = opt_finalScore ? 'final' : '';
  }

  _p.toggleBenchmarkDetails_ = function(benchmark, e) {
    benchmark.detailsElement_.className = benchmark.detailsElement_.className == 'expanded' ? '' : 'expanded';
  };

})();


/**
 * Class representing a single benchmark.
 *
 * @param {Object} details Benchmarks details as json object.
 * @constructor
 */
robohornet.Benchmark = function(details) {
  if (!details)
    details = {};
  this.name = details.name;
  this.description = details.description;
  this.filename = details.filename;
  this.runs = details.runs;
  this.weight = details.weight;
  this.baselineTime = details.baselineTime;

  this.id = this.filename.match(/\/([A-z]+)\./)[1].toLowerCase();
};

function bind(fn, opt_scope, var_args) {
  var scope = opt_scope || window;
  var len = arguments.length;
  var args = [];
  for (var i = 2; i < len; i++) {
    args.push(arguments[i]);
  }
  return function() {
    fn.apply(scope, args);
  };
}

function addCell(rowElement, textContent, opt_className) {
  var cell = document.createElement('td');
  if (opt_className)
    cell.className = opt_className;
  cell.appendChild(document.createTextNode(textContent));
  rowElement.appendChild(cell);
}

