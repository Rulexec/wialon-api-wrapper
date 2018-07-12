module.exports = function(options) {
    return function() {
        routing.call(this, options);
    };
};

function routing(options) {
    var app = this;

    var staticRoutes = {},
        dynamicRoutes = [];

    function addStaticRoute(method, path, handler) {
        var routeMethods = staticRoutes[path];
        if (!routeMethods) routeMethods = staticRoutes[path] = {};

        routeMethods[method] = handler;
    }

    var methods = ['GET', 'POST'];
    methods.forEach(function(method) {
        app[method.toLowerCase()] = function(pattern, handler) {
            if (pattern instanceof RegExp) {
                // dynamic route
                dynamicRoutes.push({
                    method: method,
                    pattern: pattern,
                    handler: handler
                });
            } else {
                // static route
                addStaticRoute(method, pattern, handler);
            }

            return app;
        };
    });

    app.routeStatic = function(routes) {
        /* routes format is:
            {'/some/path': getHandler,
             '/another/path': {
                'GET': getHandler,
                'POST': postHandler
             }}
        */
        for (var path in routes) if (routes.hasOwnProperty(path)) {
            var handlers = routes[path];
            if (typeof handlers === 'function') {
                addStaticRoute('GET', path, handlers);
            } else {
                for (var method in handlers) if (handlers.hasOwnProperty(method)) {
                    var handler = handlers[method]
                    addStaticRoute(method, path, handler);
                }
            }
        }
    };

    app.use(function(req, res, next) {
        // check static routes
        var staticRouteMethods = staticRoutes[req.path];
        if (staticRouteMethods) {
            var handler = staticRouteMethods[req.method];
            if (handler) {
                handler(req, res);
                return;
            }
        }

        // check dynamic routes
        dynamicRoutes.some(function(route) {
            var groups;
            if (route.method === req.method && (groups = route.pattern.exec(req.path))) {
                // calling handler(req, res, group1, group2, group3, ...)
                route.handler.apply(null, [req, res].concat(groups.slice(1)));
                return true;
            }
        }) || next(); // if no, call next()
    });
};
