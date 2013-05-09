/*
  Implementation of Promises/A+ (http://promises-aplus.github.com/promises-spec)
  that passes the test suite (http://github.com/promises-aplus/promises-tests).

  Ported from RSVP.js (http://github.com/tildeio/rsvp.js)
  and adapted to use Ext.util.Observable as EventTarget
  plus some fixes to pass the test suite.
  
  See RSVP.js documentation for usage examples.
*/

Ext.namespace('Sch.util');

Sch.util.Promise = Ext.extend(Ext.util.Observable, (function () {
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
                    then.call(value, function (val) {
                        if (value !== val) {
                            _resolve(promise, val);
                        } else {
                            _fulfill(promise, val);
                        }
                    }, function (val) {
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
        setTimeout(function () {
            promise.isFulfilled = true;
            promise.fulfillmentValue = value;
            promise.fireEvent('promise:resolved', {
                detail: value
            });
            promise.clearListeners();
        }, 1);
    }

    function _reject(promise, value) {
        setTimeout(function () {
            promise.isRejected = true;
            promise.rejectedReason = value;
            promise.fireEvent('promise:failed', {
                detail: value
            });
            promise.clearListeners();
        }, 1);
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

    return {
        constructor: function (config) {
            if (typeof config === 'function') {
                config = {
                    resolver: config
                };
            }

            this.addEvents('promise:resolved', 'promise:failed');

            Sch.util.Promise.superclass.constructor.call(this, config);

            if (typeof this.resolver !== 'function') {
                throw new TypeError('No resolver function defined');
            }

            var promise = this,
                resolved = false;

            var resolvePromise = function (value) {
                if (resolved) {
                    return;
                }
                resolved = true;
                _resolve(promise, value);
            };

            var rejectPromise = function (value) {
                if (resolved) {
                    return;
                }
                resolved = true;
                _reject(promise, value);
            };

            try {
                this.resolver(resolvePromise, rejectPromise);
            } catch (e) {
                rejectPromise(e);
            }
        },
        then: function (done, fail) {
            var self = this,
                thenPromise = new Sch.util.Promise(function () {});

            if (this.isFulfilled) {
                setTimeout(function () {
                    _invokeCallback('resolve', thenPromise, done, {
                        detail: self.fulfillmentValue
                    });
                }, 1);
            } else if (this.isRejected) {
                setTimeout(function () {
                    _invokeCallback('reject', thenPromise, fail, {
                        detail: self.rejectedReason
                    });
                }, 1);
            } else {
                this.on('promise:resolved', function (event) {
                    _invokeCallback('resolve', thenPromise, done, event);
                });

                this.on('promise:failed', function (event) {
                    _invokeCallback('reject', thenPromise, fail, event);
                });
            }

            return thenPromise;
        }
    };
})());

Ext.apply(Sch.util.Promise, {
    all: function (promises) {
        var results = [],
            deferred = Sch.util.Promise.defer(),
            remaining = promises.length;

        if (remaining === 0) {
            deferred.resolve([]);
        }

        var resolver = function (index) {
            return function (value) {
                resolveAll(index, value);
            };
        };

        var resolveAll = function (index, value) {
            results[index] = value;
            if (--remaining === 0) {
                deferred.resolve(results);
            }
        };

        var rejectAll = function (error) {
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
    hash: function (promises) {
        var results = {}, deferred = Sch.util.Promise.defer(),
            remaining = Object.keys(promises).length;

        if (remaining === 0) {
            deferred.resolve({});
        }

        var resolver = function (prop) {
            return function (value) {
                resolveAll(prop, value);
            };
        };

        var resolveAll = function (prop, value) {
            results[prop] = value;
            if (--remaining === 0) {
                deferred.resolve(results);
            }
        };

        var rejectAll = function (error) {
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
    defer: function () {
        var deferred = {};

        var promise = new Sch.util.Promise(function (resolve, reject) {
            deferred.resolve = resolve;
            deferred.reject = reject;
        });

        deferred.promise = promise;
        return deferred;
    },
    resolve: function (thenable) {
        var promise = new Sch.util.Promise(function (resolve, reject) {
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
    reject: function (reason) {
        return new Sch.util.Promise(function (resolve, reject) {
            reject(reason);
        });
    }
});