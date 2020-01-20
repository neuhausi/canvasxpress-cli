const util = require('util');
const path = require('path');
const fs = require('fs');
const ora = require('ora');
const puppeteer = require('puppeteer');
const executablePath = puppeteer.executablePath().replace(/^.*?\/node_modules\/puppeteer\/\.local-chromium/, path.join(path.dirname(process.execPath), 'chromium'));

module.exports = async (args) => {

	const dirname = process.argv[0].replace(/\/build\/canvasxpress.*$/, '') : process.argv[1].replace('/bin/canvasxpress', '');
	
	const today = new Date().toISOString().replace('-', '').split('T')[0].replace('-', '');
	
	const logFile = fs.createWriteStream((dirname + '/logs/io-' + today + '.log'), {flags : 'a'});

	const logStdout = process.stdout;
  
	const debug = args.debug || args.d;
	
	const width = args.width || args.x || 800;
	
	const height = args.height || args.y || 800;	
	
	const output = args.output || args.o || './cX.png';

	const tmout = args.timeout || args.t || 500;
	
	const spinner = ora().start();

	const defhtml = ("file://" + dirname + "/src/canvasXpress.html");
	
	if (!fs.existsSync(dirname + '/logs')) {
		fs.mkdirSync(dirname + '/logs');
	}
	
	console.log = function () {
	  logFile.write(util.format.apply(null, arguments) + '\n');
	  logStdout.write(util.format.apply(null, arguments) + '\n');
	}
	console.error = console.log;

  try {
  	
		const browser = await puppeteer.launch({ 
			headless: debug ? false : true,
			devtools: debug ? true : false, 
			executablePath: puppeteer.executablePath(),
			defaultViewport: {
				width: 1000,
				height: 1000
			},
			args: ['--no-sandbox',
				     '--allow-file-access-from-files',
				     '--enable-local-file-accesses']
		});
		
		const page = await browser.newPage();
				
		console.log("Creating CanvasXpress file " + output);

		const func = function(o) {

			var debug = o.debug;

			if (debug) {
		    debugger;
		  }

		 	var cx = CanvasXpress.instances[0];

		 	var target = JSON.parse(o.args.target || o.args.t) || cx.target;			 				  

    	try {

  		 	var data = JSON.parse(o.args.data || o.args.d) || false;
			  
  			var config = JSON.parse(o.args.config || o.args.c) || false;
  			  
  			var events = o.args.events || o.args.e || false;
  			 	
      	cx.setDimensions(o.width, o.height);

      	cx.updateData(data, false, true, config);
      	    		
			 	cx.print(false, target + '.png');

		  }
    	
		}
		
		const obj = {
			debug: debug,
			args: args,
			width: width,
			height: height,
			output: output
		}

		await page._client.send('Page.setDownloadBehavior', {
		  behavior: 'allow', 
		  downloadPath: output
		});

		await page.goto(defhtml);
		
		await page.waitFor( () => typeof(CanvasXpress) !== undefined && CanvasXpress.ready );

		await page.evaluate( `(${func.toString()})(${JSON.stringify(obj)})` );
		
		await setTimeout(() => { 
			browser.close(); 
	    spinner.stop();
		}, tmout);
		
  } catch (err) {

    console.error(err);
  	
  }
  
}
