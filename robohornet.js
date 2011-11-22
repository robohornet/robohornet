var robohornet = {};

robohornet.BENCHMARK_VERSION = 'RH100';

robohornet.Runner = function(benchmarks) {
    this.testFrame_ = document.getElementById('testFrame');
    this.statusElement_ = document.getElementById('status');
    this.scoreElement_ = document.getElementById('score');
    this.runElement_ = document.getElementById('runButton');
    this.testsContainer_ = document.getElementById('tests');
    this.benchmarks_ = benchmarks;
    this.currentIndex_ = -1;
    this.overallScore_ = 0;
    this.benchmarkCount_ = 0;
    this.benchmarksRun_ = 0;
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
            this.register_(benchmark);
        }
        this.benchmarkCount_ = this.benchmarks_.length;

        var self = this;
        this.testsContainer_.addEventListener('click', function(e) { self.onClick_(e); }, false);
        
        this.toggle_();
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
            this.setBenchmarkStatus_(benchmark, 'Waiting...');
        }
        this.benchmarksRun_ = 0;
        this.next_();
    };

    _p.onClick_ = function(e) {
        if (e.target.tagName == 'INPUT' && e.target.type == 'checkbox')
            this.toggle_();
    };

    _p.toggle_ = function(e) {
        for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
            var identifier = 'benchmark-' + benchmark.index;
            benchmark.enabled = document.getElementById(identifier + '-toggle').checked;
               
            var el = document.getElementById(identifier + '-runs').parentNode;
            el.className = 'details-container ' + (benchmark.enabled ? 'enabled' : 'disabled');
        }
    };

    _p.next_ = function() {
       if (++this.currentIndex_ < this.benchmarks_.length) {
            this.load_(this.benchmarks_[this.currentIndex_]);
        } else
            this.done_();
    };

    _p.done_ = function() {
        this.testFrame_.src = 'javascript:void(0)';
        this.scoreElement_.textContent = '';
        if (this.benchmarksRun_ == this.benchmarkCount_) {
            var version = document.createElement('span');
            version.className = 'version';
            version.appendChild(document.createTextNode(robohornet.BENCHMARK_VERSION));
            this.scoreElement_.appendChild(version);
            var score = document.createElement('span');
            score.appendChild(document.createTextNode(Math.round(this.overallScore_ * 100) / 100));
            this.scoreElement_.appendChild(score);
        } else {
            var message = document.createElement('em');
            message.appendChild(document.createTextNode('Enable all tests to see the score'));
            this.scoreElement_.appendChild(message);
        }
        this.runElement_.disabled = false;
        for (var benchmark, i = 0; benchmark = this.benchmarks_[i]; i++) {
            var identifier = 'benchmark-' + benchmark.index;
            document.getElementById(identifier + '-toggle').disabled = false;
        }

        this.setStatus_('Ran ' + this.benchmarksRun_ + ' out of ' + this.benchmarkCount_ + ' benchmarks.');
    };

    _p.load_ = function(benchmark) {
        if (!benchmark.enabled) {
            this.setBenchmarkStatus_(benchmark, 'Skipped');
            this.next_();
            return;
        }
        
        benchmark.loadCallback_ = bind(this.onFrameLoaded_, this, benchmark);
        benchmark.errorCallback_ = bind(this.onFrameError_, this, benchmark);
        this.testFrame_.addEventListener('load', benchmark.loadCallback_, false);
        this.testFrame_.addEventListener('error', benchmark.errorCallback_, false);

        this.setBenchmarkStatus_(benchmark, 'Loading...');
        this.testFrame_.src = benchmark.filename;
    };

    _p.onFrameLoaded_ = function(benchmark) {
        this.removeListeners_(benchmark);
        
        var win = this.testFrame_.contentWindow;
        if (!win.test) {
            this.setBenchmarkStatus_(benchmark, 'Invalid file.');
            this.next_();
            return;
        }

        var self = this;
        var suite = new Benchmark.Suite(benchmark.name, {
            onComplete: function() { self.onComplete_(benchmark, this); }
        });

        for (var run, i = 0; run = benchmark.runs[i]; i++) {
            var argument = run[1];
            suite.add(run[0], bind(win.test, win, argument), {
                setup: bind(win.setUp, win, argument),
                teardown: bind(win.tearDown, win, argument)
            });
        }

        this.setBenchmarkStatus_(benchmark, 'Running...');
        suite.run(true);
    };

    _p.onFrameError_ = function(benchmark) {
        this.removeListeners_(benchmark);
        this.setBenchmarkStatus_(benchmark, 'Unable to load file.');
        this.next_();
    };

    _p.removeListeners_ = function(benchmark) {
        this.testFrame_.removeEventListener('load', benchmark.loadCallback_, false);
        this.testFrame_.removeEventListener('error', benchmark.errorCallback_, false);
        delete benchmark.loadCallback_;
        delete benchmark.errorCallback_;
    };

    _p.setBenchmarkStatus_ = function(benchmark, statusText) {
        var row = document.getElementById('benchmark-' + benchmark.index);
        row.cells[1].textContent = statusText;
    };

    _p.onComplete_ = function(benchmark, suite) {
        var results = [];
        for (var run, i = 0; run = suite[i]; i++) {
            results.push({
                name: run.name,
                mean: run.stats.mean * 1000,
                rme: run.stats.RME,
                runs: run.stats.size
            });
        }
        this.benchmarksRun_++;
        this.setResults_(benchmark, results);
        this.next_();
    };

    _p.setResults_ = function(benchmark, results) {
        var row = document.getElementById('benchmark-' + benchmark.index);
        row.cells[1].textContent = 'Computing Score...';
        
        var accumulatedMean = 0;
        var runsTable = document.getElementById(row.id + '-runs');
        for (var result, i = 0; result = results[i]; i++) {
            var runCells = runsTable.tBodies[0].rows[i].cells;
            runCells[1].textContent = result.runs;
            runCells[2].textContent = String.fromCharCode(177) + result.rme.toFixed(2) + '%';
            runCells[3].textContent = result.mean.toFixed(2) + 'ms';
            accumulatedMean += result.mean;
        }

        var diff = accumulatedMean - benchmark.baselineTime;
        var score = benchmark.baselineTime * benchmark.computedWeight / accumulatedMean;
        this.overallScore_ += score;

        row.cells[1].textContent = 'Completed successfully ';
        row.cells[2].textContent = accumulatedMean.toFixed(2) + 'ms';
        row.cells[5].textContent = score.toFixed(2);
    };

    _p.addCell_ = function(rowElement, textContent, opt_className) {
        var cell = document.createElement('td');
        if (opt_className)
            cell.className = opt_className;
        cell.appendChild(document.createTextNode(textContent));
        rowElement.appendChild(cell);
    };

    _p.register_ = function(benchmark) {
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
        
        var label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.appendChild(document.createTextNode(benchmark.name));
        cell.appendChild(label);
       
        row.appendChild(cell);
        
        this.addCell_(row, '-');
        this.addCell_(row, '-', 'number');
        this.addCell_(row, benchmark.baselineTime.toFixed(2) + 'ms', 'number');
        this.addCell_(row, benchmark.computedWeight.toFixed(2) + '%', 'number');
        this.addCell_(row, '-', 'number');
        this.testsContainer_.tBodies[0].appendChild(row);

        // Append details row.
        row = document.createElement('tr');
        cell = document.createElement('td');
        cell.className = 'details';
        cell.colSpan = 2;

        var detailsElement = document.createElement('div');
        detailsElement.className = 'details-container';
        cell.appendChild(detailsElement);
        detailsElement.appendChild(document.createTextNode(benchmark.description));

        // Append list of runs/parameters.
        var runsTable = document.createElement('table');
        runsTable.id = identifier + '-runs';
        runsTable.className = 'runs';
        runsTable.appendChild(document.createElement('thead'));

        var headerRow = document.createElement('tr');
        this.addCell_(headerRow, 'Parameters');
        this.addCell_(headerRow, 'Runs',  'number');
        this.addCell_(headerRow, 'Error', 'number');
        this.addCell_(headerRow, 'Mean',  'number');
        runsTable.tHead.appendChild(headerRow);

        runsTable.appendChild(document.createElement('tbody'));
        for (var i = 0; i < benchmark.runs.length; i++) {
            var runsRow = document.createElement('tr');
            this.addCell_(runsRow, benchmark.runs[i][0], 'name');
            this.addCell_(runsRow, '0', 'number');
            this.addCell_(runsRow, '0', 'number');
            this.addCell_(runsRow, '0', 'number');
            runsTable.tBodies[0].appendChild(runsRow);
        }
        detailsElement.appendChild(runsTable);

        row.appendChild(cell);
        this.testsContainer_.tBodies[0].appendChild(row);
    };

    _p.setStatus_ = function(textContent) {
        this.statusElement_.textContent = textContent;
    };
})();


function bind(fn, opt_scope, var_args) {
    var scope = opt_scope || window;
    var len = arguments.length;
    var args = [];
    for (var i = 2; i < len; i++) {
        args.push(arguments[i]);
    };
    return function() {
        fn.apply(scope, args);
    };
}
