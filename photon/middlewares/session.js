module.exports = function(options) {
    var cookieName = options.cookie || 'session_id',
        api = options.sessionApi,

        errorCallback = options.error || function(error) { console.log('photon session save error:', error); };

    return function(req, res, next) {
        var sessionId = req.cookies[cookieName],
            data = {}, isReaded = false;

        req.session = {};
        req.session.read = function(key, callback) {
            if (typeof key === 'function') {
                if (isReaded) return callback(null, data);

                isReaded = true;
                callback = key;

                api.read(sessionId, function(error, newData) {
                    if (error) return callback(error);
                    
                    data = newData;
                    callback(null, data);
                });
            } else if (data[key] === undefined && sessionId) {
                api.read(sessionId, key, function(error, value) {
                    if (error) return callback(error);

                    data[key] = value;
                    callback(null, value);
                });
            } else {
                callback(null, data[key]);
            }
        };

        res.session = {};
        res.session.update = function(key, value, callback) {
            if (typeof value === 'function') {
                data = key;
                callback = value;

                api.update(sessionId, data, updateSessionId(callback));
            } else {
                data[key] = value;
                api.update(sessionId, key, value, updateSessionId(callback));
            }

            function updateSessionId(callback) {
                return function(error, newSessionId) {
                    if (error) return callback(error);

                    sessionId = newSessionId;
                    res.cookie(cookieName, sessionId, {httpOnly: true});
                    callback();
                };
            }
        };

        res.session.remove = function(key, callback) {
            if (typeof key === 'function') {
                data = {};
                callback = key;
                api.remove(sessionId, callback);
            } else {
                api.remove(sessionId, key, callback);
            }

            //res.cookie.clear(cookieName);
        };

        next();
    };
};
