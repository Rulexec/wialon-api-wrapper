module.exports = function(options) {
    options === undefined && (options = {});


    function result(req, res, next) {
        var cookies = {};

        res.cookie = function(name, value, options) {
            options === undefined && (options = {});
            var maxAge = options.maxAge,
                expires = options.expires ||
                    (maxAge ? new Date(Date.now() + maxAge * 1000) : undefined),
                httpOnly = options.httpOnly !== undefined ?
                    options.httpOnly : true,
                path = options.path !== undefined ?
                    options.path : '/';

            cookies[name] = {
                value: value,
                httpOnly: httpOnly,
                expires: expires,
                path: path
            };
        };
        
        res.onEnd(function() {
            if (!res.headersSent) {
                var cooked = [];

                for (var name in cookies) if (cookies.hasOwnProperty(name)) {
                    cooked.push(toStr(name, cookies[name]));
                }

                if (cooked.length > 0) {
                    res.setHeader('Set-Cookie', cooked);
                }
            }

            this.apply(this, arguments);
        });
        
        next();
    };

    function toStr(name, cookie) {
        return name + '=' + cookie.value +
            (cookie.expires ? '; Expires=' + cookie.expires.toUTCString() : '') +
            '; Path=' + cookie.path +
            (cookie.httpOnly ? '; HttpOnly' : '');
    }

    return result;
};
