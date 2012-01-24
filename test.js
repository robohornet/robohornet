if (window.opener && window.opener.__robohornet__ && window.location.search == '?use_test_runner') {
    document.body.appendChild(document.createTextNode('Running test using test runner...'));
    window.opener.__robohornet__.benchmarkLoaded();
} else {

    document.body.appendChild(document.createTextNode('Running test standalone...'));

    setUp();
    window.setTimeout(function() {
        var startTime = new Date().getTime();
        test();
        var endTime = new Date().getTime();
        document.body.appendChild(document.createTextNode('Ran test in ' + (endTime - startTime) + ' ms.'));
    }, 0);
}
