const fs = require('fs');

exports.serveFile = serveFile;

function serveFile(options, req, res) {
	if (typeof options !== 'string') { res.status(500).end('serveFile options is not a string'); return; }

	const path = options;

	let contentType = 'text/plain';

	const match = /\.([a-z]+)$/.exec(path);
	if (match) {
		switch (match[1]) {
		case 'html': contentType = 'text/html'; break;
		case 'css': contentType = 'text/css'; break;
		case 'svg': contentType = 'image/svg+xml'; break;
		}
	}

	res.setHeader('content-type', contentType);

	fs.createReadStream(path).on('error', function() {
		res.status(500).end('File read error');
	}).pipe(res);
};

exports.serveFileHandler = function(options) {
	return function(req, res) {
		serveFile(options, req, res);
	};
};