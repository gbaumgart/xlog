define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    'xide/types',
    'xide/utils',
    'xide/factory',
    "dojo/node!winston",
    "dojo/node!winston-filerotatedate",
    "dojo/node!winston-loggly"
], function (declare, lang, types, utils, factory, winston) {
    return declare("xlog.Server", null, {

        fileLogger: null,
        loggly: null,
        delegate: null,
        publishLog: true,
        /***
         * Standard constructor for all subclassing bindings
         * @param {array} arguments
         */
        constructor: function (arguments) {

            //simple mixin of constructor arguments
            for (var prop in arguments) {
                if (arguments.hasOwnProperty(prop)) {

                    this[prop] = arguments[prop];
                }
            }
        },
        start: function (options) {

            if (options.fileLogger) {
                this.fileLogger = winston.add(winston.transports.File, options.fileLogger);
                if (this.publishLog) {

                    this.fileLogger.on('logging', function (transport, level, msg, meta) {


                        factory.publish(types.EVENTS.ON_SERVER_LOG_MESSAGE, {
                            /*transport:transport,*/
                            level: level,
                            message: msg,
                            data: meta,
                            time: new Date().getTime()
                        });
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