function Demo() {}

Demo.prototype.renderInit = function(response, data) {
	response.write("You have finally reached the Demo for Init!\n\n");
	response.write(require('util').inspect(data, true, null));
}

Demo.prototype.renderTest = function(response, data) {
	response.write("You have finally reached the Demo for Test!\n\n");
	response.write("<img src='/includes/dmbtest.gif' />");
	response.write(require('util').inspect(data, true, null));
}

exports.Demo = Demo;
