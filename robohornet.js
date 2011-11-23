var robohornet = {};

/**
 * Benchmark version.
 *
 * @type {string}
 */
robohornet.BENCHMARK_VERSION = 'RH100';


/**
 * Class representing a the RoboHornet test runner.
 *
 * @param {Array.<Object>} benchmarkDetails Array of benchmark json objects.
 * @constructor
 */
robohornet.Runner = function(benchmarkDetails) {
  this.testFrame = document.getElementById('testFrame');
  this.testsContainer = document.getElementById('tests');
  this.statusElement_ = document.getElementById('status');
  this.scoreElement_ = document.getElementById('score');
  this.runElement_ = document.getElementById('runButton');
  var benchmark;
  var benchmarks = [];
  var benchmarksMap = {};
  for (var details, i = 0; details = benchmarkDetails[i]; i++) {
    benchmark = new robohornet.Benchmark(this, details);
    benchmarks.push(benchmark);
    benchmarksMap[benchmark.id] = benchmark;
  }
  this.benchmarks_ = benchmarks;
  this.benchmarksMap_ = benchmarksMap;
  this.currentIndex_ = -1;
  this.overallScore_ = 0;
  this.benchmarkCount_ = 0;
  this.benchmarksRun_ = 0;
  this.benchmarksFailed_ = 0;
};

(function() {
  var _p = robohornet.Runner.prototype;

  _p.init = function() {
    var totalWeight = 0;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      totalWeight += benchmark.weight;
    }
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      benchmark.computedWeight = (benchmark.weight / totalWeight) * 100;
      benchmark.index = i;
      benchmark.register();
    }
    this.benchmarkCount_ = this.benchmarks_.length;
    this.digestHash_();
    this.runElement_.disabled = false;
    this.setStatus_('Ready');
  };

  _p.run = function() {
    this.currentIndex_ = -1;
    this.overallScore_ = 0;
    this.setStatus_('Running...');
    this.scoreElement_.textContent = '';
    var message = document.createElement('em');
    message.appendChild(document.createTextNode('Please wait...'));
    this.scoreElement_.appendChild(message);
    this.runElement_.disabled = true;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      var identifier = 'benchmark-' + benchmark.index;
      document.getElementById(identifier + '-toggle').disabled = true;
      benchmark.setStatus_('Waiting...');
    }
    this.benchmarksRun_ = 0;
    this.benchmarksFailed_ = 0;
    this.next_();
  };

  _p.benchmarkSucceeded = function() {
    this.benchmarksRun_++;
    this.next_();
  }

  _p.benchmarkSkipped = function(failed) {
    if (failed)
      this.benchmarksFailed_++;
    this.next_();
  }

  _p.next_ = function() {
     if (++this.currentIndex_ < this.benchmarks_.length) {
       this.benchmarks_[this.currentIndex_].load();
    } else
      this.done_();
  };

  _p.incrementOverallScore = function(score) {
    this.overallScore_ += score;
  }

  _p.done_ = function() {
    this.testFrame.src = 'javascript:void(0)';
    this.scoreElement_.textContent = '';
    if (this.benchmarksRun_ == this.benchmarkCount_) {
      var version = document.createElement('span');
      version.className = 'version';
      version.appendChild(document.createTextNode(
          robohornet.BENCHMARK_VERSION));
      this.scoreElement_.appendChild(version);
      var score = document.createElement('span');
      score.appendChild(document.createTextNode(
          Math.round(this.overallScore_ * 100) / 100));
      this.scoreElement_.appendChild(score);
    } else if (this.benchmarksFailed_ == this.benchmarkCount_) {
      var message = document.createElement('em');
      message.appendChild(document.createTextNode(
          'Test failed'));
      this.scoreElement_.appendChild(message);
      alert('To run RoboHornet locally you need to run Chrome with the --allow-file-access-from-files flag.');
    } else {
      var message = document.createElement('em');
      message.appendChild(document.createTextNode(
          'Enable all tests to see the score'));
      this.scoreElement_.appendChild(message);
    }
    this.runElement_.disabled = false;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      var identifier = 'benchmark-' + benchmark.index;
      document.getElementById(identifier + '-toggle').disabled = false;
    }

    this.setStatus_('Ran ' + this.benchmarksRun_ + ' out of ' +
        this.benchmarkCount_ + ' benchmarks.');
  };

  _p.setStatus_ = function(textContent) {
    this.statusElement_.textContent = textContent;
  };

  _p.updateHash = function() {
    var disabledBenchmarkIDs = [];
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (!benchmark.enabled)
        disabledBenchmarkIDs.push(benchmark.id);
    }
    if (disabledBenchmarkIDs.length) {
      window.location.hash = '#d=' + disabledBenchmarkIDs.join(',');
    } else {
      window.location.hash = '';
    }
  }

  _p.digestHash_ = function() {
    var hash = window.location.hash;
    if (!hash)
      return;
    hash = hash.replace('#', '').toLowerCase().split('&');
    for (var segment, i = 0; segment = hash[i]; i++) {
      hash[i] = hash[i].split('=');
      switch (hash[i][0]) {
        case 'd':
          var ids = hash[i][1].split(',');
          for (var benchmarkID, j = 0; benchmarkID = ids[j]; j++) {
            var benchmark = this.benchmarksMap_[benchmarkID];
            if (!benchmark)
              continue;
            benchmark.setEnabled(false, true);
          }
          break;
      }
    }
  }
})();


/**
 * Class representing a single benchmark.
 *
 * @param {robohornet.Runner} runner Test runner instance.
 * @param {Object} details Benchmarks details as json object.
 * @constructor
 */
robohornet.Benchmark = function(runner, details) {
  this.runner = runner;
  if (!details) details = {};
  this.name = details.name;
  this.description = details.description;
  this.filename = details.filename;
  this.runs = details.runs;
  this.weight = details.weight;
  this.baselineTime = details.baselineTime;

  this.id = this.filename.match(/\/([A-z]+)\./)[1].toLowerCase();

  this.loadCallback_ = bind(this.onFrameLoaded_, this);
  this.errorCallback_ = bind(this.onFrameError_, this);
  this.toggleCallback_ = bind(this.enabledClicked_, this);
};

(function() {
  var _p = robohornet.Benchmark.prototype;

  _p.addCell_ = function(rowElement, textContent, opt_className) {
    var cell = document.createElement('td');
    if (opt_className)
      cell.className = opt_className;
    cell.appendChild(document.createTextNode(textContent));
    rowElement.appendChild(cell);
  };

  _p.register = function() {
    var identifier = 'benchmark-' + this.index;

    // Append summary row.
    var row = document.createElement('tr');
    row.id = identifier;
    var cell = document.createElement('td');
    var checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = identifier + '-toggle';
    checkbox.checked = true;
    this.toggleElement_ = checkbox;
    this.toggleElement_.addEventListener('click', this.toggleCallback_, false);
    cell.appendChild(checkbox);

    var label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.appendChild(document.createTextNode(this.name));
    cell.appendChild(label);

    row.appendChild(cell);

    this.addCell_(row, '-');
    this.addCell_(row, '-', 'number');
    this.addCell_(row, this.baselineTime.toFixed(2) + 'ms', 'number');
    this.addCell_(row, this.computedWeight.toFixed(2) + '%', 'number');
    this.addCell_(row, '-', 'number');
    this.runner.testsContainer.tBodies[0].appendChild(row);
    this.rowElement_ = row;

    // Append details row.
    row = document.createElement('tr');
    cell = document.createElement('td');
    cell.className = 'details';
    cell.colSpan = 2;

    var detailsElement = document.createElement('div');
    detailsElement.className = 'details-container';
    cell.appendChild(detailsElement);
    detailsElement.appendChild(document.createTextNode(this.description));

    // Append list of runs/parameters.
    var runsTable = document.createElement('table');
    runsTable.id = identifier + '-runs';
    runsTable.className = 'runs';
    runsTable.appendChild(document.createElement('thead'));

    var headerRow = document.createElement('tr');
    this.addCell_(headerRow, 'Parameters');
    this.addCell_(headerRow, 'Runs', 'number');
    this.addCell_(headerRow, 'Error', 'number');
    this.addCell_(headerRow, 'Mean', 'number');
    runsTable.tHead.appendChild(headerRow);

    runsTable.appendChild(document.createElement('tbody'));
    for (var i = 0; i < this.runs.length; i++) {
      var runsRow = document.createElement('tr');
      this.addCell_(runsRow, this.runs[i][0], 'name');
      this.addCell_(runsRow, '0', 'number');
      this.addCell_(runsRow, '0', 'number');
      this.addCell_(runsRow, '0', 'number');
      runsTable.tBodies[0].appendChild(runsRow);
    }
    detailsElement.appendChild(runsTable);

    this.detailsElement_ = detailsElement;
    this.onToggle_();

    row.appendChild(cell);
    this.runner.testsContainer.tBodies[0].appendChild(row);
  };

  _p.enabledClicked_ = function() {
    this.onToggle_();
    this.runner.updateHash();
  }

  _p.setEnabled = function(enabled, opt_skipUpdateHash) {
    this.toggleElement_.checked = enabled;
    this.onToggle_();
    if (!opt_skipUpdateHash)
      this.runner.updateHash();
  }

  _p.onToggle_ = function() {
    this.enabled = this.toggleElement_.checked;
    this.detailsElement_.className = 'details-container ' + (this.enabled ?
        'enabled' : 'disabled');
  };

  _p.load = function() {
    if (!this.enabled) {
      this.setStatus_('Skipped');
      this.runner.benchmarkSkipped(false);
      return;
    }

    this.runner.testFrame.addEventListener('load', this.loadCallback_, false);
    this.runner.testFrame.addEventListener('error', this.errorCallback_, false);

    this.setStatus_('Loading...');
    this.runner.testFrame.src = this.filename;
  };

  _p.onComplete_ = function(suite) {
    var results = [];
    for (var run, i = 0; run = suite[i]; i++) {
      results.push({
        name: run.name,
        mean: run.stats.mean * 1000,
        rme: run.stats.RME,
        runs: run.stats.size
      });
    }
    this.setResults(results);
    this.runner.benchmarkSucceeded();
  };

  _p.onFrameLoaded_ = function() {
    this.removeListeners_();

    var win = this.runner.testFrame.contentWindow;
    if (!win.test) {
      this.setStatus_('Invalid file.');
      this.runner.benchmarkSkipped(true);
      return;
    }

    var self = this;
    var suite = new Benchmark.Suite(this.name, {
      onComplete: function() { self.onComplete_(this); }
    });

    for (var run, i = 0; run = this.runs[i]; i++) {
      var argument = run[1];
      suite.add(run[0], bind(win.test, win, argument), {
        setup: bind(win.setUp, win, argument),
        teardown: bind(win.tearDown, win, argument)
      });
    }

    this.setStatus_('Running...');
    suite.run(true);
  };

  _p.onFrameError_ = function() {
    this.removeListeners_();
    this.setStatus_('Unable to load file.');
    this.runner.benchmarkSkipped(true);
  };

  _p.removeListeners_ = function() {
    this.runner.testFrame.removeEventListener('load', this.loadCallback_,
        false);
    this.runner.testFrame.removeEventListener('error', this.errorCallback_,
        false);
  };

  _p.setResults = function(results) {
    var row = this.rowElement_;
    row.cells[1].textContent = 'Computing Score...';

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

    var diff = accumulatedMean - this.baselineTime;
    var score = this.baselineTime * this.computedWeight / accumulatedMean;
    this.runner.incrementOverallScore(score);

    row.cells[1].textContent = 'Completed successfully ';
    row.cells[2].textContent = accumulatedMean.toFixed(2) + 'ms';
    row.cells[5].textContent = score.toFixed(2);
  };

  _p.setStatus_ = function(statusText) {
    var row = this.rowElement_;
    row.cells[1].textContent = statusText;
  };
})();

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
