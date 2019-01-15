const { readFileSync, writeFileSync } = require('fs');

const md = require('marked');
const $ = require('janus-dollar');

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

      // TODO: what if different invocations have different types? doesn't exist yet though.
      if (member.return_type == null) {
        const returnType = /(?::|→) ([^:→]+)$/.exec(invocation);
        if (returnType != null) member.return_type = returnType[1];
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
  // move around some of the markup.
  dom.find('h1, h2').each((_, h) => { reanchor($(h)); });
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

