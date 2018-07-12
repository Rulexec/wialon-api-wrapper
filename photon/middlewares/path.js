module.exports = function() {
    return function(req, res, next) {
        var pos = req.url.indexOf('?');

        req.path = pos !== -1 ? req.url.slice(0, pos) : req.url;

        next();
    };
};
