// 1. Read in all required data from disk.
const { readFileSync, writeFileSync } = require('fs');
const readFileAsUtf8Sync = (path) => readFileSync(path, 'utf8');
const [ , , indexFile, tocFile, apiFile, articleFile, outFile ] = process.argv;
const [ html, tocData, apiData, articleData ] =
  [ indexFile, tocFile, apiFile, articleFile ].map(readFileAsUtf8Sync);

// 2. Initialize a DOM for rendering.
const domino = require('domino');
const jquery = require('jquery');
const window = domino.createWindow(html);
global.$ = jquery(window);

// 3. Obtain a Docs application.
const { baseApp } = require('../base');
const urlPath = articleFile.replace(/(^dist)|((?:index)?.json$)/g, '');
const app = baseApp(urlPath, JSON.parse(apiData));

// 4a. Render a table of contents in the appropriate place.
const { Tocs } = require('../model/toc');
const toc = Tocs.deserialize(JSON.parse(tocData));
const tocView = app.view(toc);
$('#left nav').append(tocView.artifact());

// 4b. Render the main article in the appropriate place.
const { Article } = require('../model/article');
const article = Article.deserialize(JSON.parse(articleData));
const articleView = app.view(article);
$('#main').append(articleView.artifact());

// 5. Attach model data to the page.
const inlineScript = $('<script/>');
const tocOut = JSON.stringify(JSON.parse(tocData));
const articleOut = JSON.stringify(Object.assign(JSON.parse(articleData), { html: null }));
const data = [ tocOut, apiData, articleOut ].join(',\n')
  .replace(/<\/script>/g, '<\\/script>');
inlineScript.text(`init(${data});`);
$('script').after(inlineScript);

// 6. Do some minor cache-busting.
const dateStr = (new Date()).getTime().toString();
const bust = (attr) => (_, node) => {
  const $node = $(node);
  $node.attr(attr, `${$node.attr(attr)}?${dateStr}`);
};
$('link[rel="stylesheet"][href^="/"]').each(bust('href'));
$('script[src^="/"]').each(bust('src'));

// 7. Write our HTML output.
writeFileSync(outFile, window.document.documentElement.outerHTML, 'utf8');

