var http = require('http'),
    https = require('https');

exports = module.exports = function(options) {
	return new Photon(options);
};

// extensions
['routing'
].forEach(function(extension) {
    exports[extension] = require('./extensions/' + extension);
});

// middlewares
['common', 'mime', 'cookie', 'auth', 'session', 'path',
 'hostRedirect', 'cache'
].forEach(function(middleware) {
    exports[middleware] = require('./middlewares/' + middleware);
});

function Photon(options) {
	var middlewares = [];

	var httpServer, httpsServer;

	var httpServerHandler = requestHandler;

	if (options && options.https) {
		httpsServer = https.createServer(options.https, requestHandler);

		let allowHttp = options.allowHttp;

		httpServerHandler = function(req, res) {
			if (allowHttp && allowHttp(req)) {
				requestHandler(req, res);
				return;
			}

			var host = req.headers.host;
			if (!host) {
				res.statusCode = 400;
				res.end();
				return;
			}

			res.statusCode = 307;
			res.setHeader('Location', 'https://' + host + req.url);
			res.end();
		};
	}

	httpServer = http.createServer(httpServerHandler);

	function requestHandler(req, res) {
		var middlewareIndex = 0;

		next();

		function next() {
			if (middlewareIndex < middlewares.length) {
				let middleware = middlewares[middlewareIndex];

				middlewareIndex++;

				middleware(req, res, next);
			} else {
				res.end('No middleware');
			}
		}
	}

	this.use = function(f) {
		if (typeof f !== 'function') throw new Error('Is not a function ' + f);

		middlewares.push(f);
		return this;
	};
	this.extend = function(extension) {
		extension.call(this);
		return this;
	};

	this.listen = function(httpPort, httpsPort) {
		httpServer.listen(httpPort);

		if (httpsServer && httpsPort) httpsServer.listen(httpsPort);
	};
}