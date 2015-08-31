define({
	loaderOptions: {
		packages: [
			{ name: 'rst2mdown', location: '.' }
		]
	},

	suites: [ 'rst2mdown/tests/unit/all' ],

	excludeInstrumentation: /^(?:tests|node_modules)\//
});
