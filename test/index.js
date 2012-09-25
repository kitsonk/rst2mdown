#!/usr/bin/env node

var fs = require("fs"),
	path = require("path"),
	rst2mdown = require("rst2mdown"),
	dir = __dirname + "/tests";

var BREAK_ON_ERROR = false;

var files;

var load = function(){
	files = {};

	var list = fs.readdirSync(dir).filter(function(file){
			return /\.mdown$/.test(file);
		}).sort(function(a, b){
			a = path.basename(a).toLowerCase().charCodeAt(0);
			b = path.basename(b).toLowerCase().charCodeAt(0);
			return a > b ? 1 : (a < b ? -1 : 0);
		}),
		i = 0,
		l = list.length,
		file;

	for(; i < l; i++){
		file = path.join(dir, list[i]);
		files[path.basename(file)] = {
			source: fs.readFileSync(file, "utf8"),
			expected: fs.readFileSync(file.replace(/[^.]+$/, "mdown"), "utf8")
		};
	}

	return files;
};

var main = function(){
	if(!files) load();

	var complete = 0,
		keys = Object.keys(files),
		i_ = 0,
		l_ = keys.length,
		filename,
		file,
		text,
		expected;

main:
	for(; i_ < l_; i_++){
		filename = keys[i_];
		file = files[filename];

		try{
			text = rst2mdown(file.source).replace(/\s/g, "");
			expected = file.expected.replace(/\s/g, "");
		}catch(e){
			console.log("%s failed.", filename);
			throw e;
		}

		var i = 0,
			l = expected.length;

		for(; i < l; i++){
			if(text[i] !== expected[i]){
				text = text.substring(Math.max(i - 30, 0), Math.min(i + 30, text.length));
				expected = expected.substring(Math.max(i - 30, 0), Math.min(i + 30, expected.length));

				console.log("\n#%d. %s failed at offset %d. Near: '%s'.\n", i_ + 1, filename, i, text);
				console.log("\nGot:\n%s\n", text.trim() || text);
				console.log("\nExpected:\n%s\n", expected.trim() || expected);

				if(BREAK_ON_ERROR){
					break main;
				}else{
					break;
				}
			}
		}

		if(i === l){
			complete++;
			console.log("#%d. %s completed.", i_ + 1, filename);
		}
	}

	console.log("%d/%d tests completed successfully.", complete, l_);
};

if(!module.parent){
	main();
}else{
	main.main = main;
	main.load = load;
	module.exports = main;
}