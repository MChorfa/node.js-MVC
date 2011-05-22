/*
MVC ClassLoader
*/

var ClassLoader = (function() {
	
	var self = this;
	var CONTROLLER_PATH = "./Controllers/";
	var MODEL_PATH = "./Models/";
	var VIEW_PATH = "./Views/";
	var NODE_EXT = ".js";
	var DEFAULT_CONTENT_TYPE = 'text/html';

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
		DEFAULT_CONTENT_TYPE : DEFAULT_CONTENT_TYPE,
		get : function(className, request, response) {
			try {
				var fileName = className + "Controller" + NODE_EXT;
				var constructor = require(CONTROLLER_PATH + fileName);
					constructor = constructor[className+"Controller"];

				var instance = new constructor();
				attachControllerMethods(className, instance);
				instance.setServerVars(request, response);

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
	
	setServerVars : function(request, response) {

		this.Request = request;
		this.Response = response;
	},

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
			this.Response.setHeader("Content-Type", constructor.ContentType || ClassLoader.DEFAULT_CONTENT_TYPE);
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
		parsedPatternData = {},
		staticPaths = [];

	this.add = function(pattern, func) {
		routes[pattern] = func;
		return this;
	};

	this.setDefault = function(pattern, func) {
		defaultRoutePattern = pattern;
		defaultRouteHandler = func;
		return this;
	};
	
	this.addStatic = function(pattern, path) {
		if(typeof(pattern) === 'string') {
			path = path || ("."+pattern);
			if(pattern.substr(-1) === "/") {
				// serve up everything in this directory
				staticPaths.push({
					test : function(url) { return !url.indexOf(pattern); },
					getPath : function(url) { return path + url.replace(pattern,""); }
				});
			} else {
				// serve up individual file
				staticPaths.push({
					test : function(url) { return url === pattern; },
					getPath : function(url) { return path; }
				});
			}
		} else if (pattern instanceof RegExp) {
			if(!(typeof(path) in { 'string':0, 'function':0 })) {
				throw "Path must be a string or function when using RegExp pattern in addStatic";
			}

			staticPaths.push({
				test : function(url) { return pattern.test(url); },
				getPath : function(url) { return url.replace(pattern, path); }
			});
		}

		return this;
	};

	this.get = function() { return routes; };
	this.getStaticPaths = function() { return staticPaths; };
	this.getDefault = function() {
		return {
			pattern : defaultRoutePattern,
			func : defaultRouteHandler
		};
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

var StaticResourceHandler = new function() {
	
	var contentTypes = {
		'.json': 'application/json',
		'.js': 'application/javascript',
		'.gif': 'image/gif',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.png': 'image/png',
		'.svg': 'image/svg+xml',
		'.css': 'text/css',
		'.html': 'text/html',
		'.txt': 'text/plain',
		'.xml': 'text/xml'
	};

	this.serve = function(path, resp) {
		path = path || "";
		var ext = path.substr(-4);
		if(!(ext in contentTypes)) {
			resp.statusCode = 500;
			resp.end();
			return false;
		}

		resp.writeHead(200, { 'Content-Type' : contentTypes[ext] });
		resp.write(require('fs').readFileSync(path));
		return true;
	};

};

var Router = exports.Router = function() {

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
			routes = Routes.get(),
			staticPaths = Routes.getStaticPaths();

		//check static paths first
		var verdict;
		for(var i=0; i<staticPaths.length; i++) {
			if(staticPaths[i].test(url)) {
				verdict = StaticResourceHandler.serve(staticPaths[i].getPath(url), response);
				if(verdict) { return; }
			}
		}

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
		result = Routes.parsePattern(defaultRoute.pattern, url);
		return result && defaultRoute.func.call(self,result);
	};


};

Routes.getRouter = function(req, res) { 
	var r = new Router(); 
		r.init(req, res);
	return r;
}
