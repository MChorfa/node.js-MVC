DefaultController = function(request, response) {
	this.Request = request;
	this.Response = response;
}

DefaultController.prototype.Init = function(data) {
	this.Response.write("This is the default controller's 'init' method");
}

exports.DefaultController = DefaultController;
