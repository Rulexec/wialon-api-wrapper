const fs = require('fs'),
      path = require('path');

if (!fs.existsSync(path.join(__dirname, 'docs', 'build'))) {
	fs.mkdirSync(path.join(__dirname, 'docs', 'build'));
}

if (!fs.existsSync(path.join(__dirname, 'docs', 'build', 'less'))) {
	fs.mkdirSync(path.join(__dirname, 'docs', 'build', 'less'));
}

if (!fs.existsSync(path.join(__dirname, 'docs', 'build', 'less', 'less.min.js'))) {
	fs.copyFileSync(
		path.join(__dirname, 'node_modules', 'less', 'dist', 'less.min.js'),
		path.join(__dirname, 'docs', 'build', 'less', 'less.min.js')
	);
}
