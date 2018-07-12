module.exports = function(type, charset) {
    var defaultType = type || 'text/html',
        defaultCharset = charset || 'utf-8';

    return function(req, res, next) {
        res.mime = function(type, charset) {
            !type && (type = defaultType);
            !charset && (charset = defaultCharset);

            res.setHeader('Content-Type', type + '; charset=' + charset);

            return res;
        };

        res.onEnd(function() {
            if (!res.headersSent && !res.getHeader('Content-Type')) {
                res.mime(defaultType, defaultCharset);
            }

            this.apply(this, arguments);
        });

        next();
    };
};
