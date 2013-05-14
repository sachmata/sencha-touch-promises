/*
  Implementation of Promises/A+ (http://promises-aplus.github.com/promises-spec) for Sencha Touch 1.1.1
  that passes the test suite (http://github.com/promises-aplus/promises-tests).

  Ported from RSVP.js (http://github.com/tildeio/rsvp.js), 
  embeded/simplified EventTarget plus some fixes to pass the test suite.
  
  See RSVP.js documentation for usage examples.
*/

(function() {
    function _resolve(promise, value) {
        if (promise === value) {
            _fulfill(promise, value);
        } else if (!_handleThenable(promise, value)) {
            _fulfill(promise, value);
        }
    }

    function _handleThenable(promise, value) {
        var then = null;

        if (typeof value === 'function' || (typeof value === 'object' && value !== null)) {
            try {
                then = value.then;
            } catch (e) {
                _reject(promise, e);
                return true;
            }

            if (typeof then === 'function') {
                try {
                    then.call(value, function(val) {
                        if (value !== val) {
                            _resolve(promise, val);
                        } else {
                            _fulfill(promise, val);
                        }
                    }, function(val) {
                        _reject(promise, val);
                    });
                } catch (e) {
                    _reject(promise, e);
                }
                return true;
            }
        }

        return false;
    }

    function _fulfill(promise, value) {
        setTimeout(function() {
            promise.isFulfilled = true;
            promise.fulfillmentValue = value;

            _fire('promise:resolved', promise, {
                detail: value
            });
            _clearAllListeners(promise);
        }, 0);
    }

    function _reject(promise, value) {
        setTimeout(function() {
            promise.isRejected = true;
            promise.rejectedReason = value;

            _fire('promise:failed', promise, {
                detail: value
            });
            _clearAllListeners(promise);
        }, 0);
    }

    function _invokeCallback(type, promise, callback, event) {
        var hasCallback = (typeof callback === 'function'),
            value, error, succeeded, failed;

        if (hasCallback) {
            try {
                value = callback(event.detail);
                succeeded = true;
            } catch (e) {
                failed = true;
                error = e;
            }
        } else {
            value = event.detail;
            succeeded = true;
        }

        if (_handleThenable(promise, value)) {
            return;
        } else if (hasCallback && succeeded) {
            _resolve(promise, value);
        } else if (failed) {
            _reject(promise, error);
        } else if (type === 'resolve') {
            _resolve(promise, value);
        } else if (type === 'reject') {
            _reject(promise, value);
        }
    }

    function _addListener(type, promise, callback) {
        if (!promise.listeners) {
            promise.listeners = {};
        }

        if (!promise.listeners[type]) {
            promise.listeners[type] = [];
        }

        promise.listeners[type].push(callback);
    }

    function _clearAllListeners(promise) {
        if (promise.listeners) {
            promise.listeners = {};
        }
    }

    function _fire(type, promise, args) {
        if (promise.listeners && promise.listeners[type]) {
            if (Object.prototype.toString.call(args) !== '[object Array]') {
                args = [args];
            }

            var callbacks = promise.listeners[type];
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i].apply(promise, args);
            }
        }
    }

    Ext.define('Sch.util.Promise', {
        constructor: function(resolver) {
            if (typeof resolver !== 'function') {
                throw new TypeError('No resolver function defined');
            }

            var promise = this,
                resolved = false;

            var resolvePromise = function(value) {
                if (resolved) {
                    return;
                }
                resolved = true;
                _resolve(promise, value);
            };

            var rejectPromise = function(value) {
                if (resolved) {
                    return;
                }
                resolved = true;
                _reject(promise, value);
            };

            try {
                resolver(resolvePromise, rejectPromise);
            } catch (e) {
                rejectPromise(e);
            }
        },

        then: function(done, fail) {
            var self = this,
                thenPromise = new this.self(function() {});

            if (this.isFulfilled) {
                setTimeout(function() {
                    _invokeCallback('resolve', thenPromise, done, {
                        detail: self.fulfillmentValue
                    });
                }, 0);
            } else if (this.isRejected) {
                setTimeout(function() {
                    _invokeCallback('reject', thenPromise, fail, {
                        detail: self.rejectedReason
                    });
                }, 0);
            } else {
                _addListener('promise:resolved', this, function(event) {
                    _invokeCallback('resolve', thenPromise, done, event);
                });
                _addListener('promise:failed', this, function(event) {
                    _invokeCallback('reject', thenPromise, fail, event);
                });
            }

            return thenPromise;
        },

        statics: {
            all: function(promises) {
                var results = [],
                    deferred = this.defer(),
                    remaining = promises.length;

                if (remaining === 0) {
                    deferred.resolve([]);
                }

                var resolver = function(index) {
                    return function(value) {
                        resolveAll(index, value);
                    };
                };

                var resolveAll = function(index, value) {
                    results[index] = value;
                    if (--remaining === 0) {
                        deferred.resolve(results);
                    }
                };

                var rejectAll = function(error) {
                    deferred.reject(error);
                };

                for (var i = 0; i < promises.length; i++) {
                    if (promises[i] && typeof promises[i].then === 'function') {
                        promises[i].then(resolver(i), rejectAll);
                    } else {
                        resolveAll(i, promises[i]);
                    }
                }
                return deferred.promise;
            },
            hash: function(promises) {
                var results = {}, deferred = this.defer(),
                    remaining = Object.keys(promises).length;

                if (remaining === 0) {
                    deferred.resolve({});
                }

                var resolver = function(prop) {
                    return function(value) {
                        resolveAll(prop, value);
                    };
                };

                var resolveAll = function(prop, value) {
                    results[prop] = value;
                    if (--remaining === 0) {
                        deferred.resolve(results);
                    }
                };

                var rejectAll = function(error) {
                    deferred.reject(error);
                };

                for (var prop in promises) {
                    if (promises[prop] && typeof promises[prop].then === 'function') {
                        promises[prop].then(resolver(prop), rejectAll);
                    } else {
                        resolveAll(prop, promises[prop]);
                    }
                }

                return deferred.promise;
            },
            defer: function() {
                var deferred = {};

                var promise = new this(function(resolve, reject) {
                    deferred.resolve = resolve;
                    deferred.reject = reject;
                });

                deferred.promise = promise;
                return deferred;
            },
            resolve: function(thenable) {
                var promise = new this(function(resolve, reject) {
                    var then;

                    try {
                        if (typeof thenable === 'function' || (typeof thenable === 'object' && thenable !== null)) {
                            then = thenable.then;

                            if (typeof then === 'function') {
                                then.call(thenable, resolve, reject);
                            } else {
                                resolve(thenable);
                            }

                        } else {
                            resolve(thenable);
                        }

                    } catch (error) {
                        reject(error);
                    }
                });

                return promise;
            },
            reject: function(reason) {
                return new this(function(resolve, reject) {
                    reject(reason);
                });
            }
        }
    });
})();
