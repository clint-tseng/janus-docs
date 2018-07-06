const { readFileSync, writeFileSync } = require('fs');
const readFileAsUtf8Sync = (path) => readFileSync(path, 'utf8');
const [ , , indexFile, tocFile, articleFile, outFile ] = process.argv;
const [ html, tocData, articleData ] = [ indexFile, tocFile, articleFile ].map(readFileAsUtf8Sync);

const { JSDOM } = require('jsdom');
const jquery = require('jquery');
const dom = new JSDOM(html);
const $ = jquery(dom.window);
global.window = { $ }; // TODO: ugh this hack hurts.

const { baseApp } = require('../app');
const app = baseApp();
const { Article } = require('../model/article');
const article = Article.deserialize(JSON.parse(articleData));
const articleView = app.vendView(article);
$('#main').append(articleView.artifact());

const inlineScript = $('<script/>');
inlineScript.text(`init(${[ tocData, articleData ].join(',')})`);
$('script').after(inlineScript);

writeFileSync(outFile, dom.serialize(), 'utf8');

