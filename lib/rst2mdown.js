
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
	//		Start of Line
	//		Followed by at least two spaces
	//		Followed by at least 1 charecture not a new line
	//		Followed by as many lines that are indented by at least two spaces
	//		Consuming any trailing newlines
	blockquote: /^( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,

	// Consumes text which is considered a transistion:
	//
	//		----
	//
	// RegEx:
	//		Start of line
	//		Followed by at least 4 of =-`:.'"~^_*+#
	//		Followed by any trailing spaces and then a newline
	//		Followed by any leading spaces and then another newline or the end of the line
	transistion: /^(?:=|-|`|:|\.|'|"|~|\^|_|\*|\+|#){4,} *\n *(?:\n+|$)/,
	directive: /^\.\. +(.+) *:: +(?:\|([^\|])\| +)?([^\n]*)?(?:\n+|$)/,

	// Consumes text which appears to be a list (either ordered or unordered):
	//
	list: /^( *)(bull) [^\0]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,

	definition: /^([^\n]+)\n+( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,
	definitionblocks: /( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,

	// Consumes any text that isn't a newline:
	//
	//		anything
	//
	// RegEx:
	//		Start of line
	//		One or more charecters that are not a new line
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

	return block.token(rst, tokens, true);
};

block.token = function(rst, tokens, top){
	var m,
		l,
		i,
		d,
		item,
		space,
		loose,
		term,
		next;

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
			block.token(m, tokens, top);

			tokens.push({
				type: "blockquote_end"
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

		if(m = block.directive.exec(rst)){
			rst = rst.substring(m[0].length);
			tokens.push({
				type: "directive_start",
				directive: m[1],
				element: m[2]
			});

			tokens.push({
				type: "directive_stop"
			});
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
			doc += space(up) + txt;
		}
	}

	tokens.forEach(function(token){
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
				break;
			case "transistion":
				docadd("---\n");
				docadd("\n");
				break;
			case "list_start":
				lists.push({
					ordered: token.ordered,
					count: 1
				});
				break;
			case "list_end":
				doc += "\n";
				lists.pop();
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
				//doc += "\n";
				break;
			case "blockquote_start":
				blockDepth++;
				break;
			case "blockquote_end":
				blockDepth--;
				break;
			case "definition_start":
				docadd(token.term + (token.classifiers.length ? " : " + token.classifiers.join(" : ") : "") + "\n");
				indent++;
				break;
			case "definition_end":
				indent--;
				break;
			case "definition":
				token.text.forEach(function(d){
					docadd(d + "\n\n");
				});
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

var rst2mdown = module.exports = function(rst){
	return markdown(block.lexer(rst));
};

rst2mdown.lexer = block.lexer;
rst2mdown.inline = inline.lexer;
rst2mdown.markdown = rst2mdown;
