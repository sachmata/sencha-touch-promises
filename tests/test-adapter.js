global.adapter = {
    fulfilled: function(value) {
        return Ext.create('Sch.util.Promise', function(resolve, reject) {
            resolve(value);
        });
    },
    rejected: function(error) {
        return Ext.create('Sch.util.Promise', function(resolve, reject) {
            reject(error);
        });
    },
    pending: function() {
        var pending = {};

        pending.promise = Ext.create('Sch.util.Promise', function(resolve, reject) {
            pending.fulfill = resolve;
            pending.reject = reject;
        });

        return pending;
    }
};