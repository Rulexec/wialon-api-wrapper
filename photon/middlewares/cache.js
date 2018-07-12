module.exports = function() {
    return function(req, res, next) {
        req.cached = function(options) {
            var lastModified = options.lastModified,
                etag = options.etag;

            if (req.headers['cache-control'] === 'no-cache') {
                return false;
            }

            var ifModifiedSince = req.headers['if-modified-since'],
                ifNoneMatch = req.headers['if-none-match'];

            if (lastModified && ifModifiedSince &&
                    new Date(ifModifiedSince) - lastModified >= -1000 ||
                etag && ifNoneMatch && etag === ifNoneMatch)
            {
                return true;
            } else {
                return false;
            }
        };

        res.cache = function(options) {
            var mode = options.mode || 'public',
                maxAge = options.maxAge,
                etag = options.etag,
                lastModified = options.lastModified;

            if (!res.getHeader('Date')) res.setHeader('Date', new Date().toUTCString());

            if (etag && !res.getHeader('ETag')) res.setHeader('ETag', etag);
            if (!res.getHeader('Cache-Control')) {
                if (maxAge) {
                    var cacheControl = mode + ', max-age=' + maxAge.toString();
                    res.setHeader('Cache-Control', cacheControl);
                } else {
                    res.setHeader('Cache-Control', mode);
                }
            }
            if (lastModified && !res.getHeader('Last-Modified')) {
                res.setHeader('Last-Modified', lastModified.toUTCString());
            }

            return res;
        };

        res.notModified = function() {
            res.statusCode = 304;
            return res;
        };

        res.endIfCached = function(options) {
            if (req.cached(options)) {
                res.notModified().end();
                return true;
            } else {
                return false;
            }
        };

        next();
    };
};
