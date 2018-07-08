// 1. Read in all required data from disk.
const { readFileSync, writeFileSync } = require('fs');
const readFileAsUtf8Sync = (path) => readFileSync(path, 'utf8');
const [ , , indexFile, tocFile, articleFile, outFile ] = process.argv;
const [ html, tocData, articleData ] = [ indexFile, tocFile, articleFile ].map(readFileAsUtf8Sync);

// 2. Initialize a DOM for rendering.
const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const dom = new JSDOM(html);
const $ = jquery(dom.window);
global.window = { $ }; // TODO: ugh this hack hurts.

// 3. Obtain a Docs application.
const { baseApp } = require('../app');
const urlPath = articleFile.replace(/(^dist)|((?:index)?.json$)/g, '');
const app = baseApp(urlPath);

// 4a. Render a table of contents in the appropriate place.
const { Tocs } = require('../model/toc');
const toc = Tocs.deserialize(JSON.parse(tocData));
const tocView = app.vendView(toc);
$('#left nav').append(tocView.artifact());

// 4b. Render the main article in the appropriate place.
const { Article } = require('../model/article');
const article = Article.deserialize(JSON.parse(articleData));
const articleView = app.vendView(article);
$('#main').append(articleView.artifact());

// 5. Attach model data to the page.
const inlineScript = $('<script/>');
inlineScript.text(`init(${[ tocData, articleData ].join(',')})`);
$('script').after(inlineScript);

// 6. Write our HTML output.
writeFileSync(outFile, dom.serialize(), 'utf8');

