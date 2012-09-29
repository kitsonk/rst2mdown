
String.prototype.repeat = function(num){
	// summary:
	//		Duplicates a string *n* times
	return new Array(num + 1).join(this);
};

var headingLevels;

// All the block RegEx are designed to "consume" from the start of the line, where they will be used in
// order to until what remains to be "consumed" is the most non-specific text.
var block = {
	// Consumes any "blank" newlines, this is usually because the preceding text has already been consumed
	newline: /^\n+/,

	// Consumes section titles where the seprator is above or blow:
	//
	//		=======
	//		Title 1
	//		=======
	//
	//	RegEx:
	//		^ - Match start of line
	//		(=|-|`|:|\.|'|"|~|^|_|\*|\+|#){3,} - Capture
	//			=|-|`|:|\.|'|"|~|^|_|\*|\+|# - A marker
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
	sectionAboveBelow: /^(=|-|`|:|\.|'|"|~|^|_|\*|\+|#){3,} *\n *([^\n]+)\n\1+ *\n*/,

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
	//		(=|-|`|:|\.|'|"|~|\^|_|\*|\+|#){3,} - Capture
	//			=|-|`|:|\.|'|"|~|^|_|\*|\+|# - A marker
	//			{3,} - Repeated at least 3 times
	//		 * - Any trailing spaces
	//		\n* - Any trailing newlines
	sectionBelow: /^([^\n]+)\n(=|-|`|:|\.|'|"|~|\^|_|\*|\+|#){3,} *\n*/,

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
	//				[^\n]+ - One or more non-newline charecters
	//			\n* - Any number of newlines in a row
	blockquote: /^( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,

	// Consumes text which is considered a transistion:
	//
	//		----
	//
	// RegEx:
	//		^ - Match start of line
	//		(?:=|-|`|:|\.|'|"|~|\^|_|\*|\+|#){4,} - Non caputiring group repeated at least 4 times
	//			=|-|`|:|\.|'|"|~|\^|_|\*|\+|# - Any of =-`:.'"~^_*+#
	//		 * - Any number of spaces
	//		\n - Followed by a newline
	//		 * - Any number of spaces
	//		(?:\n+|$) - Non-capturing group
	//			\n+|$ - One or more newlines or end of line
	transistion: /^(?:=|-|`|:|\.|'|"|~|\^|_|\*|\+|#){4,} *\n *(?:\n+|$)/,

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
	list: /^( *)(bull) [^\0]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,

	definition: /^([^\n]+)\n+( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,
	definitionblocks: /( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,

	optionlist: /^(?:-|-{2}|\/)[^\n]+(\n|$)+(?: {2,}[^\n]+(?:\n {2,}[^\n]+)*\n*)*/,

	fieldlist: /^:([^:]+): +[^\n]+\n(?:( {2,})[^\n]+\n(?:\2[^\n]+\n)*)*/,

	// Comumes any text that is doctest:
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
	// Note: This does match some odd things, but they are unlikely to occur, for example "(1bA." is also valid
	// Note: reStructuredText allows roman numerals, this does not match those
	bullet: /(?:[*+-•‣⁃]|[\(]?[0-9A-Za-z]+[\.\)])/,
	item: /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/
};

var listhr = /\n+(?=(?: *[=-`:\.~'"\^_*+#]){3,} *(?:\n+|$))/,
	listbullet = /^ *([*+-•‣⁃]|[\(]?[0-9A-Za-z]+[\.\)]) +/; // Does not match roman numberals as list bullets

block.item = replace(block.item, "gm")
	(/bull/g, block.bullet)
	();

block.list = replace(block.list)
	(/bull/g, block.bullet)
	("hr", listhr)
	();

block.directiveLexers = {
	image: function(text, tokens, args){
		var parsedFields = parseDirectiveFields(block.token(text, []));
		if(options.markdownImages){
			return "![" + (parsedFields.attributes.alt || "") + "](" + args + ")\n";
		}else{
			var attr = [];
			for(var key in parsedFields.attributes){
				attr.push(key + '="' + parsedFields.attributes[key] + '"');
			}
			return '<img src="' + args + '" ' + attr.join(" ") + " >\n";
		}
	},
	figure: function(text, tokens, args){
		var parsedFields = parseDirectiveFields(block.token(text, []));
		var md = parsedFields.other.length ? (markdown(parsedFields.other) + "\n") : "";
		if(options.mardownImages){
			return "![" + (parsedFields.attributes.alt || "") + "](" + args + ")\n" + md;
		}else{
			var attr = [];
			for(var key in parsedFields.attributes){
				attr.push(key + '="' + parsedFields.attributes[key] + '"');
			}
			return '<img src="' + args + '" ' + attr.join(" ") + " >\n" + md;
		}
	}
};

block.directives = {
	admonitions: [
		"attention",
		"caution",
		"danger",
		"error",
		"hint",
		"important",
		"note",
		"tip",
		"warning",
		"admonition"],
	images: [
		"image",
		"figure"],
	body: [
		"topic",
		"sidebar",
		"line-block",
		"parsed-literal",
		"code",
		"math",
		"rubric",
		"epigraph",
		"highlights",
		"pull-quote",
		"compound",
		"container"],
	tables: [
		"table",
		"csv-table",
		"list-table"],
	parts: [
		"contents",
		"sectnum",
		"section-autonumbering",
		"header",
		"footer"],
	references: [
		"taget-nodes",
		"footnotes",
		"citations"],
	html: [ "meta" ],
	substitution: [
		"replace",
		"unicode",
		"date"],
	misc: [ "include" ]
};

block.lexer = function(rst){

	var tokens = [];

	headingLevels = [];

	rst = rst.replace(/\r\n|\r/g, "\n").replace(/\t/g, "    ");

	return block.token(rst, tokens);
};

block.token = function(rst, tokens){
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

	function getDepth(c, top){
		var i = headingLevels.indexOf(top ? c + c : c);
		if(~i){
			return i + 1;
		}else{
			headingLevels.push(top ? c + c : c);
			return headingLevels.length;
		}
	}

	while(rst){

		if(m = block.newline.exec(rst)){
			rst = rst.substring(m[0].length);
			if(m[0].length > 1){
				tokens.push({
					type: "space"
				});
			}
		}

		if(m = block.sectionAboveBelow.exec(rst)){
			rst = rst.substring(m[0].length);
			tokens.push({
				type: "section",
				depth: getDepth(m[1], true),
				text: m[2]
			});
			continue;
		}

		if(m = block.sectionBelow.exec(rst)){
			rst = rst.substring(m[0].length);
			tokens.push({
				type: "section",
				depth: getDepth(m[2]),
				text: m[1]
			});
			continue;
		}

		if(m = block.blockquote.exec(rst)){
			rst = rst.substring(m[0].length);
			tokens.push({
				type: "blockquote_start"
			});

			space = m[0].match(/^ */)[0].length;

			m = m[0].replace(new RegExp("^ {" + space + "}", "gm"), "");
			block.token(m, tokens);

			tokens.push({
				type: "blockquote_end"
			});

			continue;
		}

		if(m = block.directive.exec(rst)){
			rst = rst.substring(m[0].length);

			directive = m[1];
			args = m[2];

			tokens.push({
				type: "directive_start",
				directive: directive,
				args: args
			});

			if(m = block.newline.exec(rst)){
				rst = rst.substring(m[0].length);
			}

			if(m = block.blockquote.exec(rst)){
				rst = rst.substring(m[0].length);

				space = m[0].match(/^ */)[0].length;

				text = m[0].replace(new RegExp("^ {" + space + "}", "gm"), "");

				if(directive in options.directiveLexers){
					text = options.directiveLexers[directive](text, tokens, top, args);
				}

				if(text && typeof text === "string"){
					tokens.push({
						type: "directive_block",
						text: text
					});
				}
			}

			tokens.push({
				type: "directive_end"
			});

			continue;
		}

		if(m = block.transistion.exec(rst)){
			rst = rst.substring(m[0].length);
			tokens.push({
				type: "transistion"
			});
			continue;
		}

		if(m = block.fieldlist.exec(rst)){
			rst = rst.substring(m[0].length);

			tokens.push({
				type: "fieldlist_start",
				field: m[1]
			});

			m = m[0].substring(m[0].match(/:[^:]+: +/)[0].length);

			space = m.match(/\n */);
			if(space && (space[0].length > 1)){
				space = space[0].length - 1;
				m = m.replace(new RegExp("^ {" + space + "}", "gm"), "");
			}
			block.token(m, tokens);

			tokens.push({
				type: "fieldlist_end"
			});
			continue;
		}

		if(m = block.list.exec(rst)){
			rst = rst.substring(m[0].length);

			tokens.push({
				type: "list_start",
				ordered: /^[0-9A-Za-z]+/.test(m[2])
			});

			m = m[0].match(block.item);

			next = false;
			l = m.length;
			i = 0;

			for(; i < l; i++){
				item = m[i];

				space = item.length;
				item = item.replace(listbullet, "");

				if(~item.indexOf("\n ")){
					space -= item.length;
					item = item.replace(new RegExp("^ {1," + space + "}", "gm"), "");
				}

				loose = next || /\n\n(!\s*$)/.test(item);
				if(1 !== l - 1){
					next = item[item.length-1] === "\n";
					if(!loose) loose = next;
				}

				tokens.push({
					type: loose ? "loose_item_start" : "list_item_start"
				});

				block.token(item, tokens);

				tokens.push({
					type: "list_item_end"
				});
			}

			tokens.push({
				type: "list_end"
			});

			continue;
		}

		if(m = block.optionlist.exec(rst)){
			rst = rst.substring(m[0].length);
			d = m[0].match(/^[^\n]*?(?= {2,}|\n|$)/)[0];
			console.log(m);
			tokens.push({
				type: "option_start",
				options: d.split(/ *, */)
			});

			m = m[0].substring(d.length).replace(/^ */, "").replace(/\n*$/, "");
			space = m.match(/\n */);
			if(space && (space[0].length > 1)){
				space = space[0].length - 1;
				m = m.replace(new RegExp("^ {" + space + "}", "gm"), "");
			}
			block.token(m, tokens);

			tokens.push({
				type: "option_end"
			});

			continue;
		}

		if(m = block.definition.exec(rst)){
			rst = rst.substring(m[0].length);

			d = m[1].split(/ *: */);
			term = d.shift();

			tokens.push({
				type: "definition_start",
				term: term,
				classifiers: d
			});

			m = m[0].match(block.definitionblocks);

			tokens.push({
				type: "definition",
				text: m[0].replace(/^ */, "").replace(/\n*$/, "").split(/ *\n+ {2,}/)
			});

			tokens.push({
				type: "definition_end"
			});
			continue;
		}

		if(m = block.doctest.exec(rst)){
			rst = rst.substring(m[0].length);

			tokens.push({
				type: "doctest",
				text: m[0]
			});
			continue;
		}

		if(m = block.text.exec(rst)){
			rst = rst.substring(m[0].length);

			tokens.push({
				type: "text",
				text: m[0]
			});
		}
	}

	return tokens;
};

var inline = {};

inline.lexer = function(src){

};

var markdown = function(tokens){
	var doc = "",
		lists = [],
		blockDepth = 0,
		indent = 0,
		listItem,
		noSpace,
		supressNewline,
		priorblock,
		directive,
		heading = "######";

	function space(up){
		return blockDepth ? " > ".repeat(blockDepth) : "" +
			(indent ? "  ".repeat(indent) : "") +
			(lists.length ? (lists[lists.length - 1].ordered ? ("   ".repeat(up ? (lists.length - 1) : lists.length)) :
				("  ".repeat(up ? (lists.length - 1) : lists.length))) : "");
	}

	function docadd(txt, up){
		if(noSpace){
			doc += txt;
			noSpace = false;
		}else{
			doc += space(up) + txt.replace(/\n(?=.)/, "\n" + space(up));
		}
	}

	tokens.forEach(function(token){
		if(priorblock === "option" && token.type !== "option_start"){
			docadd("\n  </tbody>\n</table>\n");
			priorblock = "";
		}
		switch(token.type){
			case "space":
				docadd("\n");
				break;
			case "text":
				docadd(token.text + "\n");
				break;
			case "section":
				docadd(heading.substring(0, token.depth) + " " + token.text + " " +
					heading.substring(0, token.depth) + "\n");
				docadd("\n");
				priorblock = "section";
				break;
			case "doctest":
				docadd("```\n" + token.text + "```\n\n");
				break;
			case "transistion":
				docadd("---\n");
				docadd("\n");
				priorblock = "transistion";
				break;
			case "list_start":
				lists.push({
					ordered: token.ordered,
					count: 1
				});
				break;
			case "list_end":
				doc += !supressNewline ? "\n" : "";
				lists.pop();
				priorblock = "list";
				break;
			case "loose_item_start":
			case "list_item_start":
				// Note, markdown, but standard and GFM do not allow alpha ordered lists, so each ordered list is
				// output as a numeric.
				docadd(lists[lists.length - 1].ordered ? lists[lists.length - 1].count + ". " : "- ", true);
				noSpace = true;
				lists[lists.length - 1].count++;
				break;
			case "list_item_end":
				break;
			case "blockquote_start":
				blockDepth++;
				break;
			case "blockquote_end":
				blockDepth--;
				priorblock = "blockquote";
				break;
			case "definition_start":
				if(options.definitionListAsHTML){
					docadd("<dl>\n");
					docadd("  <dt>" + token.term + (token.classifiers.length ? " : " + token.classifiers.join(" : ") : "") + "</dt>\n");
				}else{
					docadd("***" + token.term + (token.classifiers.length ? " : " + token.classifiers.join(" : ") : "") + "***\n");
				}
				indent++;
				break;
			case "definition_end":
				priorblock = "definition";
				indent--;
				if(options.definitionListAsHTML){
					docadd("</dl>\n");
				}
				break;
			case "definition":
				if(options.definitionListAsHTML){
					docadd("<dd>" +
						(token.text.length > 1 ?
							("\n  <p>" + token.text.join("</p>\n    <p>") + "</p>\n  ") :
							token.text[0]) +
						"</dd>\n");
				}else{
					token.text.forEach(function(d){
						docadd(d + "\n\n");
					});
				}
				break;
			case "fieldlist_start":
				docadd(":" + token.field + ":");
				indent++;
				supressNewline = true;
				break;
			case "fieldlist_end":
				supressNewline = false;
				indent--;
				priorblock = "field";
				break;
			case "option_start":
				if(priorblock !== "option"){
					docadd("<table>\n  <tbody>\n");
				}
				docadd("    <tr>\n      <td>`" + token.options.join("`, `") + "`</td>\n      <td>");
				break;
			case "option_end":
				priorblock = "option";
				break;
			case "directive_start":
				directive = token.directive;
				if(~block.directives.admonitions.indexOf(directive)){
					docadd('<div class="' + directive + '">\n');
				}else if(directive == "code"){
					docadd("```" + token.args + "\n");
				}
				break;
			case "directive_end":
				if(~block.directives.admonitions.indexOf(directive)){
					docadd("</div>\n");
				}else if(directive == "code"){
					docadd("```\n");
				}
				directive = "";
				break;
			case "directive_block":
				docadd(token.text);
				break;
		}
	});

	return doc;
};

function replace(regex, opt){
	regex = regex.source;
	opt = opt || '';
	return function self(name, val){
		if (!name) return new RegExp(regex, opt);
		val = val.source || val;
		val = val.replace(/(^|[^\[])\^/g, '$1');
		regex = regex.replace(name, val);
		return self;
	};
}

function parseDirectiveFields(tokens){
	var attributes = {},
		other = [],
		field;
	tokens.forEach(function(token){
		switch(token.type){
			case "fieldlist_start":
				field = token.field;
				break;
			case "text":
				if(field){
					attributes[field] = token.text;
				}else{
					other.push(token);
				}
				break;
			case "fieldlist_end":
				field = "";
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

var rst2mdown = module.exports = function(rst){
	return markdown(block.lexer(rst));
};

rst2mdown.lexer = block.lexer;
rst2mdown.inline = inline.lexer;
rst2mdown.markdown = rst2mdown;
