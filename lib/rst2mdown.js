
var headingLevels;

var block = {
	newline: /^\n+/,
	sectionAboveBelow: /^(=|-|`|:|.|'|"|~|^|_|\*|\+|#)+ *\n *([^\n]+)\n\1+ *\n*/,
	sectionBelow: /^([^\n]+)\n(=|-|`|:|.|'|"|~|^|_|\*|\+|#)+ *\n*/,
	transistion: /^(?:=|-|`|:|.|'|"|~|^|_|\*|\+|#){4,} *\n *(?:\n+|$)/,
	directive: /^\.\. +(.+) *:: +(?:\|([^\|])\| +)?([^\n]*)?(?:\n+|$)/
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

	return block.token(rst, tokens, true);
};

block.token = function(rst, tokens, top){
	var m;

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
	}

	return tokens;
};

var inline = {};

inline.lexer = function(src){

};

var markdown = function(tokens){
	var doc = "",
		heading = "######";

	tokens.forEach(function(token){
		switch(token.type){
			case "space":
				doc += "\n";
				break;
			case "section":
				doc += heading.substring(0, token.depth) + " " + token.text + " " +
					heading.substring(0, token.depth) + "\n\n";
				break;
			case "transistion":
				doc += "---\n\n";
				break;
		}
	});

	return doc;
};

var rst2mdown = module.exports = function(rst){
	return markdown(block.lexer(rst));
};

rst2mdown.lexer = block.lexer;
rst2mdown.inline = inline.lexer;
rst2mdown.markdown = rst2mdown;
