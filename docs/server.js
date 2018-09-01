let fs = require('fs'),
    path = require('path');

let photon = require('../photon');

let _serveStatic = require('./web-util/serve-static.js'),
    serveFile = _serveStatic.serveFile,
    serveFileHandler = _serveStatic.serveFileHandler;

const DEBUG = !!process.env.DEBUG;

const CACHE_FOREVER_MAX_AGE = 31536000; // year
const foreverCacheMaxAge = !DEBUG && CACHE_FOREVER_MAX_AGE;

let app = photon()
	.use(photon.common())
	.use(photon.cache())
	.use(photon.path())
	.use(function(req, res, next) {
		console.log(req.path);
		next();
	})
	.extend(photon.routing());

app.use(function(req, res) {
	res.status(404).end('404');
});

app.get('/favicon.ico', function(req, res) { res.status(404).end('404'); });
app.get('/favicon.png', serveFileHandler({
	cacheETag: !DEBUG && '1',
	cacheMaxAge: 24 * 60 * 60, // 24 hours
	filePath: path.join(__dirname, 'assets/static/favicon.png')
}));

app.get('/lib/less/less.min.js', serveFileHandler({ cacheMaxAge: foreverCacheMaxAge, filePath: path.join(__dirname, 'build/less/less.min.js') }));
app.get('/lib/semantic/semantic.1.min.css', serveFileHandler({
	cacheMaxAge: foreverCacheMaxAge,
	filePath: path.join(__dirname, 'assets/build/semantic/dist/semantic.min.css')
}));

app.get(/\/static\/(.+)/, function(req, res, filePath) {
	if (filePath.indexOf('..') >= 0) { res.status(400).end(); }

	if (filePath === 'logo.svg') {
		serveFile({
			cacheETag: !DEBUG && '1',
			cacheMaxAge: 24 * 60 * 60, // 24 hours
			filePath: path.join(__dirname, 'assets/static/favicon.svg')
		}, req, res);
		return;
	}

	serveFile({
		cacheETag: !DEBUG && '1',
		cacheMaxAge: 10 * 60, // 10 minutes
		filePath: path.join(__dirname, 'static', filePath)
	}, req, res);
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

	// check for page existance
	let pageContentHtml = templates.get(pageSlug);
	if (DEBUG) {
		try {
			pageContentHtml = fs.readFileSync(
				path.join(__dirname, 'templates/pages', pageSlug + '.html')
			).toString('utf-8');
		} catch (e) {
			res.status(404).header('Content-Type', 'text/plain').end('404 - DEBUG - ' + pageSlug);
			return;
		}
	}

	if (!pageContentHtml) {
		res.status(404).header('Content-Type', 'text/plain').end('404 - ' + pageSlug);
		return;
	}

	let pageTemplateHtml = pageTemplate;
	if (DEBUG) pageTemplateHtml = readPageTemplate();

	// process menu items
	let activeItemRegexp = /\s*{active if page (.+)}([^>]*?){href from if page}/g;

	let html = pageTemplateHtml.replace(activeItemRegexp, function(full, slug, space) {
		return (slug === pageSlug ? ' active' : '') + space + ('/' + slug);
	});

	// temporary disabled menu items
	let notImplementedMenuItemRegexp = /<a\s*{not implemented yet}\s*(.*?)\s*href=(['"]).*\2\s*(.*?)\s*>(.*?)<\/a>/g;

	html = html.replace(notImplementedMenuItemRegexp, function(full, preHref, _quote, postHref, content) {
		return '<div ' + preHref + postHref + '><s>' + content + '</s></div>';
	});

	html = html.replace('{CONTENT}', pageContentHtml);

	if (!DEBUG) {
		builtPagesCache.set(pageSlug, html);
	}

	res.end(html);
});

app.listen(process.env.PORT || 5000);
