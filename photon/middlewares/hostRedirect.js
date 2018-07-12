module.exports = function(host, protocol) {
    protocol = protocol || 'http';

    var url = protocol + '://' + host;

    return function(req, res, next) {
        if (req.headers.host !== host) {

            res.statusCode = 302;
            res.setHeader('Location', url + req.url);
            res.end();
        } else {
            next();
        }
    };
};
