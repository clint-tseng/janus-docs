const { readFileSync, writeFileSync } = require('fs');

const md = require('marked');
const $ = require('janus-dollar');

const [ , , infile, outfile ] = process.argv;

const article = { samples: [] };

// util.
const last = (xs) => xs[xs.length - 1];

// convert markdown to html and feed it to jsdom/jquery for postprocessing.
const converted = md(readFileSync(infile, 'utf8'));
const dom = $(`<div class="article">${converted}</div>`);

// move around some of the markup.
dom.find('h2').each((_, h2_) => {
  const h2 = $(h2_);
  const anchor = $('<a/>').attr('id', h2.attr('id'));
  h2.attr('id', null);
  h2.prepend(anchor);
});

// extract code samples as long as they exist in the document.
while ((first = dom.children('pre:first')).length > 0) {
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

    if (subtype === 'noexec') {
      sample.noexec = true;
      sample.main = code.text();
    } else if (subtype === 'manual-require') {
      sample['manual-require'] = true;
      sample.main = code.text();
    } else if (subtype === 'html') {
      sample.noexec = true;
      sample.language = 'xml';
      sample.main = code.text();
    } else {
      sample[subtype || 'main'] = code.text();
    }
  }

  // remove found elements, replace with marker.
  pres.shift().replaceWith(`<div id="sample-${id}"/>`);
  for (const pre of pres) pre.remove();

  // write our data.
  article.samples.push(sample);
}

// now export the article html as-is to the article data.
article.html = dom.get(0).outerHTML;

// write final file.
writeFileSync(outfile, JSON.stringify(article));

