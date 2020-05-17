var fs = require('fs');
var jsdom = require("jsdom").JSDOM;
var canvas = require("canvas");

var html = '' +
  '<html>' +
  '  <head>' +
  '    <script type="text/javascript" src="https://www.canvasxpress.org/dist/canvasXpress.min.js"></script>' +
  '    <script>' +
  '      var cx = new CanvasXpress("canvas", {' +
  '        "y" : {' +
  '          "data" : [ [33,44,55] ],' +
  '          "smps" : ["Sample1", "Sample2", "Sample3"],' +
  '          "vars" : ["Variable1"]' +
  '        }' +
  '      }, {' +
  '        "graphOrientation" : "vertical",' +
  '        "graphType" : "Bar",' +
  '        "theme" : "CanvasXpress",' +
  '        "title" : "Bar Graph Title"' +
  '      });' +
  '    </script>' +
  '  </head>' +
  '  <body>' +
  '    <div>' +
  '      <canvas id="canvas" width="600" height="600"></canvas>' +
  '    </div>' +
  '  </body>' +
  '</html>';

var opts = {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true
};

function main() {
  if (typeof window !== 'undefined') {
    window.onload = function () {
      var cX = window.CanvasXpress.instances[0];
      cX.print(cX.target + '.png');
      var wait = function () {
        if (cX.meta.base64) {
          fs.writeFile(cX.target + '.png', cX.meta.base64, 'base64', function (err) {
          });
        } else {
          setTimeout(wait, 50);
        }
      }
      wait();
    }

  } else {
    setTimeout(main, 50);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  exports.main = main
}

global.window = (new jsdom(html, opts)).window;

main();