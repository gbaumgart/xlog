define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    'xide/types',
    'xide/utils',
    'xide/factory',
    "dojo/node!winston"

], function (declare, lang, types, utils, factory, winston) {
    return declare("xlog.Server", null, {
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


            //console.error('create logger',options);

            var logger = new (winston.Logger)({
                transports: [
                    new (winston.transports.File)(options)
                    /*,
                        new (winston.transports.FileRotateDate)({
                    })*/
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
                    //console.log('publish server log message');
                    factory.publish(types.EVENTS.ON_SERVER_LOG_MESSAGE,args);
                });
            }
            //this.loggers[options.fileName] = logger;
            /*

            var logger = winston.add(winston.transports.File, options);

            this.loggers[options.fileName] = logger;


            */

            return logger;
        },
        start: function (options) {

            this.loggers = {};

            this.options = options;



            if (options.fileLogger) {

                //console.error('---',options.fileLogger);
                this.fileLogger = winston.add(winston.transports.File, options.fileLogger);

                if (this.publishLog) {

                    this.fileLogger.on('logging', function (transport, level, msg, meta) {

                        var args = {
                            level: level,
                            message: msg,
                            data: meta,
                            time: new Date().getTime()
                        };
                        //console.log('publish server log message');
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