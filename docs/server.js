let fs = require('fs'),
    path = require('path');

let photon = require('../photon');

let _serveStatic = require('./web-util/serve-static.js'),
    serveFile = _serveStatic.serveFile,
    serveFileHandler = _serveStatic.serveFileHandler;

const DEBUG = !!process.env.DEBUG;

let app = photon()
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

app.get('/favicon.png', serveFileHandler(path.join(__dirname, 'assets/static/favicon.png')));

app.get('/lib/less/less.min.js', serveFileHandler(path.join(__dirname, 'build/less/less.min.js')));
app.get('/lib/semantic/semantic.min.css', serveFileHandler(path.join(__dirname, 'assets/build/semantic/dist/semantic.min.css')));

app.get(/\/static\/(.+)/, function(req, res, filePath) {
	if (filePath.indexOf('..') >= 0) { res.status(400).end(); }

	if (filePath === 'logo.svg') {
		serveFile(path.join(__dirname, 'assets/static/favicon.svg'), req, res);
		return;
	}

	serveFile(path.join(__dirname, 'static', filePath), req, res);
});

let templates = new Map();
if (!DEBUG) {
	['what-is-it', 'getting-started', 'examples',
	 'wialon-api/objects', 'wialon-api/requests', 'wialon-api/events',
	 'wrapper-api/objects', 'wrapper-api/requests', 'wrapper-api/events'
	].forEach(function(name) {
		readTemplate(name, 'pages/' + name + '.html');
	});

	readTemplate('page.html', 'page.html');
}
function readTemplate(name, filePath) {
	let template = fs.readFileSync(path.join(__dirname, 'templates', filePath)).toString('utf-8');

	templates.set(name, template);
}

function readPageTemplate() {
	return fs.readFileSync(path.join(__dirname, 'templates/page.html')).toString('utf-8');
}

let pageTemplate = templates.get('page.html');

let builtPagesCache = new Map();

app.get(/^\/(.*)$/, function(req, res, pageSlug) {
	if (!pageSlug) pageSlug = 'what-is-it';

	if (!DEBUG) {
		let cached = builtPagesCache.get(pageSlug);
		if (cached) {
			res.end(cached);
			return;
		}
	}

	let pageTemplateHtml = pageTemplate;
	if (DEBUG) pageTemplateHtml = readPageTemplate();

	let activeItemRegexp = /\s*{active if page (.+)}([^>]*?){href from if page}/g;

	let html = pageTemplateHtml.replace(activeItemRegexp, function(full, slug, space) {
		return (slug === pageSlug ? ' active' : '') + space + ('/' + slug);
	});

	let pageContentHtml = templates.get(pageSlug);
	if (DEBUG) pageContentHtml = fs.readFileSync(
		path.join(__dirname, 'templates/pages', pageSlug + '.html')
	);

	html = html.replace('{CONTENT}', pageContentHtml);

	if (!DEBUG) {
		builtPagesCache.set(pageSlug, html);
	}

	res.end(html);
});

app.listen(process.env.PORT || 5000);
