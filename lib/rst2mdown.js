/*
 * rst2mdown - A reStructuredText to markdown converter
 * Copyright 2011 - 2013, Kitson P. Kelly. (BSD-3-Term Licensed)
 */

/* global global */
/* global module */

(function () {

	function repeatString(string, num) {
		// summary:
		//		Duplicates a string *n* times
		return new Array(num + 1).join(string);
	}

	var headingLevels;

	// All the block RegEx are designed to 'consume' from the start of the line, where they will be used in
	// order to until what remains to be 'consumed' is the most non-specific text.
	var block = {
		// Consumes any 'blank' newlines, this is usually because the preceding text has already been consumed
		newline: /^\n+/,

		// Consumes section titles where the separator is above or blow:
		//
		//		=======
		//		Title 1
		//		=======
		//
		//	RegEx:
		//		^ - Match start of line
		//		(=|-|`|:|\.|'|'|~|^|_|\*|\+|#) {3,} - Capture
		//			=|-|`|:|\.|'|'|~|^|_|\*|\+|# - A marker
		//			{3,} - Repeated at least 3 times
		//		 * - Any number of trailing spaces
		//		\n - One new line
		//		 * - Any number of leading spaces
		//		([^\n]+) - Capture
		//			[^\n]+ - One or more characters not a new line
		//		\n - A new line
		//		\1+ - One or more characters captured above
		//		 * - Any trailing spaces
		//		\n* - Any trailing newlines
		sectionAboveBelow: /^(=|-|`|:|\.|'|'|~|^|_|\*|\+|#) {3,} *\n *([^\n]+)\n\1+ *\n*/,

		// Consumes section titles where the seperator is only below the text:
		//
		//		Title 1
		//		-------
		//
		//  RegEx:
		//		^ - Match start of line
		//		([^\n]+) - Capture
		//			[^\n]+ - One or more characters not a new line
		//		\n - One new line
		//		(=|-|`|:|\.|'|'|~|\^|_|\*|\+|#) {3,} - Capture
		//			=|-|`|:|\.|'|'|~|^|_|\*|\+|# - A marker
		//			{3,} - Repeated at least 3 times
		//		 * - Any trailing spaces
		//		\n* - Any trailing newlines
		sectionBelow: /^([^\n]+)\n(=|-|`|:|\.|'|'|~|\^|_|\*|\+|#) {3,} *\n*/,

		// Consumes any text where it has been indented by two or more spaces:
		//
		//		Not captured
		//		  Captured
		//		Not captured
		//
		// RegEx:
		//		^ - Match start of line
		//		( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+ - Capture one or more groups
		//			 {2,} - Two or more spaces
		//			[^\n]+ - Followed by 1 or more non-newline characters
		//			(\n {2,}[^\n]+)* - Capture any number
		//				\n - Match newline
		//				 {2,} - Two or more spaces
		//				[^\n]+ - One or more non-newline characters
		//			\n* - Any number of newlines in a row
		blockquote: /^( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,

		// Consumes text which is considered a transition:
		//
		//		----
		//
		// RegEx:
		//		^ - Match start of line
		//		(?:=|-|`|:|\.|'|'|~|\^|_|\*|\+|#) {4,} - Non caputiring group repeated at least 4 times
		//			=|-|`|:|\.|'|'|~|\^|_|\*|\+|# - Any of =-`:.'"~^_*+#
		//		 * - Any number of spaces
		//		\n - Followed by a newline
		//		 * - Any number of spaces
		//		(?:\n+|$) - Non-capturing group
		//			\n+|$ - One or more newlines or end of line
		transition: /^(?:=|-|`|:|\.|'|"|~|\^|_|\*|\+|#) {4,} *\n *(?:\n+|$)/,

		// Consumes text which is considered a directive:
		//
		//		.. directive :: argument
		//
		// RegEx:
		//		^ - Match start of line
		//		\.{2} - Match two consective .
		//		 + - Match one or more spaces
		//		(\S+) - Capture
		//			\S+ - One or more non-white spaces
		//		 * - Match any trailing white spaces
		//		:{2} - Match two consective :
		//		([^\n]*) - Capture
		//			[^\n]* - Anything that isn't a newline
		//		(?:\n+|$) - Non-capturing group
		//			\n+|$ - One or more consecutive newlines or end of line
		//
		directive: /^\.{2} +(\S+) *:{2} *([^\n]*)(?:\n+|$)/,

		// Consumes text which appears to be a list (either ordered or unordered):
		//
		// RegEx:
		//		^ - Match start of line
		//		( *) - Capture
		//		   * - Any number of spaces
		//		(bull) - Capture
		//			bull - substituted with bullet RegEx
		//		  - Followed by 1 space
		//		[^\0]+? - Optionally At least one character that is not EOF
		list: /^( *)(bull) [^\0]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,

		//
		definition: /^([^\n]+)\n+( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,
		definitionblocks: /( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,

		optionlist: /^(?:-|-{2}|\/)[^\n]+(\n|$)+(?: {2,}[^\n]+(?:\n {2,}[^\n]+)*\n*)*/,

		fieldlist: /^:([^:]+): +[^\n]+\n(?:( {2,})[^\n]+\n(?:\2[^\n]+\n)*)*/,

		// Consumes any text that is doctest:
		//
		//		>>> print 'this is a Doctest block'
		//		this is a Doctest block
		//
		doctest: /^>{3,} *[^\n]+\n([^\n]+\n)*/,

		// Consumes any text that isn't a newline:
		//
		//		anything
		//
		// RegEx:
		//		^ - Match start of line
		//		[^\n]+ - One or more charecters that are not a new line
		text: /^[^\n]+/,

		// This is used to be subtituted in other RexEx and represents (most) valid bullets in reStructuredText
		//
		//		*
		//		1.
		//		(a)
		//		B)
		//
		// RegEx:
		//		Non capturing
		//			One of *+-•‣⁃ or
		//			Possibly a (
		//			Followed by one or more of 0-9 A-Z or a-z
		//			Followed by a . or a )
		//
		// Note: This does match some odd things, but they are unlikely to occur, for example '(1bA.' is also valid
		// Note: reStructuredText allows roman numerals, this does not match those
		bullet: /(?:[*+-•‣⁃]|[\(]?[0-9A-Za-z]+[\.\)])/,
		item: /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/
	};

	var listhr = /\n+(?=(?: *[=-`:\.~'"\^_*+#]) {3,} *(?:\n+|$))/,
		listbullet = /^ *([*+-•‣⁃]|[\(]?[0-9A-Za-z]+[\.\)]) +/; // Does not match Roman numerals as list bullets

	block.item = replace(block.item, 'gm')
		(/bull/g, block.bullet)
		();

	block.list = replace(block.list)
		(/bull/g, block.bullet)
		('hr', listhr)
		();

	block.directiveLexers = {
		image: function (text, tokens, args) {
			var parsedFields = parseDirectiveFields(block.token(text, []));
			if (options.markdownImages) {
				return '![' + (parsedFields.attributes.alt || '') + '](' + args + ')\n';
			}
			else {
				var attr = [];
				for (var key in parsedFields.attributes) {
					attr.push(key + '="' + parsedFields.attributes[key] + '"');
				}
				return '<img src="' + args + '" ' + attr.join(' ') + ' >\n';
			}
		},
		figure: function (text, tokens, args) {
			var parsedFields = parseDirectiveFields(block.token(text, []));
			var md = parsedFields.other.length ? (markdown(parsedFields.other) + '\n') : '';
			if (options.mardownImages) {
				return '![' + (parsedFields.attributes.alt || '') + '](' + args + ')\n' + md;
			}
			else {
				var attr = [];
				for (var key in parsedFields.attributes) {
					attr.push(key + '="' + parsedFields.attributes[key] + '"');
				}
				return '<img src="' + args + '" ' + attr.join(' ') + ' >\n' + md;
			}
		}
	};

	block.directives = {
		admonitions: [
			'attention',
			'caution',
			'danger',
			'error',
			'hint',
			'important',
			'note',
			'tip',
			'warning',
			'admonition'
		],
		images: [
			'image',
			'figure'
		],
		body: [
			'topic',
			'sidebar',
			'line-block',
			'parsed-literal',
			'code',
			'math',
			'rubric',
			'epigraph',
			'highlights',
			'pull-quote',
			'compound',
			'container'
		],
		tables: [
			'table',
			'csv-table',
			'list-table'
		],
		parts: [
			'contents',
			'sectnum',
			'section-autonumbering',
			'header',
			'footer'
		],
		references: [
			'taget-nodes',
			'footnotes',
			'citations'
		],
		html: [ 'meta' ],
		substitution: [
			'replace',
			'unicode',
			'date'
		],
		misc: [ 'include' ]
	};

	block.lexer = function (rst) {

		var tokens = [];

		headingLevels = [];

		rst = rst.replace(/\r\n|\r/g, '\n').replace(/\t/g, '    ');

		return block.token(rst, tokens);
	};

	block.token = function (rst, tokens) {
		var m,
			l,
			i,
			d,
			item,
			space,
			loose,
			term,
			next,
			directive,
			args,
			text;

		function getDepth(c, top) {
			var i = headingLevels.indexOf(top ? c + c : c);
			if (~i) {
				return i + 1;
			}
			else {
				headingLevels.push(top ? c + c : c);
				return headingLevels.length;
			}
		}

		while (rst) {

			if (m = block.newline.exec(rst)) {
				rst = rst.substring(m[0].length);
				if (m[0].length > 1) {
					tokens.push({
						type: 'space'
					});
				}
			}

			if (m = block.sectionAboveBelow.exec(rst)) {
				rst = rst.substring(m[0].length);
				tokens.push({
					type: 'section',
					depth: getDepth(m[1], true),
					text: m[2]
				});
				continue;
			}

			if (m = block.sectionBelow.exec(rst)) {
				rst = rst.substring(m[0].length);
				tokens.push({
					type: 'section',
					depth: getDepth(m[2]),
					text: m[1]
				});
				continue;
			}

			if (m = block.blockquote.exec(rst)) {
				rst = rst.substring(m[0].length);
				tokens.push({
					type: 'blockquoteStart'
				});

				space = m[0].match(/^ */)[0].length;

				m = m[0].replace(new RegExp('^ {' + space + '}', 'gm'), '');
				block.token(m, tokens);

				tokens.push({
					type: 'blockquoteEnd'
				});

				continue;
			}

			if (m = block.directive.exec(rst)) {
				rst = rst.substring(m[0].length);

				directive = m[1];
				args = m[2];

				tokens.push({
					type: 'directiveStart',
					directive: directive,
					args: args
				});

				if (m = block.newline.exec(rst)) {
					rst = rst.substring(m[0].length);
				}

				if (m = block.blockquote.exec(rst)) {
					rst = rst.substring(m[0].length);

					space = m[0].match(/^ */)[0].length;

					text = m[0].replace(new RegExp('^ {' + space + '}', 'gm'), '');

					if (directive in options.directiveLexers) {
						text = options.directiveLexers[directive](text, tokens, top, args);
					}

					if (text && typeof text === 'string') {
						tokens.push({
							type: 'directiveBlock',
							text: text
						});
					}
				}

				tokens.push({
					type: 'directiveEnd'
				});

				continue;
			}

			if (m = block.transition.exec(rst)) {
				rst = rst.substring(m[0].length);
				tokens.push({
					type: 'transition'
				});
				continue;
			}

			if (m = block.fieldlist.exec(rst)) {
				rst = rst.substring(m[0].length);

				tokens.push({
					type: 'fieldlistStart',
					field: m[1]
				});

				m = m[0].substring(m[0].match(/:[^:]+: +/)[0].length);

				space = m.match(/\n */);
				if (space && (space[0].length > 1)) {
					space = space[0].length - 1;
					m = m.replace(new RegExp('^ {' + space + '}', 'gm'), '');
				}
				block.token(m, tokens);

				tokens.push({
					type: 'fieldlistEnd'
				});
				continue;
			}

			if (m = block.list.exec(rst)) {
				rst = rst.substring(m[0].length);

				tokens.push({
					type: 'listStart',
					ordered: /^[0-9A-Za-z]+/.test(m[2])
				});

				m = m[0].match(block.item);

				next = false;
				l = m.length;
				i = 0;

				for (; i < l; i++) {
					item = m[i];

					space = item.length;
					item = item.replace(listbullet, '');

					if (~item.indexOf('\n ')) {
						space -= item.length;
						item = item.replace(new RegExp('^ {1,' + space + '}', 'gm'), '');
					}

					loose = next || /\n\n(!\s*$)/.test(item);
					if (1 !== l - 1) {
						next = item[item.length - 1] === '\n';
						if (!loose) {
							loose = next;
						}
					}

					tokens.push({
						type: loose ? 'looseItemStart' : 'listItemStart'
					});

					block.token(item, tokens);

					tokens.push({
						type: 'listItemEnd'
					});
				}

				tokens.push({
					type: 'listEnd'
				});

				continue;
			}

			if (m = block.optionlist.exec(rst)) {
				rst = rst.substring(m[0].length);
				d = m[0].match(/^[^\n]*?(?= {2,}|\n|$)/)[0];
				tokens.push({
					type: 'optionStart',
					options: d.split(/ *, */)
				});

				m = m[0].substring(d.length).replace(/^ */, '').replace(/\n*$/, '');
				space = m.match(/\n */);
				if (space && (space[0].length > 1)) {
					space = space[0].length - 1;
					m = m.replace(new RegExp('^ {' + space + '}', 'gm'), '');
				}
				block.token(m, tokens);

				tokens.push({
					type: 'optionEnd'
				});

				continue;
			}

			if (m = block.definition.exec(rst)) {
				rst = rst.substring(m[0].length);

				d = m[1].split(/ *: */);
				term = d.shift();

				tokens.push({
					type: 'definitionStart',
					term: term,
					classifiers: d
				});

				m = m[0].match(block.definitionblocks);

				tokens.push({
					type: 'definition',
					text: m[0].replace(/^ */, '').replace(/\n*$/, '').split(/ *\n+ {2,}/)
				});

				tokens.push({
					type: 'definitionEnd'
				});
				continue;
			}

			if (m = block.doctest.exec(rst)) {
				rst = rst.substring(m[0].length);

				tokens.push({
					type: 'doctest',
					text: m[0]
				});
				continue;
			}

			if (m = block.text.exec(rst)) {
				rst = rst.substring(m[0].length);

				tokens.push({
					type: 'text',
					text: m[0]
				});
			}
		}

		return tokens;
	};

	var inline = {};

	inline.lexer = function (src) {

	};

	function markdown(tokens) {

		var doc = {
			text: '',
			lists: [],
			blockDepth: 0,
			indent: 0,
			noSpace: false,
			supressNewline: false,
			priorBlock: '',
			directive: '',
			heading: '#####',
			add: function (text, up) {
				if (this.noSpace) {
					this.text += text;
					this.noSpace = false;
				}
				else {
					this.text += this.space(up) + text.replace(/\n(?=.)/, '\n' + this.space(up));
				}
			},
			space: function (up) {
				return this.blockDepth ? repeatString(' > ', this.blockDepth) : '' +
					(this.indent ? repeatString('  ', this.indent) : '') +
					(this.lists.length ? (this.lists[this.lists.length - 1].ordered ? (repeatString('   ', up ? (this.lists.length - 1) : this.lists.length)) :
						(repeatString('  ', up ? (this.lists.length - 1) : this.lists.length))) : '');
			}
		};

		function itemStart(doc) {
			doc.add(doc.lists[doc.lists.length - 1].ordered ? doc.lists[doc.lists.length - 1].count + '. ' : '- ', true);
			doc.noSpace = true;
			doc.lists[doc.lists.length - 1].count++;
		}

		var blockLexers = {
			space: function (doc) {
				doc.add('\n');
			},
			text: function (doc, token) {
				doc.add(token.text + '\n');
			},
			section: function (doc, token) {
				doc.add(doc.heading.substring(0, token.depth) + ' ' + token.text + ' ' +
					doc.heading.substring(0, token.depth) + '\n');
				doc.add('\n');
				doc.priorBlock = 'section';
			},
			doctest: function (doc, token) {
				doc.add('```\n' + token.text + '```\n\n');
			},
			transition: function (doc) {
				doc.add('---\n');
				doc.add('\n');
				doc.priorBlock = 'transition';
			},
			listStart: function (doc, token) {
				doc.lists.push({
					ordered: token.ordered,
					count: 1
				});
			},
			listEnd: function (doc) {
				doc.text += this.supressNewline ? '' : '\n';
				doc.lists.pop();
				doc.priorBlock = 'list';
			},
			looseItemStart: itemStart,
			listItemStart: itemStart,
			listItemEnd: function () {},
			blockquoteStart: function (doc) {
				doc.blockDepth++;
			},
			blockquoteEnd: function (doc) {
				doc.blockDepth--;
				doc.priorBlock = 'blockquote';
			},
			definitionStart: function (doc, token) {
				if (options.definitionListAsHTML) {
					doc.add('<dl>\n');
					doc.add('  <dt>' + token.term + (token.classifiers.length ? ' : ' + token.classifiers.join(' : ') : '') + '</dt>\n');
				}
				else {
					doc.add('***' + token.term + (token.classifiers.length ? ' : ' + token.classifiers.join(' : ') : '') + '***\n');
				}
				doc.indent++;
			},
			definitionEnd: function (doc) {
				doc.priorBlock = 'definition';
				doc.indent --;
				if (options.definitionListAsHTML) {
					doc.add('</dl>\n');
				}
			},
			definition: function (doc, token) {
				if (options.definitionListAsHTML) {
					doc.add('<dd>' + (token.text.length > 1 ? ('\n <p>' + token.text.join('</p>\n    <p>') + '</p>\n  ') : token.text[0]) + '</dd>\n');
				}
				else {
					token.text.forEach(function (d) {
						doc.add(d + '\n\n');
					});
				}
			},
			fieldlistStart: function (doc, token) {
				doc.add(':' + token.field + ':');
				doc.indent++;
				doc.supressNewline = true;
			},
			fieldlistEnd: function (doc) {
				doc.supressNewline = false;
				doc.indent--;
				doc.priorBlock = 'field';
			},
			optionStart: function (doc, token) {
				if (doc.priorBlock !== 'option') {
					doc.add('<table>\n  <tbody>\n');
				}
				doc.add('    <tr>\n      <td>`' + token.options.join('`, `') + '`</td>\n      <td>');
			},
			optionEnd: function (doc) {
				doc.priorBlock = 'option';
			},
			directiveStart: function (doc, token) {
				doc.directive = token.directive;
				if (~block.directives.admonitions.indexOf(doc.directive)) {
					doc.add('div class="' + doc.directive + '">\n');
				}
				else if (doc.directive === 'code') {
					doc.add('```' + token.args + '\n');
				}
			},
			directiveEnd: function (doc) {
				if (~block.directives.admonitions.indexOf(doc.directive)) {
					doc.add('</div>\n');
				}
				else if (doc.directive === 'code') {
					doc.add('```\n');
				}
				doc.directive = '';
			},
			directiveBlock: function (doc, token) {
				doc.add(token.text);
			}
		};

		tokens.forEach(function (token) {
			if (doc.priorBlock === 'option' && token.type !== 'optionStart') {
				doc.add('\n  </tbody>\n</table>\n');
				doc.priorBlock = '';
			}
			if (token.type in blockLexers) {
				blockLexers[token.type](doc, token);
			}
			else {
				throw new Error('Unknown token type: "' + token.type + '"');
			}
		});

		return doc.text;
	}

	function replace(regex, opt) {
		regex = regex.source;
		opt = opt || '';
		return function self(name, val) {
			if (!name) {
				return new RegExp(regex, opt);
			}
			val = val.source || val;
			val = val.replace(/(^|[^\[])\^/g, '$1');
			regex = regex.replace(name, val);
			return self;
		};
	}

	function parseDirectiveFields(tokens) {
		var attributes = {},
			other = [],
			field;
		tokens.forEach(function (token) {
			switch (token.type) {
			case 'fieldlistStart':
				field = token.field;
				break;
			case 'text':
				if (field) {
					attributes[field] = token.text;
				}
				else {
					other.push(token);
				}
				break;
			case 'fieldlistEnd':
				field = '';
				break;
			default:
				other.push(token);
			}
		});
		return {
			attributes: attributes,
			other: other
		};
	}

	var options = {
		definitionListAsHTML: true,
		fieldListAsHtml: true,
		markdownImages: false,
		htmlTables: true,
		directiveLexers: {
			attention: block.token,
			caution: block.token,
			danger: block.token,
			error: block.token,
			hint: block.token,
			important: block.token,
			note: block.token,
			tip: block.token,
			warning: block.token,
			admonition: block.token,
			image: block.directiveLexers.image,
			figure: block.directiveLexers.figure
		}
	};

	function rst2mdown(rst) {
		return markdown(block.lexer(rst));
	}

	rst2mdown.lexer = block.lexer;
	rst2mdown.inline = inline.lexer;
	rst2mdown.markdown = rst2mdown;

	if (typeof exports === 'object') {
		module.exports = rst2mdown;
	}
	else if (typeof define === 'function' && define.amd) {
		define(function () {
			return rst2mdown;
		});
	}
	else {
		this.rst2mdown = rst2mdown;
	}

}).call(function () {
	return this || (typeof window !== 'undefined' ? window : global);
})();