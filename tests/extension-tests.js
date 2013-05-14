/*global Sch.util.Promise, describe, specify, it, assert */
describe("Sch.util.Promise extensions", function() {
  describe("self fulfillment", function(){
    it("treats self fulfillment as the recursive base case", function(done){
      var aDefer = Sch.util.Promise.defer(),
      bDefer = Sch.util.Promise.defer(),
      promiseA = aDefer.promise,
      promiseB = bDefer.promise;

      promiseA.then(function(a){
        setTimeout(function(){
          bDefer.resolve(promiseB);
        }, 1);

        return promiseB;
      });

      promiseB.then(function(c){
        done();
      })

      aDefer.resolve(promiseA);
    });
  });

  describe("Promise constructor", function() {
    it('should exist', function() {
      assert(Sch.util.Promise);
    });

    it('should fulfill if `resolve` is called with a value', function(done) {
      var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve('value'); });

      promise.then(function(value) {
        assert.equal(value, 'value');
        done();
      });
    });

    it('should reject if `reject` is called with a reason', function(done) {
      var promise = Ext.create('Sch.util.Promise', function(resolve, reject) { reject('reason'); });

      promise.then(function() {
        assert(false);
        done();
      }, function(reason) {
        assert.equal(reason, 'reason');
        done();
      });
    });

    it('should be a constructor', function() {
      var promise = Ext.create('Sch.util.Promise', function() {});

      assert.equal(Object.getPrototypeOf(promise), Sch.util.Promise.prototype, '[[Prototype]] equals Promise.prototype');
      // assert.equal(promise.constructor, Sch.util.Promise, 'constructor property of instances is set correctly');
      // assert.equal(Sch.util.Promise.prototype.constructor, Sch.util.Promise, 'constructor property of prototype is set correctly');
    });

    it('should throw a `TypeError` if not given a function', function() {
      assert.throws(function () {
        var promise = Ext.create('Sch.util.Promise');
      }, TypeError);

      assert.throws(function () {
        var promise = Ext.create('Sch.util.Promise', {});
      }, TypeError);

      assert.throws(function () {
        var promise = Ext.create('Sch.util.Promise', 'boo!');
      }, TypeError);
    });

    it('should reject on resolver exception', function(done) {
      var promise = Ext.create('Sch.util.Promise', function() {
        throw 'error';
      }).then(null, function(e) {
        assert.equal(e, 'error');
        done();
      });
    });

    describe('assimilation', function() {
      it('should assimilate if `resolve` is called with a fulfilled promise', function(done) {
        var originalPromise = Ext.create('Sch.util.Promise', function(resolve) { resolve('original value'); });
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(originalPromise); });

        promise.then(function(value) {
          assert.equal(value, 'original value');
          done();
        });
      });

      it('should assimilate if `resolve` is called with a rejected promise', function(done) {
        var originalPromise = Ext.create('Sch.util.Promise', function(resolve, reject) { reject('original reason'); });
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(originalPromise); });

        promise.then(function() {
          assert(false);
          done();
        }, function(reason) {
          assert.equal(reason, 'original reason');
          done();
        });
      });

      it('should assimilate if `resolve` is called with a fulfilled thenable', function(done) {
        var originalThenable = {
          then: function (onFulfilled) {
            setTimeout(function() { onFulfilled('original value'); }, 0);
          }
        };
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(originalThenable); });

        promise.then(function(value) {
          assert.equal(value, 'original value');
          done();
        });
      });

      it('should assimilate if `resolve` is called with a rejected thenable', function(done) {
        var originalThenable = {
          then: function (onFulfilled, onRejected) {
            setTimeout(function() { onRejected('original reason'); }, 0);
          }
        };
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(originalThenable); });

        promise.then(function() {
          assert(false);
          done();
        }, function(reason) {
          assert.equal(reason, 'original reason');
          done();
        });
      });


      it('should assimilate two levels deep, for fulfillment of self fulfilling promises', function(done) {
        var originalPromise, promise;
        originalPromise = Ext.create('Sch.util.Promise', function(resolve) {
          setTimeout(function() {
            resolve(originalPromise);
          }, 0)
        });

        promise = Ext.create('Sch.util.Promise', function(resolve) {
          setTimeout(function() {
            resolve(originalPromise);
          }, 0);
        });

        promise.then(function(value) {
          assert.equal(value, originalPromise);
          done();
        });
      });

      it('should assimilate two levels deep, for fulfillment', function(done) {
        var originalPromise = Ext.create('Sch.util.Promise', function(resolve) { resolve('original value'); });
        var nextPromise = Ext.create('Sch.util.Promise', function(resolve) { resolve(originalPromise); });
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(nextPromise); });

        promise.then(function(value) {
          assert.equal(value, 'original value');
          done();
        });
      });

      it('should assimilate two levels deep, for rejection', function(done) {
        var originalPromise = Ext.create('Sch.util.Promise', function(resolve, reject) { reject('original reason'); });
        var nextPromise = Ext.create('Sch.util.Promise', function(resolve) { resolve(originalPromise); });
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(nextPromise); });

        promise.then(function() {
          assert(false);
          done();
        }, function(reason) {
          assert.equal(reason, 'original reason');
          done();
        });
      });

      it('should assimilate three levels deep, mixing thenables and promises (fulfilled case)', function(done) {
        var originalPromise = Ext.create('Sch.util.Promise', function(resolve) { resolve('original value'); });
        var intermediateThenable = {
          then: function (onFulfilled) {
            setTimeout(function() { onFulfilled(originalPromise); }, 0);
          }
        };
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(intermediateThenable); });

        promise.then(function(value) {
          assert.equal(value, 'original value');
          done();
        });
      });

      it('should assimilate three levels deep, mixing thenables and promises (rejected case)', function(done) {
        var originalPromise = Ext.create('Sch.util.Promise', function(resolve, reject) { reject('original reason'); });
        var intermediateThenable = {
          then: function (onFulfilled) {
            setTimeout(function() { onFulfilled(originalPromise); }, 0);
          }
        };
        var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(intermediateThenable); });

        promise.then(function() {
          assert(false);
          done();
        }, function(reason) {
          assert.equal(reason, 'original reason');
          done();
        });
      });
    });
  });

  describe("Sch.util.Promise.defer", function() {
    specify("It should return a resolver and promise together", function(done) {
      var deferred = Sch.util.Promise.defer(), value = {};

      // resolve first to confirm that the semantics are async
      deferred.resolve(value);

      deferred.promise.then(function(passedValue) {
        assert(passedValue === value);
        done();
      });
    });

    specify("The provided resolver should support rejection", function(done) {
      var deferred = Sch.util.Promise.defer(), reason = {};

      // resolve first to confirm that the semantics are async
      deferred.reject(reason);

      deferred.promise.then(null, function(passedReason) {
        assert(passedReason === reason);
        done();
      });
    });
  });

  describe("Sch.util.Promise.hash", function() {
    it('should exist', function() {
      assert(Sch.util.Promise.hash);
    });

    specify('fulfilled only after all of the promise values are fulfilled', function(done) {
      var firstResolved, secondResolved, firstResolver, secondResolver;

      var first = Ext.create('Sch.util.Promise', function(resolve) {
        firstResolver = resolve;
      });
      first.then(function() {
        firstResolved = true;
      });

      var second = Ext.create('Sch.util.Promise', function(resolve) {
        secondResolver = resolve;
      });
      second.then(function() {
        secondResolved = true;
      });

      setTimeout(function() {
        firstResolver(true);
      }, 0);

      setTimeout(function() {
        secondResolver(true);
      }, 0);

      Sch.util.Promise.hash({ first: first, second: second }).then(function(values) {
        assert(values.first);
        assert(values.second);
        done();
      });
    });

    specify('rejected as soon as a promise is rejected', function(done) {
      var firstResolver, secondResolver;

      var first = Ext.create('Sch.util.Promise', function(resolve, reject) {
        firstResolver = { resolve: resolve, reject: reject };
      });

      var second = Ext.create('Sch.util.Promise', function(resolve, reject) {
        secondResolver = { resolve: resolve, reject: reject };
      });

      setTimeout(function() {
        firstResolver.reject({});
      }, 0);

      setTimeout(function() {
        secondResolver.resolve(true);
      }, 5000);

      Sch.util.Promise.hash({ first: first, second: second }).then(function() {
        assert(false);
      }, function() {
        assert(first.isRejected);
        assert(!second.isResolved);
        done();
      });
    });

    specify('resolves an empty hash passed to Sch.util.Promise.all()', function(done) {
      Sch.util.Promise.hash({}).then(function(results) {
        assert.deepEqual(results, {});
        done();
      });
    });

    specify('works with a mix of promises and thenables and non-promises', function(done) {
      var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(1); });
      var syncThenable = { then: function (onFulfilled) { onFulfilled(2); } };
      var asyncThenable = { then: function (onFulfilled) { setTimeout(function() { onFulfilled(3); }, 0); } };
      var nonPromise = 4;

      Sch.util.Promise.hash({ promise: promise, syncThenable: syncThenable, asyncThenable: asyncThenable, nonPromise: nonPromise }).then(function(results) {
        assert.deepEqual(results, { promise: 1, syncThenable: 2, asyncThenable: 3, nonPromise: 4 });
        done();
      });
    });

  });

  describe("Sch.util.Promise.all", function() {
    it('should exist', function() {
      assert(Sch.util.Promise.all);
    });

    specify('fulfilled only after all of the other promises are fulfilled', function(done) {
      var firstResolved, secondResolved, firstResolver, secondResolver;

      var first = Ext.create('Sch.util.Promise', function(resolve) {
        firstResolver = resolve;
      });
      first.then(function() {
        firstResolved = true;
      });

      var second = Ext.create('Sch.util.Promise', function(resolve) {
        secondResolver = resolve;
      });
      second.then(function() {
        secondResolved = true;
      });

      setTimeout(function() {
        firstResolver(true);
      }, 0);

      setTimeout(function() {
        secondResolver(true);
      }, 0);

      Sch.util.Promise.all([first, second]).then(function() {
        assert(firstResolved);
        assert(secondResolved);
        done();
      });
    });

    specify('rejected as soon as a promise is rejected', function(done) {
      var firstResolver, secondResolver;

      var first = Ext.create('Sch.util.Promise', function(resolve, reject) {
        firstResolver = { resolve: resolve, reject: reject };
      });

      var second = Ext.create('Sch.util.Promise', function(resolve, reject) {
        secondResolver = { resolve: resolve, reject: reject };
      });

      setTimeout(function() {
        firstResolver.reject({});
      }, 0);

      setTimeout(function() {
        secondResolver.resolve(true);
      }, 5000);

      Sch.util.Promise.all([first, second]).then(function() {
        assert(false);
      }, function() {
        assert(first.isRejected);
        assert(!second.isResolved);
        done();
      });
    });

    specify('passes the resolved values of each promise to the callback in the correct order', function(done) {
      var firstResolver, secondResolver, thirdResolver;

      var first = Ext.create('Sch.util.Promise', function(resolve, reject) {
        firstResolver = { resolve: resolve, reject: reject };
      });

      var second = Ext.create('Sch.util.Promise', function(resolve, reject) {
        secondResolver = { resolve: resolve, reject: reject };
      });

      var third = Ext.create('Sch.util.Promise', function(resolve, reject) {
        thirdResolver = { resolve: resolve, reject: reject };
      });

      thirdResolver.resolve(3);
      firstResolver.resolve(1);
      secondResolver.resolve(2);

      Sch.util.Promise.all([first, second, third]).then(function(results) {
        assert(results.length === 3);
        assert(results[0] === 1);
        assert(results[1] === 2);
        assert(results[2] === 3);
        done();
      });
    });

    specify('resolves an empty array passed to Sch.util.Promise.all()', function(done) {
      Sch.util.Promise.all([]).then(function(results) {
        assert(results.length === 0);
        done();
      });
    });

    specify('works with a mix of promises and thenables and non-promises', function(done) {
      var promise = Ext.create('Sch.util.Promise', function(resolve) { resolve(1); });
      var syncThenable = { then: function (onFulfilled) { onFulfilled(2); } };
      var asyncThenable = { then: function (onFulfilled) { setTimeout(function() { onFulfilled(3); }, 0); } };
      var nonPromise = 4;

      Sch.util.Promise.all([promise, syncThenable, asyncThenable, nonPromise]).then(function(results) {
        assert.deepEqual(results, [1, 2, 3, 4]);
        done();
      });
    });
  });

  describe("Sch.util.Promise.reject", function(){
    specify("it should exist", function(){
      assert(Sch.util.Promise.reject);
    });

    describe('it rejects', function(){
      var reason = 'the reason',
      promise = Sch.util.Promise.reject(reason);

      promise.then(function(){
        assert(false, 'should not fulfill');
      }, function(actualReason){
        assert.equal(reason, actualReason);
      });
    });
  });

  describe("Sch.util.Promise.resolve", function(){
    specify("it should exist", function(){
      assert(Sch.util.Promise.resolve);
    });

    describe("1. If x is a promise, adopt its state ", function(){
      specify("1.1 If x is pending, promise must remain pending until x is fulfilled or rejected.", function(done){
        var expectedValue, resolver, thenable, wrapped;

        expectedValue = 'the value';
        thenable = {
          then: function(resolve, reject){
            resolver = resolve;
          }
        };

        wrapped = Sch.util.Promise.resolve(thenable);

        wrapped.then(function(value){
          assert(value === expectedValue);
          done();
        })
        resolver(expectedValue);

      });

      specify("1.2 If/when x is fulfilled, fulfill promise with the same value.", function(done){
        var expectedValue, thenable, wrapped;

        expectedValue = 'the value';
        thenable = {
          then: function(resolve, reject){
            resolve(expectedValue);
          }
        };

        wrapped = Sch.util.Promise.resolve(thenable);

        wrapped.then(function(value){
          assert(value === expectedValue);
          done();
        })
      });

      specify("1.3 If/when x is rejected, reject promise with the same reason.", function(done){
        var expectedError, thenable, wrapped;

        expectedError =  new Error();
        thenable = {
          then: function(resolve, reject){
            reject(expectedError);
          }
        };

        wrapped = Sch.util.Promise.resolve(thenable);

        wrapped.then(null, function(error){
          assert(error === expectedError);
          done();
        });
      });
    });

    describe("2. Otherwise, if x is an object or function,", function(){
      specify("2.1 Let then x.then", function(done){
        var accessCount, resolver, wrapped, thenable;

        accessCount = 0;
        thenable = { };

        Object.defineProperty(thenable, 'then', {
          get: function(){
            accessCount++;

            if (accessCount > 1) {
              throw new Error();
            }

            return function(){ };
          }
        });

        assert(accessCount === 0);

        wrapped = Sch.util.Promise.resolve(thenable);

        assert(accessCount === 1);

        done();
      });

      specify("2.2 If retrieving the property x.then results in a thrown exception e, reject promise with e as the reason.", function(done){
        var wrapped, thenable, expectedError;

        expectedError = new Error();
        thenable = { };

        Object.defineProperty(thenable, 'then', {
          get: function(){
            throw expectedError;
          }
        });

        wrapped = Sch.util.Promise.resolve(thenable);

        wrapped.then(null, function(error){
          assert(error === expectedError, 'incorrect exception was thrown');
          done();
        });
      });

      describe('2.3. If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise, where', function(){
        specify('2.3.1 If/when resolvePromise is called with a value y, run Resolve(promise, y)', function(done){
          var expectedSuccess, resolver, rejector, thenable, wrapped, calledThis;

          thenable = {
            then: function(resolve, reject){
              calledThis = this;
              resolver = resolve;
              rejector = reject;
            }
          };

          expectedSuccess = 'success';
          wrapped = Sch.util.Promise.resolve(thenable);

          wrapped.then(function(success){
            assert(calledThis === thenable, 'this must be the thenable');
            assert(success === expectedSuccess, 'rejected promise with x');
            done();
          });

          resolver(expectedSuccess);
        });

        specify('2.3.2 If/when rejectPromise is called with a reason r, reject promise with r.', function(done){
          var expectedError, resolver, rejector, thenable, wrapped, calledThis,

          thenable = {
            then: function(resolve, reject){
              calledThis = this;
              resolver = resolve;
              rejector = reject;
            }
          };

          expectedError = new Error();

          wrapped = Sch.util.Promise.resolve(thenable);

          wrapped.then(null, function(error){
            assert(error === expectedError, 'rejected promise with x');
            done();
          });

          rejector(expectedError);
        });

        specify("2.3.3 If both resolvePromise and rejectPromise are called, or multiple calls to the same argument are made, the first call takes precedence, and any further calls are ignored", function(done){
          var expectedError, expectedSuccess, resolver, rejector, thenable, wrapped, calledThis,
          calledRejected, calledResolved;

          calledRejected = 0;
          calledResolved = 0;

          thenable = {
            then: function(resolve, reject){
              calledThis = this;
              resolver = resolve;
              rejector = reject;
            }
          };

          expectedError = new Error();

          wrapped = Sch.util.Promise.resolve(thenable);

          wrapped.then(function(){
            calledResolved++;
          }, function(error){
            calledRejected++;
            assert(calledResolved === 0, 'never resolved');
            assert(calledRejected === 1, 'rejected only once');
            assert(error === expectedError, 'rejected promise with x');
          });

          rejector(expectedError);
          rejector(expectedError);

          rejector('foo');

          resolver('bar');
          resolver('baz');

          setTimeout(function(){
            assert(calledRejected === 1, 'only rejected once');
            assert(calledResolved === 0, 'never resolved');
            done();
          }, 50);
        });

        describe("2.3.4 If calling then throws an exception e", function(){
          specify("2.3.4.1 If resolvePromise or rejectPromise have been called, ignore it.", function(done){
            var expectedSuccess, resolver, rejector, thenable, wrapped, calledThis,
            calledRejected, calledResolved;

            expectedSuccess = 'success';

            thenable = {
              then: function(resolve, reject){
                resolve(expectedSuccess);
                throw expectedError;
              }
            };

            wrapped = Sch.util.Promise.resolve(thenable);

            wrapped.then(function(success){
              assert(success === expectedSuccess, 'resolved not errored');
              done();
            });
          });

          specify("2.3.4.2 Otherwise, reject promise with e as the reason.", function(done) {
            var expectedError, resolver, rejector, thenable, wrapped, calledThis, callCount;

            expectedError = new Error();
            callCount = 0;

            thenable = { then: function() { throw expectedError; } };

            wrapped = Sch.util.Promise.resolve(thenable);

            wrapped.then(null, function(error){
              callCount++;
              assert(expectedError === error, 'expected the correct error to be rejected');
              done();
            });

            assert(callCount === 0, 'expected async, was sync');
          });
        });
      });

      specify("2.4 If then is not a function, fulfill promise with x", function(done){
        var expectedError, resolver, rejector, thenable, wrapped, calledThis, callCount;

        thenable = { then: 3 };
        callCount = 0;
        wrapped = Sch.util.Promise.resolve(thenable);

        wrapped.then(function(success){
          callCount++;
          assert(thenable === success, 'fulfilled promise with x');
          done();
        });

        assert(callCount === 0, 'expected async, was sync');
      });
    });

    describe("3. If x is not an object or function, ", function(){
      specify("fulfill promise with x.", function(done){
        var thenable, callCount, wrapped;

        thenable = null;
        callCount = 0;
        wrapped = Sch.util.Promise.resolve(thenable);

        wrapped.then(function(success){
          callCount++;
          assert(success === thenable, 'fulfilled promise with x');
          done();
        }, function(a){
          assert(false, 'should not also reject');
        });

        assert(callCount === 0, 'expected async, was sync');
      });
    });
  });
});
