# rst2mdown #

This is a utility for converting from reStructuredText markup to markdown markup.

## Installation ##

The tool can be installed via `npm`:

```bash
$ npm install rst2mdown
```

Or you can download the [.zip][zip] or [.tar.gz][tar], extract and use.

## Usage ##

You will require [NodeJS][node] installed.  To take in a reStructuredText file and output a markdown one, you would
run the following command from the root of the install:

```bash
$ bin/rst2mdown -i somefile.rst -o somefile.mdown
```

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
