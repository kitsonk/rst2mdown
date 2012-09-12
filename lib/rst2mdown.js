
String.prototype.repeat = function(num){
	return new Array(num + 1).join(this);
};

var headingLevels;

var block = {
	newline: /^\n+/,
	sectionAboveBelow: /^(=|-|`|:|\.|'|"|~|^|_|\*|\+|#)+ *\n *([^\n]+)\n\1+ *\n*/,
	sectionBelow: /^([^\n]+)\n(=|-|`|:|\.|'|"|~|^|_|\*|\+|#)+ *\n*/,
	blockquote: /^( {2,}[^\n]+(\n {2,}[^\n]+)*\n*)+/,
	transistion: /^(?:=|-|`|:|\.|'|"|~|^|_|\*|\+|#){4,} *\n *(?:\n+|$)/,
	directive: /^\.\. +(.+) *:: +(?:\|([^\|])\| +)?([^\n]*)?(?:\n+|$)/,
	list: /^( *)(bull) [^\0]+?(?:hr|\n{2,}(?! )(?!\1bull )\n*|\s*$)/,
	text: /^[^\n]+/,
	bullet: /(?:[*+-•‣⁃]|[\(]?[0-9A-Za-z]+[\.\)])/,
	item: /^( *)(bull) [^\n]*(?:\n(?!\1bull )[^\n]*)*/
};

var listhr = /\n+(?=(?: *[=-`:.~'"\^_*+#]){3,} *(?:\n+|$))/,
	listbullet = /^ *([*+-•‣⁃]|[\(]?[0-9A-Za-z]+[\.\)]) +/; // Does not detext roman numberals as list bullets

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
		item,
		space,
		loose,
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
		listItem,
		noSpace,
		heading = "######";

	function space(up){
		return blockDepth ? " > ".repeat(blockDepth) : "" +
			// This is sort of hacky and doesn't justify when ordered lists are greater than 1 digit
			lists.length ? lists[lists.length - 1].ordered ? ("   ".repeat(up ? (lists.length - 1) : lists.length)) :
				("  ".repeat(up ? (lists.length - 1) : lists.length)) : "";
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
