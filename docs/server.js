const path = require('path');

const photon = require('../photon');

const _serveStatic = require('./web-util/serve-static.js'),
      serveFile = _serveStatic.serveFile,
      serveFileHandler = _serveStatic.serveFileHandler;

const app = photon()
	.use(photon.common())
	.use(photon.path())
	.use(function(req, res, next) {
		console.log(req.path);
		next();
	})
	.extend(photon.routing());

app.use(function(req, res) {
	res.status(404).end('404');
});

app.get('/', serveFileHandler(path.join(__dirname, 'static', 'index.html')));
app.get('/favicon.png', serveFileHandler(path.join(__dirname, 'assets', 'static', 'favicon.png')));

app.get('/lib/less/less.min.js', serveFileHandler(path.join(__dirname, 'build', 'less', 'less.min.js')));
app.get('/lib/semantic/semantic.min.css', serveFileHandler(path.join(__dirname, 'assets', 'build', 'semantic', 'dist', 'semantic.min.css')));

app.get(/\/static\/(.+)/, function(req, res, filePath) {
	if (filePath.indexOf('..') >= 0) { res.status(400).end(); }

	if (filePath === 'logo.svg') {
		serveFile(path.join(__dirname, 'assets', 'static', 'favicon.svg'), req, res);
		return;
	}

	serveFile(path.join(__dirname, 'static', filePath), req, res);
});

app.listen(process.env.PORT || 5000);
