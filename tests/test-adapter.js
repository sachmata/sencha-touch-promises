global.adapter = {
    fulfilled: function (value) {
        return new Sch.util.Promise(function (resolve, reject) {
            resolve(value);
        });
    },
    rejected: function (error) {
        return new Sch.util.Promise(function (resolve, reject) {
            reject(error);
        });
    },
    pending: function () {
        var pending = {};

        pending.promise = new Sch.util.Promise(function (resolve, reject) {
            pending.fulfill = resolve;
            pending.reject = reject;
        });

        return pending;
    }
};