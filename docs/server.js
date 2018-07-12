const path = require('path');

const photon = require('../photon');

const serveFileHandler = require('./web-util/serve-static.js').serveFileHandler;

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
app.get('/favicon.png', serveFileHandler(path.join(__dirname, 'assets', 'favicon.png')));

app.get('/lib/semantic/semantic.min.css', serveFileHandler(path.join(__dirname, 'build', 'semantic', 'dist', 'semantic.min.css')));

app.listen(process.env.PORT || 5000);
