const minimist = require('minimist');
const path = require('path');
const chalk = require('chalk');
const clear = require('clear');
const figlet = require('figlet');

module.exports = () => {

  const args = minimist(process.argv.slice(2));

  let cmd = args._[0];

  let input = args.input || args.i || false;

  let output = args.output || args.o || "./";

  let target = args.target || args.t || false;

  let dat = args.data || args.d || false;

  let conf = args.config || args.c || false;

  let events = args.events || args.e || false;

  let debug = args.browser || args.b || false;

  let width = args.width || args.x || 800;

  let height = args.height || args.y || 800;

  let tmout = args.timeout || args.t || 2500;

  let data = dat ? JSON.parse(dat) : { "y": { "vars": ["Variable1"], "smps": ["Sample1", "Sample2", "Sample3"], "data": [[55, 44, 33]] } };

  let config = conf ? JSON.parse(conf) : { "graphType": "Boxplot", "transposeData": true, "asVariableFactors": ["dose"], "stringSampleFactors": ["dose"], "groupingFactors": ["dose"] };

  let obj = {
    cmd: cmd,
    input: input,
    output: output,
    target: target,
    data: data,
    config: config,
    events: events,
    debug: debug,
    width: width,
    height: height,
    tmout: tmout,
    args: args
  }

  if (args.version || args.v) {
    cmd = 'version';
  }

  if (args.help || args.h) {
    cmd = 'help';
  }

  if (!cmd) {
    cmd = 'help';
  }

  clear();

  console.log(
    chalk.green(
      figlet.textSync('CanvasXpress', { horizontalLayout: 'full' })
    )
  );

  switch (cmd) {

    case 'csv':
    case 'png':
    case 'svg':
    case 'json':
    case 'reproduce':
      if (input || data) {
        require('./cmds/io')(obj);
      } else {
        require('./cmds/help')(args);
      }
      break;
    case 'canvas':
      require(path.resolve(input).split('.').slice(0, -1).join('.'))(args);
      break;
    case 'version':
      require('./cmds/version')(args);
      break;
    case 'help':
      require('./cmds/help')(args);
      break;
    case 'test':
      require('./cmds/io')({
        cmd: "png",
        input: "https://www.canvasxpress.org/examples/bar-1.html",
        output: "./test/",
        target: false,
        data: false,
        config: false,
        events: events,
        debug: debug,
        width: width,
        height: height,
        tmout: tmout,
        args: args
      });
      require('./cmds/io')({
        cmd: "svg",
        input: "https://www.canvasxpress.org/examples/bar-1.html",
        output: "./test/",
        target: false,
        data: data,
        config: config,
        events: events,
        debug: debug,
        width: width,
        height: height,
        tmout: tmout,
        args: args
      });
      require('./cmds/io')({
        cmd: "json",
        input: "https://www.canvasxpress.org/examples/bar-1.html",
        output: "./test/",
        target: false,
        data: data,
        config: config,
        events: events,
        debug: debug,
        width: width,
        height: height,
        tmout: tmout,
        args: args
      });
      break;
    default:
      console.error(`"${cmd}" is not a valid command!`);
      break;

  }

}