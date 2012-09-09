
var inline = function(src){

};

var lexer = function(rst){
	return {};
};

var markdown = function(tokens){
	return "";
};

var rst2mdown = module.exports = function(rst){
	return markdown(lexer(rst));
};

rst2mdown.lexer = lexer;
rst2mdown.inline = inline;
rst2mdown.markdown = rst2mdown;
