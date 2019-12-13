const { readFileSync, writeFileSync } = require('fs');

const md = require('marked');
const domino = require('domino');
const $ = require('jquery')(domino.createWindow());

const [ , , infile, outfile ] = process.argv;

const article = { samples: [] };

// util.
const last = (xs) => xs[xs.length - 1];

const stripLeadingPeriod = (str) => str.startsWith('.') ? str.slice(1) : str;

// moves the header id to an anchor so we can account for floating header height.
// also adds a section link to that anchor.
const reanchor = (header) => {
  const anchor = $('<a/>')
    .addClass('anchor')
    .attr('id', header.attr('id'));
  header.attr('id', null);
  header.prepend(anchor);

  const link = $('<a/>')
    .addClass('self-link')
    .html('&sect;')
    .attr('href', '#' + anchor.attr('id'));
  header.append(link);
};

const addMemberAnnotation = (note, ptr) => {
  const node = $(`<span class="annotation">${note}</span>`);
  let headers = ptr.prevAll('h4:first');
  let candidate = headers;

  while ((candidate = candidate.prev('h4')).length > 0)
    headers = headers.add(candidate);

  headers.append(node);
};

const articleToc = () =>
  $('<div class="article-toc"><h2>Contents</h2><div class="article-headings"/></div>');

const reverse = (str) => str.split('').reverse().join('');


////////////////////////////////////////////////////////////////////////////////
// BEGIN PROCESSING

// convert markdown to html and feed it to jsdom/jquery for postprocessing.
const converted = md(readFileSync(infile, 'utf8'));
const dom = $(`<div class="article">${converted}</div>`);
const levelTypes = { '@': 'class', ':': 'class', '#': 'instance', '.': 'instance', 'λ': 'package' };
const typeTypes = { '@': 'method', '#': 'method', ':': 'property', '.': 'property', 'λ': 'function' };

// separate paths for apirefs, articles.
const doc = { inspect: 'entity' }; // global directives
const isApiRef = infile.includes('docs/api/');
if (isApiRef === true) {
  // API REFERENCE
  // set some things up for api mode.
  dom.addClass('apiref');
  article.exports = [];
  const apiPath = '/api/' + /docs\/api\/([a-z-]+).md$/.exec(infile)[1];

  // run linearly through the document and build an API model.
  let ptr = dom.children(':first');
  let obj, section, member;
  do {
    if (ptr.is('h1')) {
      article.title = 'API | ' + ptr.text();
      obj = { name: ptr.text(), path: apiPath, sections: [], members: [] };
      article.exports.push(obj);
      reanchor(ptr);
    } else if (ptr.is('h2')) {
      const name = ptr.text();
      section = { name, members: [] };
      obj.sections.push(section);
      reanchor(ptr);
    } else if (ptr.is('h3')) {
      const rawname = ptr.text();
      const nameparts = /^(.+) !AS (.+)$/.exec(rawname);
      const name = (nameparts == null) ? rawname : nameparts[1];
      const ref = stripLeadingPeriod((nameparts == null) ? rawname : nameparts[2]);

      const level = levelTypes[name[0]] || 'package';
      const type = typeTypes[name[0]] || 'object';
      member = { name, ref, level, type, invocations: [] };
      obj.members.push(member);
      section.members.push(ref);

      ptr.addClass('level-' + level);
      ptr.addClass('type-' + type);

      // fixup the on-page name and id.
      ptr.text(name);
      ptr.prop('id', /^[a-z@λ:]/i.test(ref) ? ref : ref.slice(1));
      reanchor(ptr);
    } else if (ptr.is('h4')) {
      const invocation = ptr.text()
        .replace(/=>/g, '⇒')
        .replace(/->/g, '→');
      ptr.text(invocation);
      member.invocations.push(invocation);

      // parse the return type and add it to the return types.
      //                 ( (…)       | {…}     | Abc[…]   [T]                | etc ) :term|abc →    | Abc[…] →          term|→term
      const returnType = /^(\)[^(]+\(|\}[^{]+\{|\](?:[^[]|\][a-z]\[)+\[[a-z]+|[^ ]+) (?::|(→ [a-z.]+|→ \][^[]+\[[a-z]+) [:→]|→)/i.exec(reverse(invocation));

      if (returnType != null) {
        const secondary = returnType[2] ? (' ' + returnType[2]) : '';
        const parsed = reverse(returnType[1] + secondary);

        const types = member.return_type ? member.return_type.split('|') : [];
        for (const ins of parsed.split('|'))
          if (!types.includes(ins)) types.push(ins);
        member.return_type = types.join('|');
      }

      ptr.prop('id', '');
    } else if (ptr.is('ul')) {
      const children = ptr.children();
      children.each((_, child) => {
        const text = $(child).text();
        if (text.startsWith('!')) {
          if (text.startsWith('!VARIANT')) {
            // for now do nothing; not sure how to model this.
          } else if (text.startsWith('!IMPURE')) {
            member.impure = true;
            addMemberAnnotation('impure', ptr);
          } else if (text.startsWith('!CURRIES')) {
            member.curries = true;
            addMemberAnnotation('curries', ptr);
          } else if (text.startsWith('!SAMPLES')) {
            if (text.includes('inspect-panel')) {
              doc.inspect = 'panel';
            } else if (text.includes('inspect-entity')) {
              doc.inspect = 'entity';
            }
          }
          $(child).remove();
        }
      });
      if (ptr.children().length === 0) {
        const reap = ptr;
        ptr = ptr.prev();
        reap.remove();
      }
    }
  } while ((ptr = ptr.next()).length > 0);
} else {
  // ARTICLE
  article.headings = [];
  dom.find('h1, h2').each((_, hdom) => {
    const h = $(hdom);
    if (h.closest('blockquote').length > 0) return;

    // record information about the headings, unless we are the homepage.
    if (dom.find('.splash').length === 0)
      article.headings.push({
        title: h.text(),
        major: h.is('h1'),
        href: '#' + h.attr('id')
      });

    // if we have found the first heading, it is the article title.
    if (article.headings.length === 1) article.title = h.text();

    // if we have found the second heading, inject a toc node.
    if (article.headings.length === 2) h.before(articleToc());

    // move around some of the markup.
    reanchor(h);
  });

  // now, inject our headings into the article toc.
  const html = article.headings
    .map(({ title, major, href }) => $('<a/>')
      .attr('href', href)
      .text(title)
      .toggleClass('major', major)
      .get(0).outerHTML)
    .join('');
  dom.find('.article-headings').html(html);
}

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

    if (isApiRef === true)
      sample.inspect = doc.inspect;

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
    } else if (subtype === 'inspect-entity') {
      sample.inspect = 'entity';
      sample.main = code.text();
    } else if (subtype === 'inspect-panel') {
      sample.inspect = 'panel';
      sample.main = code.text();
    } else if (subtype === 'inspect-plain') {
      sample.inspect = null;
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

