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
		readAndSaveTemplate(name, 'pages/' + name + '.html');
	});

	readAndSaveTemplate('page.html', 'page.html');
	readAndSaveTemplate('page-header.html', 'page-header.html');
	readAndSaveTemplate('reference.html', 'reference.html');
}
function readAndSaveTemplate(name, filePath) {
	let template = fs.readFileSync(path.join(__dirname, 'templates', filePath)).toString('utf-8');

	templates.set(name, template);
}
function readTemplate(filePath) {
	return fs.readFileSync(path.join(__dirname, 'templates', filePath)).toString('utf-8');
}

function readPageTemplate() {
	return fs.readFileSync(path.join(__dirname, 'templates/page.html')).toString('utf-8');
}
function readPageHeaderTemplate() {
	return fs.readFileSync(path.join(__dirname, 'templates/page-header.html')).toString('utf-8');
}

let pageTemplate = templates.get('page.html'),
    pageHeaderTemplate = templates.get('page-header.html'),
    referencePageTemplate = templates.get('reference.html');

let builtPagesCache = new Map();

registerRelativePageHandler({
	prefix: 'reference',
	defaultSlug: 'auth/wialon/sid',
	getPageTemplate: DEBUG ? () => readTemplate('reference.html') : () => referencePageTemplate
});
registerRelativePageHandler({
	defaultSlug: 'what-is-it',
	getPageTemplate: DEBUG ? () => readTemplate('page.html') : () => pageTemplate
});

function registerRelativePageHandler(options) {
	let {prefix, getPageTemplate, defaultSlug} = options || {};

	if (prefix) prefix += '/';
	else if (typeof prefix !== '') prefix = '';

	let urlRegexp = new RegExp('^/' + prefix + '(.*)$');

	app.get(urlRegexp, function(req, res, pageSlug) {
		if (!pageSlug) pageSlug = defaultSlug;

		if (!DEBUG) {
			let cached = builtPagesCache.get(pageSlug);
			if (cached) {
				res.end(cached);
				return;
			}
		}

		let pageTemplateHtml = getPageTemplate();

		let result = renderPage({
			prefix, pageSlug, pageTemplateHtml
		});

		if (result.error) {
			res.status(404).header('Content-Type', 'text/plain').end('404 - ' + (DEBUG ? 'DEBUG - ' : '') + prefix + pageSlug);
			return;
		}

		let html = result.html;

		if (!DEBUG) {
			builtPagesCache.set(prefix + pageSlug, html);
		}

		res.end(html);
	});
}

function renderPage(options) {
	let {
		prefix,
		pageSlug,
		pageTemplateHtml
	} = options;

	// check for page existance
	let pageContentHtml = templates.get(prefix + pageSlug);
	if (DEBUG) {
		try {
			pageContentHtml = fs.readFileSync(
				path.join(__dirname, 'templates/pages', prefix + pageSlug + '.html')
			).toString('utf-8');
		} catch (e) {
			return { error: e, html: null };
		}
	}

	if (!pageContentHtml) {
		return { error: 'noPageContentHtml', html: null };
	}

	let pageHeaderTemplateHtml = pageHeaderTemplate;
	if (DEBUG) pageHeaderTemplateHtml = readPageHeaderTemplate();

	// get title from page template
	let pageHeaderRegexp = /{PAGEHEADER}[^]*{TITLE "(.*)"}[^]*{\/PAGEHEADER}/;

	let html = pageTemplateHtml.replace(pageHeaderRegexp, function(full, title) {
		let titleRegexp = /{TITLE}/g;

		return pageHeaderTemplateHtml.replace(titleRegexp, title);
	});

	// process menu items
	let activeItemRegexp = /\s*{active if page (.+)}([^>]*?){href from if page}(([^>]*?)>([^<]*?){text from if page})?/g;

	html = html.replace(activeItemRegexp, function(full, slug, space, fullOptional, preTagEnd, postTagText) {
		let result = (slug === pageSlug ? ' active' : '') + space + ('/' + prefix + slug);

		if (fullOptional) {
			result += preTagEnd + '>' + postTagText + slug;
		}

		return result;
	});

	// temporary disabled menu items
	let notImplementedMenuItemRegexp = /<a\s*{not implemented yet}\s*(.*?)\s*href=(['"]).*\2\s*(.*?)\s*>(.*?)<\/a>/g;

	html = html.replace(notImplementedMenuItemRegexp, function(full, preHref, _quote, postHref, content) {
		return '<div ' + preHref + postHref + '><s>' + content + '</s></div>';
	});

	html = html.replace('{CONTENT}', pageContentHtml);

	return {
		error: null,
		html
	};
}

app.listen(process.env.PORT || 5000);
