; (function () {

  if (typeof Gun === 'undefined') { return }

  var noop = function () { }, u;

  // async JSON helpers (same contract as localStorage adapter)
  var parse = JSON.parseAsync || function (t, cb, r) {
    try { cb(u, JSON.parse(t, r)) }
    catch (e) { cb(e) }
  }

  var json = JSON.stringifyAsync || function (v, cb, r, s) {
    try { cb(u, JSON.stringify(v, r, s)) }
    catch (e) { cb(e) }
  }

  // -----------------------------
  // IndexedDB wrapper
  // -----------------------------
  function openDB(opt, cb) {
    var req = indexedDB.open(opt.prefix, 1);

    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('radata')) {
        db.createObjectStore('radata');
      }
    };

    req.onsuccess = function () {
      cb(null, req.result);
    };

    req.onerror = function (e) {
      cb(e || 'indexeddb.open.error');
    };
  }

  // -----------------------------
  // GUN adapter
  // -----------------------------
  Gun.on('create', function idb(root) {
    this.to.next(root);

    var opt = root.opt;
    if (false === opt.indexedDB) { return }

    opt.prefix = opt.file || 'radata';

    var db = null;
    var acks = [];
    var to, stop;
    var pending = Object.create(null);

    openDB(opt, function (err, _db) {
      if (err) {
        Gun.log(err);
        return;
      }
      db = _db;
    });

    // -----------------------------
    // GET
    // -----------------------------
    root.on('get', function (msg) {
      this.to.next(msg);

      var lex = msg.get;
      if (!lex) return;

      var soul = lex['#'];
      if (!soul) return;

      if (!db) {
        // wait until db ready
        return setTimeout(function () {
          root.on('get', msg);
        }, 9);
      }

      var tx = db.transaction(['radata'], 'readonly');
      var store = tx.objectStore('radata');
      var req = store.get(soul);

      req.onsuccess = function () {
        var data = req.result || u;
        var tmp;

        if (data && (tmp = lex['.']) && !Object.plain(tmp)) {
          data = Gun.state.ify(
            {},
            tmp,
            Gun.state.is(data, tmp),
            data[tmp],
            soul
          );
        }

        Gun.on.get.ack(msg, data);
      };

      req.onerror = function () {
        Gun.on.get.ack(msg, u);
      };
    });

    // -----------------------------
    // PUT
    // -----------------------------
    root.on('put', function (msg) {
      this.to.next(msg);

      var put = msg.put;
      if (!put) return;

      var soul = put['#'];
      var key = put['.'];
      var id = msg['#'];
      var ok = msg.ok || {};

      if (!db) {
        return setTimeout(function () {
          root.on('put', msg);
        }, 9);
      }

      // queue merges per soul to avoid transaction races
      pending[soul] = pending[soul] || [];
      pending[soul].push({ put: put, msg: msg });

      if (pending[soul].length > 1) { return }

      flushSoul(soul);
    });

    function flushSoul(soul) {
      var batch = pending[soul];
      if (!batch || !batch.length) return;

      var tx = db.transaction(['radata'], 'readwrite');
      var store = tx.objectStore('radata');

      var req = store.get(soul);

      req.onsuccess = function () {
        var node = req.result || {};

        batch.forEach(function (item) {
          var put = item.put;
          node = Gun.state.ify(
            node,
            put['.'],
            put['>'],
            put[':'],
            soul
          );

          var msg = item.msg;
          if (!msg['@'] && (!msg._.via || Math.random() < ((msg.ok || {})['@'] / (msg.ok || {})['/']))) {
            acks.push(msg['#']);
          }
        });

        store.put(node, soul);
      };

      tx.oncomplete = function () {
        delete pending[soul];
        scheduleAck();
      };

      tx.onerror = function (e) {
        stop = e || 'indexeddb.tx.error';
        delete pending[soul];
        scheduleAck();
      };
    }

    // -----------------------------
    // ACK flushing (mirrors localStorage)
    // -----------------------------
    function scheduleAck() {
      if (to) return;
      to = setTimeout(flushAck, 9);
    }

    function flushAck() {
      clearTimeout(to);
      to = null;

      var err = stop;
      var list = acks;
      acks = [];

      setTimeout.each(list, function (id) {
        root.on('in', {
          '@': id,
          err: err,
          ok: err ? 0 : 1
        });
      }, 0, 99);
    }

  });

}());
