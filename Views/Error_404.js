function Error_404() {}

Error_404.prototype.render = function(response) {
	response.statusCode = 404;
	response.write("You have reached this page in error, mainly because you are trying to access an action that doesn't exist.");
}

exports.Error_404 = Error_404;
