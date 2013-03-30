# rst2mdown #

This is a utility for converting from reStructuredText mark-up to markdown mark-up.

## Installation ##

The tool can be installed via `npm`:

```bash
$ npm install rst2mdown
```

Or you can download the [.zip][zip] or [.tar.gz][tar], extract and use.

## Testing ##

You can test the installation be using the test script from the root directory:

```bash
$ node test
```

## Usage ##

You will require [NodeJS][node] installed.  To take in a reStructuredText file and output a markdown one, you would
run the following command from the root of the install:

```bash
$ bin/rst2mdown -i somefile.rst -o somefile.md
```

Also, the binary version also support `stdin` and `stdout`:

```bash
$ bin/rst2mdown < somefile.rst > somefile.md
```

And module supports both CommonJS and AMD loading.  To load as CommonJS module under node:

```js
var rst2mdown = require('rst2mdown');

var mdown = rst2mdown(someReStructuredText);
```

Or as an AMD module:

```js
require(['rst2mdown'], function (rst2mdown) {
	var mdown = rst2mdown(someReStructuredText);
});
```

Converting from reStructuredText to markdown is not straight forward.  Generally speaking, reStructuredText provides
significantly more features than are supportable via markdown.  Please refer to the [Conversion Notes][conv-notes] to
understand how particular aspects of the conversion are handled. 

## License ##

This code is licensed under the [New BSD License][license] and is Copyright (c) 2012 Kitson P. Kelly.

## Acknowledgement ##

This code is possible through documentation and concepts from other projects:

* [reStructuredText][rst] - Markup Syntax for Python docutils project.
* [marked][marked] - A markdown parser and compiler that is built for speed.
* [PHP Markdown Extra][phpmde] - Extension to markdown syntax for PHP Markdown.

[zip]: /kitsonk/rst2mdown/zipball/master
[tar]: /kitsonk/rst2mdown/tarball/master
[rst]: http://docutils.sourceforge.net/rst.html
[marked]: /chjj/marked/
[phpmde]: http://michelf.ca/projects/php-markdown/extra/
[node]: http://nodejs.org/
[license]: /kitsonk/rst2mdown/blob/master/LICENSE
[conv-notes]: /kitsonk/rst2mdown/wiki/Conversion-Notes
