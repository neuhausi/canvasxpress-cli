const util = require('util');
const path = require('path');
const fs = require('fs');
const ora = require('ora');
const puppeteer = require('puppeteer');
const isPkg = typeof process.pkg !== 'undefined';
const executablePath = puppeteer.executablePath().replace(/^.*?\/node_modules\/puppeteer\/\.local-chromium/, path.join(path.dirname(process.execPath), 'chromium'));

module.exports = async (obj) => {

  const dirname = isPkg ? process.argv[0].replace(/\/build\/canvasxpress.*$/, '') : process.argv[1].replace('/bin/canvasxpress', '');

  const today = new Date().toISOString().replace('-', '').split('T')[0].replace('-', '');

  const logFile = fs.createWriteStream((dirname + '/logs/io-' + today + '.log'), { flags: 'a' });

  const logStdout = process.stdout;

  const defhtml = ("file://" + dirname + "/src/canvasXpress.html");

  if (!fs.existsSync(dirname + '/logs')) {
    fs.mkdirSync(dirname + '/logs');
  }

  console.log = function () {
    logFile.write(util.format.apply(null, arguments) + '\n');
    logStdout.write(util.format.apply(null, arguments) + '\n');
  }
  console.error = console.log;

  const spinner = ora().start();

  try {

    const browser = await puppeteer.launch({
      headless: obj.debug ? false : true,
      devtools: obj.debug ? true : false,
      executablePath: isPkg ? executablePath : puppeteer.executablePath(),
      defaultViewport: {
        width: 1000,
        height: 1000
      },
      args: ['--no-sandbox',
        '--allow-file-access-from-files',
        '--enable-local-file-accesses']
    });

    const page = await browser.newPage();

    if (obj.input && !obj.input.match(/^file|^http/)) {
      obj.input = "file://" + path.resolve(input);
    }

    var msg = (obj.cmd == 'csv' ? 'png' : obj.cmd);
    var out = obj.input ? path.basename(obj.input).replace(/-/g, '').replace('.html', '.' + obj.cmd) : 'cX.' + obj.cmd;
    console.log("Creating " + msg + " file from " + (obj.input ? obj.input : 'input data') + " (" + (out).replace('//', '/') + ")");

    const func = function (obj) {
      if (obj.debug) {
        debugger;
      }
      var exec = function (cx, tg) {
        switch (obj.cmd) {
          case 'csv':
          case 'png':
            cx.print(false, tg + '.png');
            break;
          case 'svg':
            cx.saveSVG(false, tg + '.svg');
            break;
          case 'json':
            cx.save(false, tg + '.json');
            break;
          case 'reproduce':
            cx.reproduce(false, true, true);
            break;
        }
      }
      var clbk = function () {
        var cxs = CanvasXpress.instances;
        var cx = cxs[cxs.length - 1];
        var tg = cx.target;
        exec(cx, tg);
      }
      var cxs = CanvasXpress.instances;
      for (var i = 0; i < cxs.length; i++) {
        var cx = cxs[i];
        cx.setDimensions(obj.width, obj.height);
        if (obj.input) {
          try {
            cx.dataURL = obj.input;
            cx.remoteTransitionEffect = 'none';
            cx.getDataFromURLOrString(obj.target || cx.target, obj.config, false, false, clbk);
          } catch (err) {
            console.error(err);
          }
        } else if (obj.data) {
          try {
            cx.updateData(obj.data, false, false, obj.config);
            exec(cx, obj.target || cx.target);
            return;
          } catch (err) {
            console.error(err);
          }
        }
        
      }
    }

    await page._client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: obj.output
    });

    if (obj.input) {
      await page.goto(obj.cmd == 'csv' ? defhtml : obj.cmd = 'reproduce' ? obj.input + '?showTransition=false' : obj.input);
    } else {
      await page.goto(defhtml);
    }

    await page.waitFor(() => typeof (CanvasXpress) !== undefined && CanvasXpress.ready);

    await page.evaluate(`(${func.toString()})(${JSON.stringify(obj)})`);

    await setTimeout(() => {
      browser.close();
      spinner.stop();
    }, obj.cmd == 'csv' || obj.cmd == 'reproduce' ? obj.tmout + 2500 : obj.tmout);

  } catch (err) {

    console.error(err);

  }

}
