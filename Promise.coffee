###
Implementation of Promises/A+ (http://promises-aplus.github.com/promises-spec) for Sencha Touch 2
that passes the test suite (http://github.com/promises-aplus/promises-tests).

Ported from RSVP.js (http://github.com/tildeio/rsvp.js), 
embeded/simplified EventTarget plus some fixes to pass the test suite.

See RSVP.js documentation for usage examples.
###

_resolve = (promise, value) ->
    if promise is value
        _fulfill promise, value
    else unless _handleThenable(promise, value)
        _fulfill promise, value
    true

_handleThenable = (promise, value) ->
    if typeof value is 'function' or (typeof value is 'object' and value isnt null)
        try
            thn = value.then
        catch e
            _reject promise, e
            return true
        
        if typeof thn is 'function'
            try
                thn.call value, ((val) ->
                    if value isnt val
                        _resolve promise, val
                    else
                        _fulfill promise, val
                ), ((val) ->
                    _reject promise, val
                )
            catch e
                _reject promise, e
            return true
    false

_fulfill = (promise, value) ->
    setTimeout(() ->
        promise.isFulfilled = true
        promise.fulfillmentValue = value
        _fire 'promise:resolved', promise,
            detail: value

        _clearAllListeners promise
    , 0)

_reject = (promise, value) ->
    setTimeout(() ->
        promise.isRejected = true
        promise.rejectedReason = value
        _fire 'promise:failed', promise,
            detail: value

        _clearAllListeners promise
    , 0)

_invokeCallback = (type, promise, callback, event) ->
    hasCallback = (typeof callback is 'function')
    if hasCallback
        try
            value = callback event.detail
            succeeded = true
        catch e
            failed = true
            error = e
    else
        value = event.detail
        succeeded = true
    
    unless _handleThenable promise, value
        if hasCallback and succeeded
            _resolve promise, value
        else if failed
            _reject promise, error
        else if type is 'resolve'
            _resolve promise, value
        else if type is 'reject'
            _reject promise, value
    true

_addListener = (type, promise, callback) ->
    ((promise.listeners ?= {})[type] ?= []).push callback
    true

_clearAllListeners = (promise) ->
    promise.listeners = null
    true

_fire = (type, promise, args) ->
    args = [args] if Object::toString.call(args) isnt '[object Array]'
    callbacks = promise.listeners?[type] ? []
    i = 0
    while i < callbacks.length
        callbacks[i].apply promise, args
        i++
    true

Ext.define 'Sch.util.Promise',
    constructor: (resolver) ->
        throw new TypeError('No resolver function defined') if typeof resolver isnt 'function'

        resolved = false
        
        resolvePromise = (value) =>
            return if resolved
            resolved = true
            _resolve @, value

        rejectPromise = (value) =>
            return if resolved
            resolved = true
            _reject @, value

        try
            resolver resolvePromise, rejectPromise
        catch e
            rejectPromise e
        @

    then: (done, fail) ->
        promise = Ext.create 'Sch.util.Promise', ->
        
        if @isFulfilled
            setTimeout(() =>
                _invokeCallback 'resolve', promise, done,
                    detail: @fulfillmentValue
            , 0)
        else if @isRejected
            setTimeout(() =>
                _invokeCallback 'reject', promise, fail,
                    detail: @rejectedReason
            , 0)
        else
            _addListener 'promise:resolved', this, (event) =>
                _invokeCallback 'resolve', promise, done, event
            _addListener 'promise:failed', this, (event) =>
                _invokeCallback 'reject', promise, fail, event

        promise

    statics:
        all: (promises) ->
            results = []
            deferred = @defer()
            remaining = promises.length
            deferred.resolve [] if remaining is 0

            resolver = (index) ->
                (value) ->
                    resolveAll index, value

            resolveAll = (index, value) ->
                results[index] = value
                deferred.resolve results if --remaining is 0

            rejectAll = (error) ->
                deferred.reject error

            i = 0
            while i < promises.length
                if promises[i] and typeof promises[i].then is 'function'
                    promises[i].then resolver(i), rejectAll
                else
                    resolveAll i, promises[i]
                i++

            deferred.promise

        hash: (promises) ->
            results = {}
            deferred = @defer()
            remaining = Object.keys(promises).length
            deferred.resolve {} if remaining is 0

            resolver = (prop) ->
                (value) ->
                    resolveAll prop, value

            resolveAll = (prop, value) ->
                results[prop] = value
                deferred.resolve results if --remaining is 0

            rejectAll = (error) ->
                deferred.reject error

            for prop of promises
                if promises[prop] and typeof promises[prop].then is 'function'
                    promises[prop].then resolver(prop), rejectAll
                else
                    resolveAll prop, promises[prop]

            deferred.promise

        defer: ->
            deferred = {}
            deferred.promise = Ext.create 'Sch.util.Promise', (resolve, reject) ->
                deferred.resolve = resolve
                deferred.reject = reject
                true
            deferred

        resolve: (thenable) ->
            Ext.create 'Sch.util.Promise', (resolve, reject) ->
                try
                    if typeof thenable is 'function' or (typeof thenable is 'object' and thenable isnt null)
                        thn = thenable.then;
                        if typeof thn is 'function'
                            thn.call thenable, resolve, reject
                        else
                            resolve thenable
                    else
                        resolve thenable
                catch error
                    reject error
                true

        reject: (reason) ->
            Ext.create 'Sch.util.Promise', (resolve, reject) ->
                reject reason
                true
