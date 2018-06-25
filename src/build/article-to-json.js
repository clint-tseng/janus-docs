const { readFileSync, writeFileSync } = require('fs');

const md = require('marked');
const jquery = require('jquery');
const { JSDOM } = require('jsdom');

const [ , , infile, outfile ] = process.argv;

const article = { samples: [] };

// util.
const last = (xs) => xs[xs.length - 1];

// convert markdown to html and feed it to jsdom/jquery for postprocessing.
const converted = md(readFileSync(infile, 'utf8'));
const dom = new JSDOM(`<html><body><div class="article">${converted}</div></body></html>`);
const $ = jquery(dom.window);

// extract code samples as long as they exist in the document.
while ((first = $('pre:first')).length > 0) {
  // grab all contiguous <pre>s.
  const pres = [ first ];
  while ((next = last(pres).next()).is('pre'))
    pres.push(next);

  // convert samples to model data; save.
  const id = article.samples.length;
  const sample = { id };
  for (const pre of pres) {
    const code = pre.children('code');
    const [ , subtype ] = /^$|^language-(.*)$/.exec(code.prop('class'));
    sample[subtype || 'main'] = code.text();
  }

  // remove found elements, replace with marker.
  pres.shift().replaceWith(`<div id="sample-${id}"/>`);
  for (const pre of pres) pre.remove();

  // write our data.
  article.samples.push(sample);
}

// now export the article html as-is to the article data.
article.html = dom.window.document.body.innerHTML;

// write final file.
writeFileSync(outfile, JSON.stringify(article));

