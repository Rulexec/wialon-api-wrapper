var auth = module.exports = function(options) {
    return function(req, res, next) {
        var user = null, getted = false;

        req.user = {};
        req.user.get = function(callback) {
            if (user || getted) {
                callback(null, user);
            } else {
                req.session.read('user', function(error, _user) {
                    if (error) return callback(error);

                    user = _user;

                    getted = true;
                    callback(null, user);
                });
            }
        };

        res.user = {};
        res.user.set = function(newUser, callback) {
            user = newUser;
            res.session.update('user', newUser, callback);
            return res;
        };

        res.user.unset = function(callback) {
            res.session.remove('user', callback);
            return res;
        };
        
        next();
    };
};

auth.required = function(fn, otherwise) {
    return function(req, res) {
        var args = arguments;

        req.user.get(function(error, user) {
            if (error) return otherwise.apply(null,
                [req, res, error].concat(Array.prototype.slice.call(args, 2)));

            if (user) {
                fn.apply(null, [req, res, user].concat(Array.prototype.slice.call(args, 2)));
            } else {
                if (otherwise) {
                    otherwise(req, res, null);
                } else {
                    res.status(403).end('403');
                }
            }
        });
    };
};
auth.fail = function(otherwise) {
    return function(fn) {
        return auth.required(fn, otherwise);
    };
}

auth.provide = function(fn, errorCallback) {
    errorCallback === undefined && (errorCallback = function(req, res, error) {
        res.statusCode = 500;
        res.end(error.toString());
    });

    return function(req, res) {
        var args = arguments;

        req.user.get(function(error, user) {
            if (error) return errorCallback.apply(null,
                [req, res, error].concat(Array.prototype.slice.call(args, 2)));

            fn.apply(null, [req, res, user].concat(Array.prototype.slice.call(args, 2)));
        });
    };
}

auth.provideFail = function(errorCallback) {
    return function(fn) {
        return auth.provide(fn, errorCallback);
    }
}
