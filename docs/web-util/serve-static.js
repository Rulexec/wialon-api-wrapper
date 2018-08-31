const fs = require('fs');

exports.serveFile = serveFile;

function serveFile(options, req, res) {
	if (typeof options === 'string') {
		options = { filePath: options };
	}

	let { cacheETag, filePath } = options;

	if (cacheETag) {
		let isCached = res.endIfCached({ etag: cacheETag });
		if (isCached) return;

		res.cache({ etag: cacheETag });
	}

	let contentType = 'text/plain';

	const match = /\.([a-z]+)$/.exec(filePath);
	if (match) {
		switch (match[1]) {
		case 'html': contentType = 'text/html'; break;
		case 'css': contentType = 'text/css'; break;
		case 'svg': contentType = 'image/svg+xml'; break;
		}
	}

	res.setHeader('Content-Type', contentType);

	fs.createReadStream(filePath).on('error', function() {
		res.status(500).end('File read error');
	}).pipe(res);
};

exports.serveFileHandler = function(options) {
	return function(req, res) {
		serveFile(options, req, res);
	};
};