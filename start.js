var mvc = require('./mvc.js');
var Router = mvc.Router;
var Routes = mvc.Routes;

var http = require('http');

Routes.add("/MySite/{controller}/{action}", function(data) { return this.exec(data.controller, data.action, data._qs);});
Routes.add("/{controller}/{action}", function(data) { return this.exec(data.controller, data.action, data._qs); });
Routes.setDefault("/", function(data) { return this.exec("Default","Init", data._qs); });

http.createServer(function (req, res) {
	
	var router = new Router();
		router.init(req, res);
		router.dispatch(req.url);
	
	res.end();

}).listen(1337, "127.0.0.1");
