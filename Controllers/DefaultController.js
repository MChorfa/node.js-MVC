DefaultController = function() {}

DefaultController.prototype.Init = function(data) {
	this.Response.write("This is the default controller's 'init' method");
}

exports.DefaultController = DefaultController;
