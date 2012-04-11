/**
 * Benchmark version.
 *
 * @type {string}
 */
var BENCHMARK_VERSION = 'RH100';

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
      description: 'Tests adding rows to an existing table',
      filename: 'tests/addrow.html',
      runs: [
        ['250 rows',   250],
        ['1000 rows', 1000]
      ],
      weight: 2,
      baselineTime: 38,
      tags: [TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.DOM]
  },

  {
      name: 'Add Columns to Table',
      description: 'Tests adding columns to an existing table',
      filename: 'tests/addcol.html',      
      runs: [
        ['250 columns',   250],
        ['1000 columns', 1000]
      ],
      weight: 1,
      baselineTime: 46.5,
      tags: [TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.DOM]
  },

  {
      name: 'Descendant Selector',
      description: 'Tests descendant selectors at different DOM depths',
      filename: 'tests/descendantselector.html',
      runs: [
        ['1000 nodes deep', 1000]
      ],
      weight: 2,
      baselineTime: 47.99,
      tags: [TAGS.DOM, TAGS.CSS_SELECTORS]
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
      description: 'Test 2D canvas line painting.',
      filename: 'tests/canvasdrawline.html',
      runs: [
        ['500 lines', 500],
        ['2500 lines', 2500]
      ],
      weight: 3,
      baselineTime: 461.02,
      tags: [TAGS.CANVAS, TAGS.G_PRESENTATIONS]
  },

  {
      name: '2D Canvas toDataURL',
      description: 'Test converting a 2D canvas to a data URI',
      filename: 'tests/canvastodataurl.html',
      runs: [
        ['256x256, 1000 lines', [256, 1000]],
        ['512x512, 1000 lines', [512, 1000]],
        ['1024x1024, 1000 lines', [1024, 1000]]
      ],
      weight: 3,
      baselineTime: 2500,
      tags: [TAGS.CANVAS, TAGS.G_PRESENTATIONS]
  },

  {
      name: 'innerHTML Table',
      description: 'Test table render speed after innerHTML.',
      filename: 'tests/createtable.html',
      runs: [
        ['200x10', [200, 10]],
        ['200x50', [200, 50]],
        ['200x100', [200, 100]]
      ],
      weight: 2,
      baselineTime: 209.895,
      tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.TABLE]
  },

  {
      name: 'Table scrolling',
      description: 'Test scrolling speed using scrollTop',
      filename: 'tests/table_scrolltop.html',
      runs: [
        ['500x10', [500, 10]],
        ['500x50', [500, 50]],
        ['1000,10', [1000, 10]],
        ['1000,50', [1000, 50]]
      ],
      weight: 1,
      baselineTime: 204.36,
      tags: [TAGS.DOM, TAGS.G_SPREADSHEETS, TAGS.TABLE, TAGS.SCROLLING]
  },

  {
      name: 'Resize columns',
      description: 'Test resizing columns in a table',
      filename: 'tests/resizecol.html',
      runs: [
        ['500x10', [500, 10]],
        ['500x50', [500, 50]]
      ],
      weight: 2,
      baselineTime: 1892.655,
      tags: [TAGS.DOM, TAGS.TABLE, TAGS.G_SPREADSHEETS]
  },

  {
      name: 'SVG resize',
      description: 'Test resizing SVGs',
      filename: 'tests/svgresize.html',
      runs: [
        ['50 SVGs', 50],
        ['100 SVGs', 100]
      ],
      weight: 5,
      baselineTime: 41.43,
      tags: [TAGS.SVG, TAGS.G_PRESENTATIONS]
  },

  {
      name: 'ES5 Property Accessors',
      description: 'Test ES5 getter/setters',
      filename: 'tests/property_accessors.html',
      runs: [
        ['Getter', 'GET'],
        ['Setter', 'SET'],
        ['Combined', '']
      ],
      weight: 1,
      baselineTime: 100,
      tags: [TAGS.JS]
  },

  {
      name: 'Calculate primes',
      description: 'Test calculating primes from 2 to N',
      filename: 'tests/primes.html',
      runs: [
        ['Primes up to 1000', 1000],
        ['Primes up to 10000', 10000],
        ['Primes up to 100000', 100000]
      ],
      weight: 2,
      baselineTime: 115,
      tags: [TAGS.MATH, TAGS.G_MAPS]
  },

  {
      name: 'Argument instantiation',
      description: 'Test referencing the arguments array',
      filename: 'tests/varargs.html',
      runs: [
        ['100 Instantiations', 100],
        ['1000 Instantiations', 1000],
        ['1000000 Instantiations', 1000000]
      ],
      weight: 1,
      baselineTime: 300,
      tags: [TAGS.JS]
  },

  {
      name: 'Animated GIFS',
      description: 'Test scrolling lots of animated GIFs',
      filename: 'tests/animated_gifs.html',
      runs: [
        ['20x10 GIFs', [20, 10]],
        ['100x10 GIFs', [100, 10]],
        ['100x100 GIFs', [100, 100]]
      ],
      weight: 1,
      baselineTime: 30,
      tags: [TAGS.DOM, TAGS.SCROLLING]
  },

  {
    name: 'offsetHeight triggers reflow',
    description: 'Test the affect of forcing a reflow by calling offsetHeight',
    filename: 'tests/offsetreflow.html',
    runs: [
      ['100 Reflows', 100],
      ['1000 Reflows', 1000],
      ['10000 Reflows', 10000]
    ],
    weight: 5,
    baselineTime: 2500,
    tags: [TAGS.DOM, TAGS.G_SPREADSHEETS]
  },

  {
      name: 'DOM Range API',
      description: 'Test replacing a number of DOM nodes using the Range API',
      filename: 'tests/range.html',
      runs: [
        ['50 Nodes', 50],
        ['100 Nodes', 100]
      ],
      weight: 1,
      baselineTime: 260,
      tags: [TAGS.DOM]
  },

  {
    name: 'Write to localStorage',
    description: 'Test the localStorage write performance',
    filename: 'tests/localstorage_write.html',
    runs: [
      ['50 Writes', 50],
      ['100 Writes', 100],
      ['1000 Writes', 1000]
    ],
    weight: 5,
    baselineTime: 2500,
    tags: [TAGS.JS]
  },

  {
    name: 'Read from localStorage',
    description: 'Test the localStorage read performance',
    filename: 'tests/localstorage_read.html',
    runs: [
      ['50 Reads', 50],
      ['100 Reads', 100],
      ['1000 Reads', 1000]
    ],
    weight: 5,
    baselineTime: 2500,
    tags: [TAGS.JS]
  }
];

