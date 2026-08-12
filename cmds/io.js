const util = require('util');
const path = require('path');
const fs = require('fs');
const ora = require('ora');
const { chromium } = require('playwright');

module.exports = async (obj) => {

  // Package root (node-cli/), where logs/ and src/ live. Derived from this file's
  // location (cmds/) so it is correct under global installs and on Windows, where
  // the previous argv[1] string-replace of '/bin/canvasxpress' broke.
  const dirname = path.join(__dirname, '..');

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

    const browser = await chromium.launch({
      headless: obj.debug ? false : true,
      devtools: obj.debug ? true : false,
      args: ['--no-sandbox',
        '--allow-file-access-from-files',
        '--enable-local-file-accesses']
    });

    const context = await browser.newContext({
      viewport: { width: 1000, height: 1000 }
    });

    const page = await context.newPage();

    const downloadDir = path.resolve(obj.output);
    const downloads = [];
    page.on('download', (dl) => {
      downloads.push(dl.saveAs(path.join(downloadDir, dl.suggestedFilename())));
    });

    page.on('console', consoleObj => {
      if (consoleObj.type() !== 'warning') {
        console.log(consoleObj.text());
      }
    });

    if (obj.input && !obj.input.match(/^file|^http/)) {
      obj.input = "file://" + path.resolve(obj.input);
    }

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
        console.log("Creating " + (obj.cmd == 'csv' ? 'png' : obj.cmd) + " file from " + (obj.input ? obj.input : 'input data') + " (" + obj.output + (obj.target || cx.target) + ".png)");
        exec(cx, tg);
      }
      var cxs = CanvasXpress.instances;
      for (var i = 0; i < cxs.length; i++) {
        var cx = cxs[i];

        cx.setDimensions(obj.width, obj.height);
        if (obj.input) {
          try {
            if (obj.cmd == 'csv') {
              cx.dataURL = obj.input;
              cx.remoteTransitionEffect = 'none';
              cx.getDataFromURLOrString(obj.target || cx.target, obj.config, false, false, clbk);
            } else {
              console.log("Creating " + (obj.cmd == 'csv' ? 'png' : obj.cmd) + " file from " + (obj.input ? obj.input : 'input data') + " (" + obj.output + (obj.target || cx.target) + "." + obj.cmd + ")");
              exec(cx, obj.target || cx.target);
            }
          } catch (err) {
            console.error(err);
          }
        } else if (obj.data) {
          try {
            console.log("Creating " + (obj.cmd == 'csv' ? 'png' : obj.cmd) + " file from " + (obj.input ? obj.input : 'input data') + " (" + obj.output + (obj.target || cx.target) + "." + obj.cmd + ")");
            cx.updateData(obj.data, false, false, obj.config);
            exec(cx, obj.target || cx.target);
            return;
          } catch (err) {
            console.error(err);
          }
        }

      }
    }

    const targetUrl = obj.input
      ? (obj.cmd == 'csv' ? defhtml : obj.cmd == 'reproduce' ? obj.input + '?showTransition=false' : obj.input)
      : defhtml;

    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    await page.waitForFunction(() => typeof CanvasXpress !== 'undefined');

    // Create a CX instance if one doesn't already exist (onReady in template
    // has a circular dependency that prevents auto-instantiation in headless)
    await page.evaluate(() => {
      if (!CanvasXpress.instances || CanvasXpress.instances.length === 0) {
        new CanvasXpress("cX", {y:{vars:["V"],smps:["S"],data:[[0]]}}, {});
      }
    });
    await page.waitForFunction(() => CanvasXpress.ready);

    await page.evaluate(`(${func.toString()})(${JSON.stringify(obj)})`);

    const delay = obj.cmd == 'csv' || obj.cmd == 'reproduce' ? obj.tmout + 2500 : obj.tmout;
    await page.waitForTimeout(delay);

    await Promise.all(downloads);

    await browser.close();
    spinner.stop();

  } catch (err) {

    console.error(err);
    // Report failure to the shell so CI/scripts can detect a failed render.
    process.exitCode = 1;

  }

}
