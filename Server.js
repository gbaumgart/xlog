define([
    "dcl/dcl",
    'xide/types',
    'xide/factory',
    "dojo/node!winston"
], function (dcl, types, factory, winston) {
    return dcl(null, {
        declaredClass:"xlog.Server",
        fileLogger: null,
        loggly: null,
        delegate: null,
        publishLog: true,
        loggers:{},
        /***
         * Standard constructor for all subclassing bindings
         * @param {array} arguments
         */
        constructor: function (args) {

            //simple mixin of constructor arguments
            for (var prop in arguments) {
                if (arguments.hasOwnProperty(prop)) {

                    this[prop] = args[prop];
                }
            }
        },
        createLogger:function(options){
            var logger = new (winston.Logger)({
                transports: [
                    new (winston.transports.File)(options)
                ]
            });

            if (this.publishLog) {

                logger.on('logging', function (transport, level, msg, meta) {
                    meta.logId = options.filename;
                    var args = {
                        level: level,
                        message: msg,
                        data: meta,
                        time: new Date().getTime()

                    };
                    factory.publish(types.EVENTS.ON_SERVER_LOG_MESSAGE,args);
                });
            }
            return logger;
        },
        start: function (options) {
            this.loggers = {};
            this.options = options;
            if (options.fileLogger) {
                this.fileLogger = winston.add(winston.transports.File, options.fileLogger);
                if (this.publishLog) {
                    this.fileLogger.on('logging', function (transport, level, msg, meta) {
                        var args = {
                            level: level,
                            message: msg,
                            data: meta,
                            time: new Date().getTime()
                        };
                        factory.publish(types.EVENTS.ON_SERVER_LOG_MESSAGE,args);
                    });
                }
            }

            if (options.loggly) {
                this.loggly = winston.add(winston.transports.Loggly, options.loggly);
            }
            if (options.console === null) {
                winston.remove(winston.transports.Console);
            }
        }
    });
});