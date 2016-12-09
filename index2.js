var async = require("async");
var EventEmitter = require('events').EventEmitter;

function Keypad(options) {

    this.index(options.keys);

    this.rows = options.rows;
    this.cols = options.cols;

    this._scan = options.scan || 'row';
    this._poll = options.poll || false;

    this.getPressedRunning = false;
    this.rowScanResults = [];
    this.columnScanResults = [];

    this.start();
}


Keypad.prototype = {

    __proto__: EventEmitter.prototype,

    index: function (layout) {
        this.layout = layout;
        this.keys = {};
        layout.forEach(function (row) {
            row.forEach(function (key) {
                this.keys[key] = false;
            }, this)
        }, this)
    },

    reset: function () {
        this.index(this.layout);
    },

    poll: function (ms) {
        this._poll = ms;
        clearInterval(this.pollID);
        this.start();
    },

    scan: function (type) {
        this._scan = type;
    },

    stop: function () {
        clearInterval(this.pollID);
        this.emit('stop');
    },

    start: function () {
        if (!this._poll) return;

        var self = this;

        this.pollID = setInterval(function () {
            if (!self.getPressedRunning) {
                self.getPressed();
            }
        }, this._poll);

    },

    isPressed: function (key, col) {

        this.getPressed();

        if (!isNaN(key)) return this.keys[this.layout[key][col]];

        var keys = keys.split(' ');
        var matches = 0;

        keys.forEach(function (key) {
            if (this.keys[key]) matches++;
        }, this);

        return (matches === keys.length);

    },

    getPressed: function () {
        var pressed = [];
        var self = this;

        self.getPressedRunning = true;

        async.series([
            function (seriesCallBack) {
                if (self._scan === 'row' || self._scan === 'both') {
                    self.scanByRow(seriesCallBack);
                } else {
                    seriesCallBack();
                }
            },
            function(seriesCallBack) {
                pressed = self.rowScanResults;
                seriesCallBack();
            },
            function (seriesCallBack) {
                if (self._scan === 'col' || self._scan === 'both') {
                    async.series([
                        function (innerSeriesCallBack) {
                            self.scanByCol(innerSeriesCallBack);
                        },
                        function (innerSeriesCallBack) {
                            self.columnScanResults.forEach(function (key) {
                                if (pressed.indexOf(key) === -1) pressed.push(key);
                            })
                            innerSeriesCallBack();
                        }
                    ], function (err) {
                        seriesCallBack(err);
                    });
                } else {
                    seriesCallBack();
                }
            },
            function (seriesCallBack) {
                self.process(pressed);
                seriesCallBack();
            }
        ], function (err) {
            self.getPressedRunning = false;
        });
    },

    process: function (keys) {
        if (!keys) return;
        Object.keys(this.keys).forEach(function (key) {
            if (this.keys[key] && keys.indexOf(key) === -1) this.update(key, false);
        }, this);

        keys.forEach(function (key) {
            if (!this.keys[key]) this.update(key, true);
        }, this);
    },

    update: function (key, type) {
        this.emit('change', key, type);
        this.emit(type ? 'keydown' : 'keyup', key);
        this.keys[key] = type;
    },

    scanByRow: function (callback) {
        var m = [];
        var self = this;

        async.series([
            function (seriesCallBack) {
                // Set all the pins high
                self.rows.forEach(function (pin) {
                    pin.high();
                });
                seriesCallBack();
            },
            function (seriesCallBack) {
                async.eachOfSeries(self.cols, function (colpin, ci, columnLoopCallback) {
                    // Iterate cols
                    async.series([
                        function (innerSeriesCallBack) {
                            colpin.output(0);
                            innerSeriesCallBack();
                        },
                        function (innerSeriesCallBack) {
                            // Iterate rows
                            async.eachOfSeries(self.rows, function (rowpin, ri, rowLoopCallback) {
                                rowpin.read(function (error, value) {
                                    if (!value) {
                                        m.push(self.layout[ri][ci]);
                                    }
                                    rowLoopCallback();
                                });
                            }, function (err) {
                                innerSeriesCallBack(err);
                            });
                        },
                        function (innerSeriesCallBack) {
                            colpin.high();
                            innerSeriesCallBack();
                        }
                    ], function (err) {
                        columnLoopCallback(err);
                    });
                }, function (err) {
                    seriesCallBack(err);
                });
            }
        ], function (err) {
            self.rowScanResults = m;
            callback();
        });
    },
    scanByCol: function (callback) {
        var m = [];
        var self = this;

        async.series([
            function (seriesCallBack) {
                // Set all the pins high
                self.cols.forEach(function (pin) {
                    pin.high();
                });
                seriesCallBack();
            },
            function (seriesCallBack) {
                async.eachOfSeries(self.rows, function (rowpin, ri, rowLoopCallback) {
                    // Iterate cols
                    async.series([
                        function (innerSeriesCallBack) {
                            rowpin.output(0);
                            innerSeriesCallBack();
                        },
                        function (innerSeriesCallBack) {
                            // Iterate rows
                            async.eachOfSeries(self.cols, function (colpin, ci, columnLoopCallback) {
                                colpin.read(function (error, value) {
                                    if (!value) {
                                        m.push(self.layout[ri][ci]);
                                    }
                                    columnLoopCallback();
                                });
                            }, function (err) {
                                innerSeriesCallBack(err);
                            });
                        },
                        function (innerSeriesCallBack) {
                            rowpin.high();
                            innerSeriesCallBack();
                        }
                    ], function (err) {
                        rowLoopCallback(err);
                    });
                }, function (err) {
                    seriesCallBack(err);
                });
            }
        ], function (err) {
            self.columnScanResults = m;
            callback();
        });
    }

    // scanByCol: function () {
    //     var m = [];
    //     var self = this;

    //     this.cols.forEach(function (pin) {
    //         pin.high();
    //     });

    //     this.rows.forEach(function (rowpin, ri) {
    //         rowpin.output(0);

    //         this.cols.forEach(function (colpin, ci) {
    //             colpin.read(function (error, value) {
    //                 if (!value) {
    //                     m.push(self.layout[ri][ci]);
    //                 }
    //             });
    //             //if(!colpin.read()) m.push(this.layout[ri][ci]);
    //         }, this);

    //         rowpin.high();
    //     }, this);

    //     return m;
    // }

}


module.exports = Keypad;
