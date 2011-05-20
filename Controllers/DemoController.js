function DemoController() {}

DemoController.prototype.onActionUnavailable = function(methodName, data) {
	this.getView("Error_404").render(this.Response);
}

DemoController.prototype.Init = function(data) {
	var model = this.getModel();
	this.getView().renderInit(this.Response, model.load(data));
}

DemoController.prototype.Test = function(data) {
	var model = this.getModel();
	this.getView().renderTest(this.Response, model.load(data));
}

exports.DemoController = DemoController;
