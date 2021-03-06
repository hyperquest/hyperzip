var through = require('through');
var duplexer = require('duplexer');
var zlib = require('zlib');
var hyperquest = require('hyperquest');

module.exports = zip;
module.exports.request = zip(hyperquest);

function zip(subquest) {
  if (subquest === undefined) subquest = hyperquest;
  if (typeof subquest.request === 'function') subquest = subquest.request;
  if (subquest.isCap) throw new Error('The subquest argument "' + subquest + '" was invalid.  You must use a valid hyperquest module that is not a cap.');
  function request(uri, opts, cb) {
    if (typeof uri === 'object') {
        cb = opts;
        opts = uri;
        uri = undefined;
    }
    if (typeof opts === 'function') {
      cb = opts;
      opts = undefined;
    }
    if (!opts) opts = {};
    if (uri !== undefined) opts.uri = uri;

    opts.headers = opts.headers || {};
    opts.headers['Accept-Encoding'] = opts.headers['Accept-Encoding'] ? opts.headers['Accept-Encoding'] + ',gzip,deflate' : 'gzip,deflate';

    var method = (opts.method || 'GET').toUpperCase();
    var duplex = (method != 'GET' && method != 'DELETE');

    var rs = through();
    var ws = hyperquest(opts, function (err, res) {
      if (err) dup.emit('error', err);
      switch (res.headers['content-encoding']) {
        case 'gzip':
          res.headers['content-encoding'] = null;
          this.pipe(zlib.createGunzip()).pipe(rs);
          break;
        case 'deflate':
          res.headers['content-encoding'] = null;
          this.pipe(zlib.createInflate()).pipe(rs);
          break;
        default:
          this.pipe(rs);
          break;
      }
      dup.emit('response', res);
    })
    var dup = duplex ? duplexer(ws, rs) : rs;

    if (cb) {
        dup.on('error', cb);
        dup.on('response', function (res) {
          cb.call(dup, null, res);
        });
    }
    return dup;
  }
  request.request = request;
  return request;
}