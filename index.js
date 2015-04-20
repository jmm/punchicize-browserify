var
  path = require('path'),
  _ = require('lodash'),
  // Within each prop the format is {canonical name} => [{aliases}].
  props = {};

exports = module.exports = Adapter;
exports.props = props;

exports.module = 'browserify';
// Semver matching string for which versions of the module this adapter is
// compatible with. Not necessary for a punchline adapter file that ships with a
// module.
exports.versions = "JMMDEBUG";

props.bool = {
  'debug': ['d'],
  'ig': ['insert-globals', 'fast'],
  'igv': ['insert-global-vars'],
  'dg': ['detect-globals'],
  'im': ['ignore-missing'],
  'no-builtins': [],
  'no-commondir': [],
  'no-bundle-external': [],
  'bare': [],
  'full-paths': [],
  'deps': [],
  'list': [],
};

props.assign = {
  'outfile': ['o'],
  'command': ['c'],
  'standalone': ['s'],
  'extension': [],
  'it': ['ignore-transform'],
};

props.accumulate = {
  'entries': ['e', 'entry'],
  'require': ['r'],
  'ignore': ['i'],
  'exclude': ['u'],
  'external': ['x'],
  'noparse': [],
};

props.subarg = {
  'transform': ['t'],
  // JMMDEBUG apply special handling
  'g': ['global-transform'],
  'plugin': ['p'],
};

function Adapter (opts) {
  if (! (this instanceof Adapter)) return new Adapter(opts);
  opts = opts || {};
  this.module = opts.module;
  this.default_adapter = opts.default_adapter;
}

Adapter.prototype.pre = function pre () {
  return new this.default_adapter({
    props: props,
    root: ['accumulate', 'entries'],
  });
}
// pre

Adapter.prototype.post = function post (opts) {
  opts = opts || {};

  var
    effective_opts = _.extend(
      {},
      _.pick(
        opts,
        Object.keys(opts).filter(function (prop) {
          return (
            ['require'].concat(Object.keys(props.subarg)).indexOf(prop) < 0
          );
        })
      )
    ),
    b;

  effective_opts.entries = (effective_opts.entries || []).map(function (file) {
    if (typeof file === 'string') file = path.resolve(process.cwd(), file);
    return file;
  });

  b = this.module(effective_opts);

  opts.require = (opts.require || []).map(function (file) {
    var expose;

    if (typeof file === 'string') {
      if (file.indexOf(':') > 0) {
        file = file.split(':');
        expose = file[1];
        file = file[0];
      }

      file = path.resolve(process.cwd(), file);

      if (expose !== undefined) file = {file: file, expose: expose};

      return file;
    }
  });

  b.require(opts.require);

  Object.keys(props.subarg).forEach(function (prop) {
    (opts[prop] || []).forEach(function (val) {
      // instanceof here would fail due to the function coming out of vm.
      if (typeof val.f === 'function') {
        // JMMDEBUG how to handle this...global module? local module?
        // Get punchline adapter
        var adapter = require(val.name)(b, val);
      }
      else if (val.f instanceof String) {
        b[prop](require(val.f))(val.opts);
      }
    });
  });

  b.bundle().pipe(
    opts.outfile ?
    require('fs').createWriteStream(opts.outfile) :
    process.stdout
  );
}
// post
