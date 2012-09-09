#!/usr/bin/env node

var fs = require("fs"),
	path = require("path"),
	rst2mdown = require("rst2mdown"),
	dir = __dirname + "/tests";

var files;

var load = function(){
	
};

var main = function(){

};

if(!module.parent){
	main();
}else{
	main.main = main;
	main.load = load;
	module.exports = main;
}