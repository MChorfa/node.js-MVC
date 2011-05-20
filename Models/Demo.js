var Demo = function() {}

Demo.prototype.load = function(data) { 
	var base = {
		"One" : 1,
		"Two" : 2,
		"Three" : 3,
		"Pi" : Math.PI
	};


	for(var name in data) {
		base[name] = data[name];
	}

	return base;
}

exports.Demo = Demo;
