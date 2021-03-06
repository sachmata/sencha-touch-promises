// Generated by CoffeeScript 1.6.2
/*
Implementation of Promises/A+ (http://promises-aplus.github.com/promises-spec) for Sencha Touch 2
that passes the test suite (http://github.com/promises-aplus/promises-tests).

Ported from RSVP.js (http://github.com/tildeio/rsvp.js), 
embeded/simplified EventTarget plus some fixes to pass the test suite.

See RSVP.js documentation for usage examples.
*/


(function() {
  var _addListener, _clearAllListeners, _fire, _fulfill, _handleThenable, _invokeCallback, _reject, _resolve;

  _resolve = function(promise, value) {
    if (promise === value) {
      _fulfill(promise, value);
    } else if (!_handleThenable(promise, value)) {
      _fulfill(promise, value);
    }
    return true;
  };

  _handleThenable = function(promise, value) {
    var e, thn;

    if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
      try {
        thn = value.then;
      } catch (_error) {
        e = _error;
        _reject(promise, e);
        return true;
      }
      if (typeof thn === 'function') {
        try {
          thn.call(value, (function(val) {
            if (value !== val) {
              return _resolve(promise, val);
            } else {
              return _fulfill(promise, val);
            }
          }), (function(val) {
            return _reject(promise, val);
          }));
        } catch (_error) {
          e = _error;
          _reject(promise, e);
        }
        return true;
      }
    }
    return false;
  };

  _fulfill = function(promise, value) {
    return setTimeout(function() {
      promise.isFulfilled = true;
      promise.fulfillmentValue = value;
      _fire('promise:resolved', promise, {
        detail: value
      });
      return _clearAllListeners(promise);
    }, 0);
  };

  _reject = function(promise, value) {
    return setTimeout(function() {
      promise.isRejected = true;
      promise.rejectedReason = value;
      _fire('promise:failed', promise, {
        detail: value
      });
      return _clearAllListeners(promise);
    }, 0);
  };

  _invokeCallback = function(type, promise, callback, event) {
    var e, error, failed, hasCallback, succeeded, value;

    hasCallback = typeof callback === 'function';
    if (hasCallback) {
      try {
        value = callback(event.detail);
        succeeded = true;
      } catch (_error) {
        e = _error;
        failed = true;
        error = e;
      }
    } else {
      value = event.detail;
      succeeded = true;
    }
    if (!_handleThenable(promise, value)) {
      if (hasCallback && succeeded) {
        _resolve(promise, value);
      } else if (failed) {
        _reject(promise, error);
      } else if (type === 'resolve') {
        _resolve(promise, value);
      } else if (type === 'reject') {
        _reject(promise, value);
      }
    }
    return true;
  };

  _addListener = function(type, promise, callback) {
    var _base, _ref, _ref1;

    ((_ref = (_base = ((_ref1 = promise.listeners) != null ? _ref1 : promise.listeners = {}))[type]) != null ? _ref : _base[type] = []).push(callback);
    return true;
  };

  _clearAllListeners = function(promise) {
    promise.listeners = null;
    return true;
  };

  _fire = function(type, promise, args) {
    var callbacks, i, _ref, _ref1;

    if (Object.prototype.toString.call(args) !== '[object Array]') {
      args = [args];
    }
    callbacks = (_ref = (_ref1 = promise.listeners) != null ? _ref1[type] : void 0) != null ? _ref : [];
    i = 0;
    while (i < callbacks.length) {
      callbacks[i].apply(promise, args);
      i++;
    }
    return true;
  };

  Ext.define('Sch.util.Promise', {
    constructor: function(resolver) {
      var e, rejectPromise, resolvePromise, resolved,
        _this = this;

      if (typeof resolver !== 'function') {
        throw new TypeError('No resolver function defined');
      }
      resolved = false;
      resolvePromise = function(value) {
        if (resolved) {
          return;
        }
        resolved = true;
        return _resolve(_this, value);
      };
      rejectPromise = function(value) {
        if (resolved) {
          return;
        }
        resolved = true;
        return _reject(_this, value);
      };
      try {
        resolver(resolvePromise, rejectPromise);
      } catch (_error) {
        e = _error;
        rejectPromise(e);
      }
      return this;
    },
    then: function(done, fail) {
      var promise,
        _this = this;

      promise = Ext.create('Sch.util.Promise', function() {});
      if (this.isFulfilled) {
        setTimeout(function() {
          return _invokeCallback('resolve', promise, done, {
            detail: _this.fulfillmentValue
          });
        }, 0);
      } else if (this.isRejected) {
        setTimeout(function() {
          return _invokeCallback('reject', promise, fail, {
            detail: _this.rejectedReason
          });
        }, 0);
      } else {
        _addListener('promise:resolved', this, function(event) {
          return _invokeCallback('resolve', promise, done, event);
        });
        _addListener('promise:failed', this, function(event) {
          return _invokeCallback('reject', promise, fail, event);
        });
      }
      return promise;
    },
    statics: {
      all: function(promises) {
        var deferred, i, rejectAll, remaining, resolveAll, resolver, results;

        results = [];
        deferred = this.defer();
        remaining = promises.length;
        if (remaining === 0) {
          deferred.resolve([]);
        }
        resolver = function(index) {
          return function(value) {
            return resolveAll(index, value);
          };
        };
        resolveAll = function(index, value) {
          results[index] = value;
          if (--remaining === 0) {
            return deferred.resolve(results);
          }
        };
        rejectAll = function(error) {
          return deferred.reject(error);
        };
        i = 0;
        while (i < promises.length) {
          if (promises[i] && typeof promises[i].then === 'function') {
            promises[i].then(resolver(i), rejectAll);
          } else {
            resolveAll(i, promises[i]);
          }
          i++;
        }
        return deferred.promise;
      },
      hash: function(promises) {
        var deferred, prop, rejectAll, remaining, resolveAll, resolver, results;

        results = {};
        deferred = this.defer();
        remaining = Object.keys(promises).length;
        if (remaining === 0) {
          deferred.resolve({});
        }
        resolver = function(prop) {
          return function(value) {
            return resolveAll(prop, value);
          };
        };
        resolveAll = function(prop, value) {
          results[prop] = value;
          if (--remaining === 0) {
            return deferred.resolve(results);
          }
        };
        rejectAll = function(error) {
          return deferred.reject(error);
        };
        for (prop in promises) {
          if (promises[prop] && typeof promises[prop].then === 'function') {
            promises[prop].then(resolver(prop), rejectAll);
          } else {
            resolveAll(prop, promises[prop]);
          }
        }
        return deferred.promise;
      },
      defer: function() {
        var deferred;

        deferred = {};
        deferred.promise = Ext.create('Sch.util.Promise', function(resolve, reject) {
          deferred.resolve = resolve;
          deferred.reject = reject;
          return true;
        });
        return deferred;
      },
      resolve: function(thenable) {
        return Ext.create('Sch.util.Promise', function(resolve, reject) {
          var error, thn;

          try {
            if (typeof thenable === 'function' || (typeof thenable === 'object' && thenable !== null)) {
              thn = thenable.then;
              if (typeof thn === 'function') {
                thn.call(thenable, resolve, reject);
              } else {
                resolve(thenable);
              }
            } else {
              resolve(thenable);
            }
          } catch (_error) {
            error = _error;
            reject(error);
          }
          return true;
        });
      },
      reject: function(reason) {
        return Ext.create('Sch.util.Promise', function(resolve, reject) {
          reject(reason);
          return true;
        });
      }
    }
  });

}).call(this);

/*
//@ sourceMappingURL=Promise.map
*/
