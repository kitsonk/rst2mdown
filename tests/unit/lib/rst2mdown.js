define([
	'intern!object',
	'intern/dojo/node!fs',
	'intern/dojo/node!path',
	'../../../lib/rst2mdown'
], function (registerSuite, fs, path, rst2mdown) {
	var padding = 30;

	registerSuite(function () {
		var tests = {
			name: 'lib/rst2mdown'
		};

		var sources = fs.readdirSync('tests/unit/support').filter(function (filePath) {
			return /\.md$/.test(filePath);
		}).sort(function (a, b) {
			a = path.basename(a).toLowerCase();
			b = path.basename(b).toLowerCase();
			return a > b ? 1 : (a < b ? -1 : 0);
		});

		sources.forEach(function (filePath) {
			tests[filePath] = function () {
				filePath = 'tests/unit/support/' + filePath;
				var expected = fs.readFileSync(filePath, { encoding: 'utf8' }).replace(/\s/g, '');
				var input = fs.readFileSync(filePath.replace(/[^.]+$/, 'rst'), 'utf8');
				var output = rst2mdown(input).replace(/\s/g, '');
				var message;
				for (var i = 0; i < expected.length; i++) {
					if (output[i] !== expected[i]) {
						output = output.substring(Math.max(i - padding, 0), Math.min(i + padding, output.length));
						expected = expected.substring(Math.max(i - padding, 0), Math.min(i + padding, expected.length));

						message = path.basename(filePath) + ' failed at offset ' + i + ' near: "' + output + '"\n' +
							'Got: ' + output + '\n' +
							'Expected: ' + expected + '\n';

						throw new Error(message);
					}
				}
			};
		});

		return tests;
	});
});
