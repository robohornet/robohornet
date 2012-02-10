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

robohornet.TagType = {
  SPECIAL : "special",
  TECHNOLOGY : "technology",
  APP : "app"
}

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
  this.tagsElement_ = document.getElementById('tags');

  document.getElementById('index-prefix').textContent = version + ':';

  this.initBenchmarks_(benchmarks);
  this.setStatus_(robohornet.Status.READY);

  this.progressCallback_ = bind(this.progressTransitionDone_, this);

  window.addEventListener("unload", bind(this.onWindowUnload_, this), false);
};

(function() {

  var _p = robohornet.Runner.prototype;

  _p.init = function() {

    //First create the special all/none tags
    var allTag = {
      "name" : "ALL",
      "prettyName" : "All",
      "type" : robohornet.TagType.SPECIAL
    };

    var noneTag = {
      "name" : "NONE",
      "prettyName" : "None",
      "type" : robohornet.TagType.SPECIAL
    };

    //Pretend like the All tag was added to every benchmark.
    allTag.benchmarks = this.benchmarks_;
    noneTag.benchmarks = [];
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      benchmark.tags.push(allTag);
    }

    //Put the all/none tags first.
    var ele = this.makeTagElement_(allTag);
    this.tagsElement_.appendChild(ele);
    allTag.primaryElement = ele;

    ele = this.makeTagElement_(noneTag);
    this.tagsElement_.appendChild(ele);
    noneTag.primaryElement = ele;

    //First enumerate all technology tags...
    for (var tagName in TAGS) {
      var tag = TAGS[tagName];
      if (tag.type != robohornet.TagType.TECHNOLOGY) continue;
      var ele = this.makeTagElement_(tag);
      this.tagsElement_.appendChild(ele);
      tag.primaryElement = ele;
    }
    //then all app tags.
    for (var tagName in TAGS) {
      var tag = TAGS[tagName];
      if (tag.type == robohornet.TagType.TECHNOLOGY) continue;
      var ele = this.makeTagElement_(tag);
      this.tagsElement_.appendChild(ele);
      tag.primaryElement = ele;
    }

    TAGS['ALL'] = allTag;
    TAGS['NONE'] = noneTag;

    this.digestHash_();
  };

  _p.run = function() {
    this.setStatus_(robohornet.Status.RUNNING);
    this.currentIndex_ = -1;
    this.score_ = 0;
    this.rawScore_ = 0;
    this.progressElement_.style.opacity = "0.1";
    this.statusElement_.textContent = "Please wait while the benchmark runs. For best results, close all other programs and pages while the test is running.";
    window.setTimeout(bind(this.next_, this), 25);
  };

  _p.next_ = function() {
    var benchmark;
    while (!benchmark) {
      benchmark = this.benchmarks_[++this.currentIndex_];
      if (!benchmark)
        break;
      if (!benchmark.enabled) {
        this.setBenchmarkStatus_(benchmark, robohornet.BenchmarkStatus.SKIPPED);
        benchmark = null;
      }
    }

    var progressAmount = (this.currentIndex_ / this.benchmarks_.length) * 100;
    this.progressElement_.style.marginLeft = "-" + (100 - progressAmount).toString() + "%";

    this.activeBenchmark_ = benchmark;
    if (benchmark) {
      this.loadBenchmark_(benchmark);
    } else {
      this.done_();
    }
  };

  _p.done_ = function() {
    this.progressElement_.addEventListener("webkitTransitionEnd", this.progressCallback_, false);
    this.progressElement_.addEventListener("transitionend", this.progressCallback_, false);
    this.progressElement_.style.opacity = '0.0';
    this.progressElement_.style.opacity = '0.0';

    var successfulRuns = 0, failedRuns = 0;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (benchmark.status == robohornet.BenchmarkStatus.SUCCESS)
        successfulRuns++;
      else if (benchmark.status != robohornet.BenchmarkStatus.SKIPPED)
        failedRuns++;
    }

    if (successfulRuns == this.benchmarks_.length) {
      this.setScore_(true /* opt_finalScore */);
      this.statusElement_.innerHTML = 'The RoboHornet index is normalized to 100 and roughly shows your browser\'s performance compared to other modern browsers on reference hardware. <a href="https://code.google.com/p/robohornet/wiki/BenchmarkScoring" target="_blank">Learn more</a>';
    } else if (failedRuns) {
      this.statusElement_.textContent = failedRuns + ' out of ' + this.benchmarks_.length + ' benchmark(s) failed.';
    } else {
      this.statusElement_.textContent = 'Ran ' + successfulRuns + ' out of ' + this.benchmarks_.length + ' benchmarks. Enable all benchmarks to compute index.';
    }
    this.setStatus_(robohornet.Status.READY);
  };

  _p.progressTransitionDone_ = function() {
    //Wait until the progress bar fades out to put it back to the left.
    this.progressElement_.style.marginLeft = "-100%";
    this.progressElement_.removeEventListener("webkitTransitionEnd", this.progressCallback_, false);
    this.progressElement_.removeEventListener("transitionend", this.progressCallback_, false);
  }

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
      for (var tag, k = 0; tag = benchmark.tags[k]; k++) {
        if (tag.benchmarks) {
          tag.benchmarks.push(benchmark);
        } else {
          tag.benchmarks = [benchmark];
        }
      }
      this.registerBenchmark_(benchmark);
    }
    var finalRow = document.createElement("tr");
    finalRow.className = "summary-row";
    var cell = document.createElement("td");
    cell.colSpan = 5;
    cell.innerHTML = "<em>Raw score</em>";
    finalRow.appendChild(cell);
    cell = document.createElement("td");
    cell.className = "number";
    cell.textContent = "-";
    finalRow.appendChild(cell);
    this.rawScoreElement_ = cell;
    this.testsContainer.tBodies[0].appendChild(finalRow);
  };

  _p.loadBenchmark_ = function(benchmark) {
    if (this.benchmarkWindow_)
      this.benchmarkWindow_.close();

    this.setBenchmarkStatus_(benchmark, robohornet.BenchmarkStatus.LOADING);
    this.activeBenchmark_ = benchmark;
    this.benchmarkWindow_ = window.open(benchmark.filename + '?use_test_runner', 'benchmark', 'width=1024,height=768');
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

  _p.setBenchmarkEnabled_ = function(benchmark, enabled, opt_skipUpdateHash) {
    benchmark.toggleElement_.checked = enabled;
    this.onBenchmarkToggle_(benchmark, opt_skipUpdateHash);
  }

  _p.onBenchmarkToggle_ = function(benchmark, opt_skipUpdateHash) {
    benchmark.enabled = benchmark.toggleElement_.checked;
    if (benchmark.enabled) {
      benchmark.detailsElement_.classList.remove("disabled");
      benchmark.summaryRow_.classList.remove("disabled");
    } else {
      benchmark.detailsElement_.classList.add("disabled");
      benchmark.summaryRow_.classList.add("disabled");
    }
    if (!opt_skipUpdateHash)
      this.updateHash_();
  }

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
    checkbox.addEventListener('click', bind(this.onBenchmarkToggle_, this, benchmark), false);
    cell.appendChild(checkbox);
    benchmark.toggleElement_ = checkbox;

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
    detailsElement.appendChild(document.createElement("br"));

    var tagElement;
    for (var tag, i = 0; tag = benchmark.tags[i]; i++) {
      detailsElement.appendChild(this.makeTagElement_(tag));
    }

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
    for (i = 0; i < benchmark.runs.length; i++) {
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
    var rawScore = accumulatedMean * benchmark.computedWeight;
    this.rawScore_ += rawScore;

    this.setScore_();

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
    var disableInputs = false;
    switch (this.status_) {
      case robohornet.Status.READY:
        caption = 'Run';
        break;
      case robohornet.Status.RUNNING:
        caption = 'Running...';
        disableInputs = true;
        break;
      default:
        caption = 'Loading...';
    }

    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      benchmark.toggleElement_.disabled = disableInputs;
    }

    document.body.className = (this.status_ == robohornet.Status.READY) ? 'ready' : 'running';
    this.runElement_.textContent = caption;
    this.runElement_.disabled = this.status_ != robohornet.Status.READY;
  };

  _p.setScore_ = function(opt_finalScore) {
    // Ensure that we have 4 digits in front of the dot and 2 after.
    var parts = (Math.round(this.score_ * 100) / 100).toString().split('.');
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
    this.rawScoreElement_.textContent = this.rawScore_.toFixed(2);
    if (opt_finalScore) {
      this.rawScoreElement_.classList.add('final');
    } else {
      this.rawScoreElement_.classList.remove('final');
    }
  }

  _p.toggleBenchmarkDetails_ = function(benchmark, e) {
    var rowEle = benchmark.detailsElement_.parentElement.parentElement;
    rowEle.classList.toggle("expanded");
    benchmark.summaryRow_.classList.toggle("expanded");
  };

  _p.enableAllBenchmarks = function() {
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      this.setBenchmarkEnabled_(benchmark, true, true);
    }
    this.updateHash_();
  }

  _p.disableAllBenchmarks = function() {
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      this.setBenchmarkEnabled_(benchmark, false, true);
    }
    this.updateHash_();
  }

  _p.makeTagElement_ = function(tag) {
      var tagElement = document.createElement("span");
      tagElement.className = "tag " + tag.type;
      tagElement.appendChild(document.createTextNode(tag.prettyName));
      var self = this;
      var func = function(evt) {
        if (evt.shiftKey) {
          self.addBenchmarksToSelectionByTag(tag);
        } else {
          self.selectBenchmarksByTag(tag);
        }
        //Undo the text selection from a shift-click.
        document.getSelection().removeAllRanges();
      }
      tagElement.addEventListener('click', func, false);
      return tagElement;
  }

  _p.selectBenchmarksByTag = function(tagToSelect) {
    /* First, disable all benchmarks */
    this.disableAllBenchmarks();
    this.addBenchmarksToSelectionByTag(tagToSelect);
  }

  _p.addBenchmarksToSelectionByTag = function(tagToSelect) {
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      for (var tag, k = 0; tag = benchmark.tags[k]; k++) {
        if (tag == tagToSelect) {
          this.setBenchmarkEnabled_(benchmark, true, true);
          break;
        }
      }
    }
    this.updateHash_();
  }

  _p.updateTagSelection_ = function() {
    for(var tagName in TAGS) {
      var tag = TAGS[tagName];
      var isActive = false, isFullyActive = true;
      if (tag.benchmarks.length == 0 && tag.type == robohornet.TagType.SPECIAL) {
        //Special case the none case
        isFullyActive = true;
        for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
          if (benchmark.enabled) {
            isFullyActive = false;
            break;
          }
        }
      } else {
        for (var benchmark, i = 0; benchmark = tag.benchmarks[i]; i++) {
          if (benchmark.enabled) {
            isActive = true;
          } else {
            isFullyActive = false;
          }
        }
      }
      if (isFullyActive) {
        tag.primaryElement.classList.remove('partially-inactive');
        tag.primaryElement.classList.remove('inactive');
      } else if (isActive) {
        tag.primaryElement.classList.add('partially-inactive');
        tag.primaryElement.classList.remove('inactive');
      } else {
        tag.primaryElement.classList.remove('partially-inactive');
        tag.primaryElement.classList.add('inactive');
      }
    }
  }

  _p.updateHash_ = function() {
    var enabledBenchmarkIDs = [];
    var disabledBenchmarkIDs = [];
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (benchmark.enabled)
        enabledBenchmarkIDs.push(benchmark.id);
      else
        disabledBenchmarkIDs.push(benchmark.id);
    }
    //We want to encode as few IDs as possible in the hash.
    //This also gives us a good default to follow for new benchmarks.
    if (disabledBenchmarkIDs.length) {
      //At least one benchmark is disabled.  Are the majority disabled??
      if (disabledBenchmarkIDs.length < enabledBenchmarkIDs.length) {
        window.location.hash = '#d=' + disabledBenchmarkIDs.join(',');
      } else {
        window.location.hash = '#e=' + enabledBenchmarkIDs.join(',');
      }
    } else {
      window.location.hash = '';
    }
    this.updateTagSelection_();
  }

  _p.digestHash_ = function() {
    var hash = window.location.hash;
    if (!hash) {
      this.updateTagSelection_();
      return;
    }
    hash = hash.replace('#', '').toLowerCase().split('&');
    var enableBenchmarks;
    var benchmark;
    for (var segment, i = 0; segment = hash[i]; i++) {
      hash[i] = hash[i].split('=');
      enableBenchmarks = false;
      switch (hash[i][0]) {
        case 'e':
          enableBenchmarks = true;
          //We set all benchmarks to disable and then only enable some.
          for (var k = 0; benchmark = this.benchmarks_[k]; k++) {
            this.setBenchmarkEnabled_(benchmark, false, true);
          }
        case 'd':
          var ids = hash[i][1].split(',');
          for (var benchmarkID, j = 0; benchmarkID = ids[j]; j++) {
            benchmark = this.benchmarksById_[benchmarkID];
            if (!benchmark)
              continue;
            this.setBenchmarkEnabled_(benchmark, enableBenchmarks, true);
          }
          break;
      }
    }
    this.updateTagSelection_();
  }

  _p.onWindowUnload_ = function() {
    if (this.benchmarkWindow_)
      this.benchmarkWindow_.close();
  }

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
  this.tags = details.tags;
  this.enabled = true;

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

