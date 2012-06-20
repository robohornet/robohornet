var robohornet = {};

robohornet.Status = {
  LOADING: 0,
  READY: 1,
  RUNNING: 2
};

// Captions for the run button based on the robohornet.Status enum.
robohornet.RunButtonCaption = {
  0: 'Loading...',
  1: 'Run',
  2: 'Running...'
};

robohornet.enabledBenchmarks = {
  SUCCESS: 0,
  LOADING: 1,
  RUNNING: 2,
  PENDING: 3,
  LOAD_FAILED: 4,
  RUN_FAILED: 5,
  SKIPPED: 6,
  POPUP_BLOCKED: 7,
  ABORTED: 8
};

// Descriptions for the robohornet.enabledBenchmarks enum.
robohornet.enabledBenchmarksDescription = {
  0: 'Completed successfully',
  1: 'Loading...',
  2: 'Running...',
  3: 'Pending',
  4: 'Failed to load',
  5: 'Failed to run',
  6: 'Skipped',
  7: 'Benchmark window blocked',
  8: 'Aborted by user'
};

robohornet.TagType = {
  SPECIAL: 'special',
  TECHNOLOGY: 'technology',
  APP: 'app'
};


/**
 * Class representing a the RoboHornet test runner.
 *
 * @param {string} version String describing this version of the benchmark.
 * @param {Array.<Object>} benchmarks Array of benchmark json objects.
 * @constructor
 */
robohornet.Runner = function(data) {
  this.testsContainer = document.getElementById('tests');
  this.statusElement_ = document.getElementById('status');
  this.runElement_ = document.getElementById('runButton');
  this.progressElement_ = document.getElementById('progress');
  this.indexElement_ = document.getElementById('index');
  this.tagsSpecialElement_ = document.getElementById('tags-special');
  this.tagsTechElement_ = document.getElementById('tags-technology');
  this.tagsAppElement_ = document.getElementById('tags-app');

  document.getElementById('index-prefix').textContent = data.version + ':';

  this.hasExtendedBenchmark_ = false;

  this.initTags_(data.technologyTags, data.productTags);
  this.initBenchmarks_(data.benchmarks);
  this.initTagUi_();
  this.initBenchmarkUi_();
  this.digestHash_();

  this.setStatus_(robohornet.Status.READY);

  this.progressCallback_ = bind(this.progressTransitionDone_, this);

  window.addEventListener('unload', bind(this.onWindowUnload_, this), false);
};

(function() {

  var IS_WEBKIT = window.navigator.userAgent.indexOf('WebKit') != -1;

  var TRANSITION_END_EVENT = IS_WEBKIT ? 'webkitTransitionEnd' : 'transitionend';

  var requestAnimationFrameFunction = window.mozRequestAnimationFrame ||
      window.msRequestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.oRequestAnimationFrame;

  function formatNumber(n, minWidth, decimalPlaces) {
    return Array(Math.max((minWidth + 1) - n.toFixed(0).length, 0)).join('0') +
            n.toFixed(decimalPlaces);
  }

  function enableClass(element, className, enabled) {
    if (element.classList.contains(className) != enabled)
        element.classList.toggle(className);
  }

  function createElement(tagName, textContent, opt_className) {
    var element = document.createElement(tagName);
    if (opt_className)
      element.className = opt_className;
    element.appendChild(document.createTextNode(textContent));
    return element;
  }

  function addChildren(element, children) {
    for (var i = 0; i < children.length; i++) {
      element.appendChild(children[i]);
    }
  }

  var _p = robohornet.Runner.prototype;

  _p.initTagUi_ = function() {
    for (var tag, i = 0; tag = this.tags_[i]; i++) {
      tag.element = this.makeTagElement_(tag);
      if (tag.type == robohornet.TagType.TECHNOLOGY) {
        this.tagsTechElement_.appendChild(tag.element);
      }
      else if (tag.type == robohornet.TagType.APP) {
        this.tagsAppElement_.appendChild(tag.element);
      }
      else {
        if (tag.id == 'EXTENDED' && !this.hasExtendedBenchmark_)
          continue;
        this.tagsSpecialElement_.appendChild(tag.element);
      }
    }
  };

  _p.run = function() {
    this.setStatus_(robohornet.Status.RUNNING);
    this.currentIndex_ = -1;
    this.score_ = 0;
    this.rawScore_ = 0;
    this.progressElement_.style.opacity = '0.1';
    this.statusElement_.textContent = 'Please wait while the benchmark runs. For best results, close all other programs and pages while the test is running.';
    window.setTimeout(bind(this.next_, this), 25);
  };

  _p.next_ = function() {
    var benchmark;
    while (!benchmark) {
      benchmark = this.benchmarks_[++this.currentIndex_];
      if (!benchmark)
        break;
      if (!benchmark.enabled) {
        this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.SKIPPED);
        benchmark = null;
      }
    }

    var progressAmount = (this.currentIndex_ / this.benchmarks_.length) * 100;
    this.progressElement_.style.marginLeft = '-' + (100 - progressAmount).toString() + '%';

    this.activeBenchmark_ = benchmark;
    if (benchmark) {
      this.loadBenchmark_(benchmark);
    } else {
      this.done_();
    }
  };

  _p.done_ = function() {
    this.progressElement_.addEventListener(TRANSITION_END_EVENT, this.progressCallback_, false);
    this.progressElement_.style.opacity = '0.0';
    var skippedExtendedRuns = 0;

    var successfulRuns = 0, failedRuns = 0, blockedRuns = 0;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (benchmark.status == robohornet.enabledBenchmarks.SUCCESS)
        successfulRuns++;
      else if (benchmark.extended)
        skippedExtendedRuns++;
      else if (benchmark.status == robohornet.enabledBenchmarks.POPUP_BLOCKED)
        blockedRuns++;
      else if (benchmark.status != robohornet.enabledBenchmarks.SKIPPED)
        failedRuns++;
    }

    if (successfulRuns + skippedExtendedRuns == this.benchmarks_.length) {
      this.setScore_(true /* opt_finalScore */);
      this.statusElement_.innerHTML = 'The RoboHornet index is normalized to 100 and roughly shows your browser\'s performance compared to other modern browsers on reference hardware. <a href="https://code.google.com/p/robohornet/wiki/BenchmarkScoring" target="_blank">Learn more</a>';
    } else if (blockedRuns) {
      this.statusElement_.textContent = "Your browser's popup blocker prevented some of the benchmarks from running. Disable your popup blocker and run the test again to see the index.";
    } else if (failedRuns) {
      this.statusElement_.textContent = failedRuns + ' out of ' + this.benchmarks_.length + ' benchmark(s) failed.';
    } else {
      this.statusElement_.textContent = 'Ran ' + successfulRuns + ' out of ' + this.benchmarks_.length + ' benchmarks. Enable all benchmarks to compute the index.';
    }
    this.setStatus_(robohornet.Status.READY);
  };

  _p.progressTransitionDone_ = function() {
    // Wait until the progress bar fades out to put it back to the left.
    this.progressElement_.style.marginLeft = '-100%';
    this.progressElement_.removeEventListener(TRANSITION_END_EVENT, this.progressCallback_, false);
  }

  _p.benchmarkLoaded = function() {
    var benchmark = this.activeBenchmark_;
    if (!benchmark)
      return;

    var self = this;
    var suite = new Benchmark.Suite(this.name, {
      onComplete: function() { self.onBenchmarkComplete_(this, benchmark); },
      onAbort: function() { self.onBenchmarkAbort_(this, benchmark); }
    });

    var callFunction = function(win, fn, arg, deferred) {
      win[fn] && win[fn].call(win, arg);
      if (fn == 'setUp' && win['resetMathRandom'])
        win['resetMathRandom']();
      if (deferred)
        deferred.resolve();
    };

    var callTest = function(win, arg, deferred) {
      if (win['testAsync']) {
        win['testAsync'].call(win, deferred, arg);
      }
      else if (win['test']) {
        win['test'].call(win, arg);
        if (deferred)
          deferred.resolve();
      }
      else
        this.abort();
    };

    var win = this.benchmarkWindow_;
    for (var run, i = 0; run = benchmark.runs[i]; i++) {
      var arg = run[1];
      suite.add(run[0], {
        defer: true,
        fn: bind(callTest, suite, win, arg),
        setup: bind(callFunction, suite, win, 'setUp', arg),
        teardown: bind(callFunction, suite, win, 'tearDown', arg)
      });
    }

    this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.RUNNING);
    suite.run(true);
  };

  _p.initTags_ = function(technologyTags, productTags) {
    this.tags_ = [];
    this.tagsById_ = {};

    var f = function(tags, type) {
      for (var id in tags) {
        var tag = tags[id];
        tag.id = id;
        tag.type = type;
        tag.benchmarks = [];
        this.tags_.push(tag);
        this.tagsById_[id] = tag;
      }
    };

    var specialTags = {
      CORE: { name: 'Core' },
      EXTENDED: { name: 'Extended' },
      NONE: { name: 'None' }
    }

    f.call(this, technologyTags, robohornet.TagType.TECHNOLOGY);
    f.call(this, productTags, robohornet.TagType.APP);
    f.call(this, specialTags, robohornet.TagType.SPECIAL);
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

      for (var tagId, j = 0; tagId = details.tags[j]; j++) {
        var tag = this.tagsById_[tagId];
        benchmark.tags.push(tag);
        tag.benchmarks.push(benchmark);
      }

      // Add all benchmarks to special CORE or EXTENDED tag.
      var allTag = this.tagsById_[benchmark.extended ? 'EXTENDED' : 'CORE'];
      benchmark.tags.push(allTag);
      allTag.benchmarks.push(benchmark);
      
      this.benchmarks_.push(benchmark);
      this.benchmarksById_[benchmark.id] = benchmark;

      if (benchmark.extended)
        this.hasExtendedBenchmark_ = true;
    }
  };

  _p.initBenchmarkUi_ = function() {
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
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
    if (this.benchmarkWindow_) {
      this.benchmarkWindow_.close();
      this.benchmarkWindow_ = null
    }

    this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.LOADING);
    this.activeBenchmark_ = benchmark;

    //  We want to position the popup window on top, ideally with its bottom right corner in the bottom right of the screen.
    //  For most browsers and platforms, if we overshoot it's fine; the popup will be moved to be fully on screen.

    var TARGET_WINDOW_WIDTH = 800;
    var TARGET_WINDOW_HEIGHT = 600;

    var top = window.screen.availHeight + window.screen.availTop - TARGET_WINDOW_HEIGHT;
    var left = window.screen.availWidth + window.screen.availLeft - TARGET_WINDOW_WIDTH;

    this.benchmarkWindow_ = window.open(benchmark.filename + '?use_test_runner', 'robohornet',
        'left=' + left + ',top=' + top +
        ',width='+ TARGET_WINDOW_WIDTH + ',height=' + TARGET_WINDOW_HEIGHT);

    if (!this.benchmarkWindow_) {
      this.activeBenchmark_ = null;
      this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.POPUP_BLOCKED);
      window.setTimeout(bind(this.next_, this), 25);
    }

  };

  _p.onBenchmarkAbort_ = function(suite, benchmark) {
      if (benchmark.status == robohornet.enabledBenchmarks.ABORTED)
        return;

      this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.ABORTED);
      if (this.benchmarkWindow_)
        this.benchmarkWindow_.close();
      this.benchmarkWindow_ = null;
      window.setTimeout(bind(this.next_, this), 250);
  };

  _p.onBenchmarkComplete_ = function(suite, benchmark) {
    if (!this.benchmarkWindow_) {
      this.onBenchmarkAbort_(suite, benchmark);
      return;
    }

    this.benchmarkWindow_.close();
    this.benchmarkWindow_ = null;
    var results = [];
    for (var run, i = 0; run = suite[i]; i++) {
      results.push({
        name: run.name,
        mean: run.stats.mean * 1000,
        rme: run.stats.rme,
        runs: run.stats.sample.length
      });
    }
    benchmark.results = results;
    this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.SUCCESS);
    this.showBenchmarkResults_(benchmark);
    window.setTimeout(bind(this.next_, this), 25);
  };

  _p.onBenchmarkToggle_ = function(benchmark, event) {
    this.setBenchmarkEnabled_(benchmark, benchmark.toggleElement_.checked);
    this.updateHash_();
  }

  _p.setBenchmarkEnabled_ = function(benchmark, enabled) {
    benchmark.toggleElement_.checked = enabled;
    benchmark.enabled = enabled;
    enableClass(benchmark.detailsElement_, 'disabled', !benchmark.enabled);
    enableClass(benchmark.summaryRow_, 'disabled', !benchmark.enabled);
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

    addChildren(row, [
      createElement('td', '-'),
      createElement('td', '-', 'number'),
      createElement('td', benchmark.baselineTime.toFixed(2) + 'ms', 'number'),
      createElement('td', benchmark.computedWeight.toFixed(2) + '%', 'number'),
      createElement('td', '-', 'number')
    ]);
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

    var issueLink = document.createElement("a");
    issueLink.href = "http://github.com/robohornet/robohornet/issues/" + benchmark.issueNumber;
    issueLink.target = "_blank";
    issueLink.appendChild(document.createTextNode("View issue details on GitHub"));
    detailsElement.appendChild(issueLink);
    detailsElement.appendChild(document.createElement("br"));

    if (benchmark.extended)
      detailsElement.appendChild(this.makeTagElement_(this.tagsById_['EXTENDED']));
      
    for (var tag, i = 0; tag = benchmark.tags[i]; i++) {
      if (tag.type != robohornet.TagType.SPECIAL)
      detailsElement.appendChild(this.makeTagElement_(tag));
    }

    // Append list of runs/parameters.
    var runsTable = document.createElement('table');
    runsTable.id = identifier + '-runs';
    runsTable.className = 'runs';
    runsTable.appendChild(document.createElement('thead'));

    var headerRow = document.createElement('tr');
    addChildren(headerRow, [
      createElement('td', 'Parameters'),
      createElement('td', 'Runs', 'number'),
      createElement('td', 'Error', 'number'),
      createElement('td', 'Mean', 'number')
    ]);
    runsTable.tHead.appendChild(headerRow);

    runsTable.appendChild(document.createElement('tbody'));
    for (i = 0; i < benchmark.runs.length; i++) {
      var runsRow = document.createElement('tr');
      addChildren(runsRow, [
        createElement('td', benchmark.runs[i][0], 'name'),
        createElement('td', '0', 'number'),
        createElement('td', '0', 'number'),
        createElement('td', '0', 'number')
      ]);
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
    var caption = robohornet.enabledBenchmarksDescription[benchmark.status] ||
            'Unknown failure';
    benchmark.summaryRow_.cells[1].textContent = caption;
  };

  _p.setStatus_ = function(status) {
    this.status_ = status;

    var isRunning = status == robohornet.Status.RUNNING;
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      benchmark.toggleElement_.disabled = isRunning;
      if (isRunning)
        this.setBenchmarkStatus_(benchmark, robohornet.enabledBenchmarks.PENDING);
    }

    document.body.className = this.status_ == robohornet.Status.READY ? 'ready' : 'running';
    this.runElement_.textContent = robohornet.RunButtonCaption[status];
    this.runElement_.disabled = this.status_ != robohornet.Status.READY;
  };

  _p.setScore_ = function(opt_finalScore) {
    // Ensure that we have 4 digits in front of the dot and 2 after.
    this.indexElement_.textContent = formatNumber(this.score_, 4, 2);
    this.indexElement_.className = opt_finalScore ? 'final' : '';
    this.rawScoreElement_.textContent = this.rawScore_.toFixed(2);

    if (this.rawScoreElement_.classList.contains('final') != opt_finalScore)
        this.rawScoreElement_.classList.toggle('final');
  }

  _p.toggleBenchmarkDetails_ = function(benchmark, e) {
    var rowEle = benchmark.detailsElement_.parentElement.parentElement;
    rowEle.classList.toggle("expanded");
    benchmark.summaryRow_.classList.toggle("expanded");
  };

  _p.makeTagElement_ = function(tag) {
    var tagElement = createElement('span', tag.name, 'tag ' + tag.type);
    var callback = function(tag, event) {
      if (event.shiftKey) {
        this.addBenchmarksToSelectionByTag(tag);
      } else {
        this.selectBenchmarksByTag(tag);
      }
      // Undo the text selection from a shift-click.
      window.getSelection().removeAllRanges();
    };
    tagElement.addEventListener('click', bind(callback, this, tag), false);
    return tagElement;
  }

  _p.selectBenchmarksByTag = function(tag) {
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      this.setBenchmarkEnabled_(benchmark, false);
    }
    this.addBenchmarksToSelectionByTag(tag);
  }

  _p.addBenchmarksToSelectionByTag = function(tag) {
    for (var benchmark, i = 0; benchmark = tag.benchmarks[i]; i++) {
      this.setBenchmarkEnabled_(benchmark, true);
    }
    this.updateHash_();
  }

  _p.updateTagSelection_ = function() {
    // Get number of enabled benchmarks per tag.
    var enabledBenchmarksByTag = [];
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (!benchmark.enabled)
        continue;
      for (var tag, j = 0; tag = benchmark.tags[j]; j++) {
        enabledBenchmarksByTag[tag.name] = (enabledBenchmarksByTag[tag.name] || 0) + 1;
      }
    }

    // Highlight tags based on selection.
    for (var identifier in this.tagsById_) {
      var tag = this.tagsById_[identifier];
      var n = enabledBenchmarksByTag[identifier];
      enableClass(tag.element, 'partially-inactive', n && n != tag.benchmarks.length);
      enableClass(tag.element, 'inactive', !n);
    }
  };

  _p.updateHash_ = function() {
    // We'll keep track of how many benchmarks each of the tag has enabled.
    var enabledTagCount = {};
    var enabledBenchmarkIDs = [];
    var disabledBenchmarkIDs = [];
    for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
      if (benchmark.enabled) {
        enabledBenchmarkIDs.push(benchmark.id);
        for (var tag, k = 0; tag = benchmark.tags[k]; k++) {
          enabledTagCount[tag.id] = (enabledTagCount[tag.id] || 0) + 1;
        }
      }
      else {
        disabledBenchmarkIDs.push(benchmark.id);
      }
    }

    if (enabledBenchmarkIDs.length == 0) {
      window.location.hash = '#et=none';
      this.updateTagSelection_();
      return;
    }

    var maxTagId = 'NONE'
    var maxTagCount = 0;

    // See which of the tags has the most coverage.
    for (var tagId in enabledTagCount) {
      if (enabledTagCount[tagId] < this.tagsById_[tagId].benchmarks.length) {
        continue;
      }
      if (enabledTagCount[tagId] > maxTagCount) {
        maxTagCount = enabledTagCount[tagId];
        maxTagId = tagId;
      }
    }

    // Check if that maxTagId has coverage of all enabled benchmarks.
    if (maxTagCount == enabledBenchmarkIDs.length) {
      if (maxTagId == 'CORE') {
        // All is the default.
        window.location.hash = '';
      } else {
        window.location.hash = '#et=' + maxTagId.toLowerCase();
      }
    } else {
      // Fall back on covering the benchmarks one by one.
      // We want to encode as few IDs as possible in the hash.
      // This also gives us a good default to follow for new benchmarks.
      if (disabledBenchmarkIDs.length) {
        if (disabledBenchmarkIDs.length < enabledBenchmarkIDs.length) {
          window.location.hash = '#d=' + disabledBenchmarkIDs.join(',');
        } else {
          window.location.hash = '#e=' + enabledBenchmarkIDs.join(',');
        }
      } else {
        window.location.hash = '';
      }
    }

    this.updateTagSelection_();
  }

  _p.digestHash_ = function() {
    var hash = window.location.hash;

    if (!hash) {
      //The core set should be selected by default.
      this.selectBenchmarksByTag(this.tagsById_['CORE']);
      return;
    }
    hash = hash.replace('#', '').toLowerCase().split('&');
    var enableBenchmarks;
    var benchmark;
    var segment;

    //First, checkx if "enabled-tags" is in, because we do special processing if it is.
    for (segment, i = 0; segment = hash[i]; i++) {
      hash[i] = hash[i].split('=');
      if (hash[i][0] == "et") {
        var tag = this.tagsById_[hash[i][1].toUpperCase()];
        if (!tag) continue;
        this.selectBenchmarksByTag(tag);
        return;
      }
    }

    // There wasn't a single enabled tag. Let's see if there are any individual enabled/disabled benchmarks.
    for (var segment, i = 0; segment = hash[i]; i++) {
      enableBenchmarks = false;
      switch (hash[i][0]) {
        case 'e':
          enableBenchmarks = true;
          // We set all benchmarks to disable and then only enable some.
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
  this.issueNumber = details.issueNumber;
  this.extended = details.extended;
  this.enabled = true;
  this.tags = [];

  this.id = this.filename.match(/\/([A-z]+)\./)[1].toLowerCase();
};

function bind(fn, opt_scope, var_args) {
  var scope = opt_scope || window;
  var len = arguments.length;
  var args = [];
  for (var i = 2; i < len; i++) {
    args.push(arguments[i]);
  }
  return function(arguments) {
    var a = args.slice();
    a.push.call(a, arguments);
    fn.apply(scope, a);
  };
}
