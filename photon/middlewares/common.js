module.exports = function(options) {
    options === undefined && (options = {});

    function byDefault(value, option) {
        if (option === undefined) return value;
        else return options;
    }

    var status = byDefault(true, options.status),
        location = byDefault(true, options.location),
        redirect = byDefault(true, options.redirect),
        header = byDefault(true, options.header),

        onEnd = byDefault(true, options.onEnd);

    return function(req, res, next) {
        status && (res.status = function(statusCode) {
            res.statusCode = statusCode;
            return res;
        });

        location && (res.location = function(url) {
            res.setHeader('Location', url);
            return res;
        });

        redirect && (res.redirect = function(code, url) {
            if (typeof code === 'string') {
                url = code;
                code = 303;
            }

            res.statusCode = code;
            res.setHeader('Location', url);

            return res;
        });

        if (header) {
            res.header = function(name, value) {
                res.setHeader(name, value);
                return res;
            };
        }

        if (onEnd) {
            var stack = [];
            res.onEnd = function(callback) {
                stack.push(callback);
            };
            var old = res.end;
            res.end = function() {
                var i = stack.length - 1;

                function next() {
                    if (i < 0) {
                        old.apply(res, arguments);
                    } else {
                        // epic… what?
                        stack[i--].apply(next, arguments);
                    }
                }

                next.apply(null, arguments);
            };
        }

        next();
    };
};
