.PHONY: all clean
default: all

CODE = $(shell find src -type f -name '*.js' | sort)

MARKDOWN = $(shell find docs -type f -name '*.md' | sort)
JSON = $(MARKDOWN:docs/%.md=dist/%.json)
HTML = $(MARKDOWN:docs/%.md=dist/%.html)

node_modules: package.json
	npm install

dist:
	@mkdir -p dist/


dist/%.json: docs/%.md dist node_modules
	@mkdir -p $(@D)
	node src/build/article-to-json.js $< $@
dist/%.html: dist/%.json
	node src/build/json-to-html.js src/app.html docs/toc.json $< $@


dist/client.js: src/client.js dist node_modules $(CODE)
	node node_modules/browserify/bin/cmd.js --exclude domino -e $< -o $@ --im
dist/styles.css: src/styles.sass dist node_modules
	node node_modules/node-sass/bin/node-sass --output-style compressed $< > $@


all: $(JSON) $(HTML) dist/client.js dist/styles.css

clean:
	rm -rf dist/*

