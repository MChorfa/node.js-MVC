/*
MVC ClassLoader
*/

var ClassLoader = (function() {
	
	var self = this;
	var CONTROLLER_PATH = "./Controllers/";
	var MODEL_PATH = "./Models/";
	var VIEW_PATH = "./Views/";
	var NODE_EXT = ".js";

	var attachControllerMethods = function(className, instance) {
		instance._className = className;
		for(var name in BaseController) {
			instance[name] = BaseController[name];
		}
	};

	return {
		CONTROLLER_PATH : CONTROLLER_PATH,
		MODEL_PATH : MODEL_PATH,
		VIEW_PATH : VIEW_PATH,
		NODE_EXT : NODE_EXT,
		get : function(className, request, response) {
			try {
				var fileName = className + "Controller" + NODE_EXT;
				var constructor = require(CONTROLLER_PATH + fileName);
					constructor = constructor[className+"Controller"];

				var instance = new constructor(request, response);
				attachControllerMethods(className, instance);

				return instance;

			} catch(e) { 
				console.log("Failed to open controller " + className); 
			}
			
			return null;
		}
	};
})();

exports.ClassLoader = ClassLoader;


/*
MVC Base Controller
*/
var BaseController = {
	getModelConstructor : function(modelName) {
		var modelName = modelName || this._className;
		var filePath = ClassLoader.MODEL_PATH + modelName + ClassLoader.NODE_EXT;
		try {
			var constructor = require(filePath)[modelName];
			return constructor;
		} catch(e) { console.log("Failed to load model."); }
		return null;
	},
	getModelInstance : function(modelName) {
		var constructor = this.getModelConstructor(modelName);
		return constructor ? new constructor() : null;
	},

	getViewConstructor : function(viewName) {
		var viewName = viewName || this._className;
		var filePath = ClassLoader.VIEW_PATH + viewName + ClassLoader.NODE_EXT;
		try {
			var constructor = require(filePath)[viewName];
			return constructor;
		} catch(e) { console.log("Failed to load view"); }
		return null;
	},
	getViewInstance : function(viewName) {
		var constructor = this.getViewConstructor(viewName);
		return constructor ? new constructor() : null;
	}
}

BaseController.getModel = BaseController.getModelInstance;
BaseController.getView = BaseController.getViewInstance;

/*
MVC Routes
*/

var Routes = exports.Routes = new (function() {

	var routes = {},
		defaultRoutePattern = "/",
		defaultRouteHandler = function() {},
		parsedPatternData = {};

	this.add = function(pattern, func) {
		routes[pattern] = func;
	};

	this.setDefault = function(pattern, func) {
		defaultRoutePattern = pattern;
		defaultRouteHandler = func;
	};

	this.get = function() { return routes; };
	this.getDefault = function() {
		return {
			pattern : defaultRoutePattern,
			func : defaultRouteHandler
		};
	};

	this.setDefault = function(pattern, func) {
		defaultRoutePattern = pattern;
		defaultRouteHandler = func;
	};

    this.parseQueryString = function(qs) {
        var nv = {};
        var parts = (qs || "").split('&');
        var eqPos;
        for(var i=0; i<parts.length; i++) {
            eqPos = parts[i].indexOf('=');
            if(!~eqPos) { continue; }
            nv[parts[i].substr(0,eqPos)] = parts[i].substr(eqPos+1);
        }
        return nv;
    };

    this.parsePattern = function(pattern, url) {
		
		var patternData;
		if(!(patternData = parsedPatternData[pattern])) {
			
        	var params = [];
        	var result = pattern.replace(/\{(.*?)\}/g, function(match, sub1, pos, whole) {
        	    params.push(sub1);
        	    return "([^\/]+?)";
        	});
        	
			result = "^"+result+"(\\/?\$|\\/?\\?.*$)";
       		parsedPatternData[pattern] = patternData = {
				regex : (new RegExp(result)),
				params : params
			};
		}
		


        var counter = 0, 
			urlParts = null,
			regex = patternData.regex,
			params = patternData.params;

        url.replace(regex, function(match) {
            urlParts = {};
            var i=0;
            for(; i<params.length; i++) {
            urlParts[params[i]] = arguments[i+1];
            }

            urlParts._qs = Routes.parseQueryString((arguments[i+1] || "").replace(/^\/?\??/,""));
        });

        return urlParts;
    };

});

/*
MVC Router
*/

exports.Router = function() {

	var self = this,
		request = null,
		response = null;

	this.exec = function(controller, method, data) {
		var instance = ClassLoader.get(controller, request, response);
		if(!instance) { return false; }

		if(instance[method]) {
			instance[method](data);
		} else if(instance.onActionUnavailable) {
			instance.onActionUnavailable(method, data);
		} else {
			throw new Error("Action Not Found!");
		}

		return true;
	};

	this.init = function(req, res) {
		request = req;
		response = res;
	};

	this.dispatch = function(url) {
		var url = url || req.url,
			result, 
			verdict,
			routes = Routes.get();

		for(var pattern in routes) {
			// test the pattern
			result = Routes.parsePattern(pattern, url);
			
			// if the pattern was successfully matched...
			if(result) {
				//call the handler for that route, which will inevitably call 'exec'
				// if 'exec' was able to open the controller, the verdict will be 'true'
				// in which case we need to stop processing more controllers.
				// if the verdict is false, we should continue to find a route that works.
				verdict = routes[pattern].call(self, result);
				if(verdict) { return; }
			}
		}

		var defaultRoute = Routes.getDefault();
		result = Routes.parsePattern(defaultRoute.patten, url);
		return result && defaultRoute.func.call(self,result);
	};


};
