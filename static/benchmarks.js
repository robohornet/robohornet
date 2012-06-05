/**
 * Benchmark version.
 *
 * @type {string}
 */
var BENCHMARK_VERSION = 'RH-A1';

var TAGS = {
  "G_SPREADSHEETS": {
    prettyName: "Google Spreadsheets",
    name: "G_SPREADSHEETS",
    type: robohornet.TagType.APP
  },
  "G_PRESENTATIONS": {
    prettyName: "Google Presentations",
    name: "G_PRESENTATIONS",
    type: robohornet.TagType.APP
  },
  "G_MAPS": {
    prettyName: "Google Maps",
    name: "G_MAPS",
    type: robohornet.TagType.APP
  },
  "YUI" : {
    prettyName: "YUI",
    name: "YUI",
    type: robohornet.TagType.APP
  },
  "JQUERY" : {
    prettyName: "jQuery",
    name: "JQUERY",
    type: robohornet.TagType.App
  },
  "EMBER" : {
    prettyName: "Ember",
    name: "EMBER",
    type: robohornet.TagType.App
  },
  "HANDLEBARS" : {
    prettyName : "Handlebars",
    name: "HANDLEBARS",
    type: robohornet.TagType.App
  },
  "METAMORPH" : {
    prettyName : "Metamorph.js",
    name: "METAMORPH",
    type: robohornet.TagType.App
  },
  "TABLE": {
    prettyName: "Table",
    name: "TABLE",
    type: robohornet.TagType.TECHNOLOGY
  },
  "DOM": {
    prettyName: "DOM",
    name: "DOM",
    type: robohornet.TagType.TECHNOLOGY
  },
  "CSS_SELECTORS": {
    prettyName: "CSS Selectors",
    name: "CSS_SELECTORS",
    type: robohornet.TagType.TECHNOLOGY
  },
  "CANVAS": {
    prettyName: "Canvas",
    name: "CANVAS",
    type: robohornet.TagType.TECHNOLOGY
  },
  "SCROLLING": {
    prettyName: "Scrolling",
    name: "SCROLLING",
    type: robohornet.TagType.TECHNOLOGY
  },
  "SVG": {
    prettyName: "SVG",
    name: "SVG",
    type: robohornet.TagType.TECHNOLOGY
  },
  "JS": {
    prettyName: "Javascript",
    name: "JS",
    type: robohornet.TagType.TECHNOLOGY
  },
  "MATH": {
    prettyName: "Math",
    name: "MATH",
    type: robohornet.TagType.TECHNOLOGY
  }
};


/*
 * List of benchmakrs. Array of objects.
 *
 * name:         Short human readable name of benchmark.
 * description:  Description of benchmark.
 * filename:     Filename of benchmark, each benchmark file must implement a test
 *               function and may implement a setUp and tearDown function.
 * runs:         List of parameters to feed to test, setUp and tearDown
 *               functions. For each entry a test run is constructed and the
 *               parameter in the second field is fed to the test function.
 *               The first field is a short human readable description of the
 *               parameter.
 * weight:       Weight of test as relative to the other tests in the file.
 *               A percentage weight will be computed based on the relative
 *               weight of each benchmark.
 * baselineTime: Baseline time, in milliseconds.
 */
var benchmarks = [
  {
      name: 'Add Rows to Table',
      issueNumber: 10,
      description: 'Tests adding rows to an existing table',
      filename: 'tests/addrow.html',
      runs: [
        ['250 rows',   250],
        ['1000 rows', 1000]
      ],
      weight: 2,
      baselineTime: 43.61,
      tags: [TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.DOM, TAGS.YUI, TAGS.JQUERY, TAGS.EMBER]
  },

  {
      name: 'Add Columns to Table',
      issueNumber: 11,
      description: 'Tests adding columns to an existing table',
      filename: 'tests/addcol.html',      
      runs: [
        ['250 columns',   250],
        ['1000 columns', 1000]
      ],
      weight: 1.5,
      baselineTime: 73.25,
      tags: [TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.DOM, TAGS.YUI]
  },

  {
      name: 'Descendant Selector',
      issueNumber: 12,
      description: 'Tests descendant selectors at different DOM depths',
      filename: 'tests/descendantselector.html',
      runs: [
        ['1000 nodes deep', 1000]
      ],
      weight: 2.5,
      baselineTime: 35.27,
      tags: [TAGS.DOM, TAGS.CSS_SELECTORS, TAGS.YUI]
  },

/*
  {
      name: 'Input Selection',
      description: 'Test the cost of selecting the text in an input field. In some browsers this causes a relayout which can be expensive.',
      filename: 'tests/inputselect.html',
      runs: [
        ['10 nodes deep',     10],
        ['100 nodes deep',   100],
        ['1000 nodes deep', 1000]
      ],
      weight: 1,
      baselineTime: 2.75
  },
*/

  {
      name: '2D Canvas Draw',
      issueNumber: 13,
      description: 'Test 2D canvas line painting.',
      filename: 'tests/canvasdrawline.html',
      runs: [
        ['500 lines', 500],
        ['2500 lines', 2500]
      ],
      weight: 3.5,
      baselineTime: 97.79,
      tags: [TAGS.CANVAS, TAGS.G_PRESENTATIONS, TAGS.YUI],
  },

  {
      name: '2D Canvas toDataURL',
      issueNumber: 14,
      description: 'Test converting a 2D canvas to a data URI',
      filename: 'tests/canvastodataurl.html',
      runs: [
        ['256x256, 1000 lines', [256, 1000]],
        ['512x512, 1000 lines', [512, 1000]],
        ['1024x1024, 1000 lines', [1024, 1000]]
      ],
      weight: 2,
      baselineTime: 724.78,
      tags: [TAGS.CANVAS, TAGS.G_PRESENTATIONS]
  },

  {
      name: 'innerHTML Table',
      issueNumber: 15,
      description: 'Test table render speed after innerHTML.',
      filename: 'tests/createtable.html',
      runs: [
        ['200x10', [200, 10]],
        ['200x50', [200, 50]],
        ['200x100', [200, 100]]
      ],
      weight: 2,
      baselineTime: 392.75,
      tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.YUI, TAGS.JQUERY, TAGS.EMBER]
  },

  {
      name: 'Table scrolling',
      issueNumber: 16,
      description: 'Test scrolling speed using scrollTop',
      filename: 'tests/table_scrolltop.html',
      runs: [
        ['500x10', [500, 10]],
        ['500x50', [500, 50]],
        ['1000,10', [1000, 10]],
        ['1000,50', [1000, 50]]
      ],
      weight: 2,
      baselineTime: 1306.62,
      tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.SCROLLING, TAGS.YUI]
  },

  {
      name: 'Resize columns',
      issueNumber: 17,
      description: 'Test resizing columns in a table',
      filename: 'tests/resizecol.html',
      runs: [
        ['500x10', [500, 10]],
        ['500x50', [500, 50]]
      ],
      weight: 2,
      baselineTime: 1944.59,
      tags: [TAGS.DOM, TAGS.TABLE, TAGS.G_SPREADSHEETS, TAGS.YUI]
  },

  {
      name: 'SVG resize',
      issueNumber: 18,
      description: 'Test resizing SVGs',
      filename: 'tests/svgresize.html',
      runs: [
        ['50 SVGs', 50],
        ['100 SVGs', 100]
      ],
      weight: 2,
      baselineTime: 234.91,
      tags: [TAGS.SVG, TAGS.G_PRESENTATIONS, TAGS.YUI]
  },

  {
      name: 'ES5 Property Accessors',
      issueNumber: 19,
      description: 'Test ES5 getter/setters',
      filename: 'tests/property_accessors.html',
      runs: [
        ['Getter', 'GET'],
        ['Setter', 'SET'],
        ['Combined', '']
      ],
      weight: 1,
      baselineTime: 84.50,
      tags: [TAGS.JS, TAGS.EMBER]
  },

  {
      name: 'Calculate primes',
      issueNumber: 20,
      description: 'Test calculating primes from 2 to N',
      filename: 'tests/primes.html',
      runs: [
        ['Primes up to 1000', 1000],
        ['Primes up to 10000', 10000],
        ['Primes up to 100000', 100000]
      ],
      weight: 1,
      baselineTime: 98.52,
      tags: [TAGS.MATH, TAGS.G_MAPS, TAGS.JQUERY, TAGS.EMBER, TAGS.HANDLEBARS]
  },

  {
      name: 'Argument instantiation',
      issueNumber: 21,
      description: 'Test referencing the arguments array',
      filename: 'tests/varargs.html',
      runs: [
        ['100 Instantiations', 100],
        ['1000 Instantiations', 1000],
        ['1000000 Instantiations', 1000000]
      ],
      weight: 2,
      baselineTime: 272.89,
      tags: [TAGS.JS, TAGS.YUI, TAGS.JQUERY, TAGS.EMBER]
  },

  {
      name: 'Animated GIFS',
      issueNumber: 22,
      description: 'Test scrolling lots of animated GIFs',
      filename: 'tests/animated_gifs.html',
      runs: [
        ['20x10 GIFs', [20, 10]],
        ['100x10 GIFs', [100, 10]],
        ['100x100 GIFs', [100, 100]]
      ],
      weight: 0.25,
      baselineTime: 187.83,
      tags: [TAGS.DOM, TAGS.SCROLLING]
  },

  {
    name: 'offsetHeight triggers reflow',
    issueNumber: 30,
    description: 'Test the affect of forcing a reflow by calling offsetHeight',
    filename: 'tests/offsetreflow.html',
    runs: [
      ['100 Reflows', 100],
      ['1000 Reflows', 1000],
      ['10000 Reflows', 10000]
    ],
    weight: 3,
    baselineTime: 587.35,
    tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.YUI, TAGS.JQUERY, TAGS.EMBER]
  },

  {
      name: 'DOM Range API',
      issueNumber: 9,
      description: 'Test replacing a number of DOM nodes using the Range API',
      filename: 'tests/range.html',
      runs: [
        ['50 Nodes', 50],
        ['100 Nodes', 100]
      ],
      weight: 1,
      baselineTime: 105.99,
      tags: [TAGS.DOM, TAGS.YUI, TAGS.METAMORPH]
  },

  {
    name: 'Write to localStorage',
    issueNumber: 23,
    description: 'Test the localStorage write performance',
    filename: 'tests/localstorage_write.html',
    runs: [
      ['50 Writes', 50],
      ['100 Writes', 100],
      ['1000 Writes', 1000]
    ],
    weight: 2,
    baselineTime: 43.34,
    tags: [TAGS.JS, TAGS.YUI]
  },

  {
    name: 'Read from localStorage',
    issueNumber: 24,
    description: 'Test the localStorage read performance',
    filename: 'tests/localstorage_read.html',
    runs: [
      ['50 Reads', 50],
      ['100 Reads', 100],
      ['1000 Reads', 1000]
    ],
    weight: 2,
    baselineTime: 33.48,
    tags: [TAGS.JS, TAGS.YUI]
  }
];

