import { Document, Schema, Model, model } from "mongoose";
// import { winstonLog } from "../config/winston";
import { findJsonInJsonArray, addJson} from "../utils/helper";
import { config } from "../config/config";

export const LOG_RETENTION_DURATION: number = 14; // In Days

//export const DEFAULT_LABEL: string = "GENERAL";
export const DEFAULT_MODULE: string = "GENERAL";

export enum LogModule {
  USER = "USER",
  AUTH = "AUTH",
  ROUTE = "ROUTE",
  CONTENT = "CONTENT"
}

export enum LogLevel {
  VERBOSE = "VERBOSE",
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARNING = "WARNING",
  ERROR = "ERROR"
}

export interface ILogging {
  module: string;
  level: LogLevel;
  transactionId: string;
  details: string;
  additionalInfo: string;
  createdAt?: Date;
}

export interface ILoggingModel extends ILogging, Document {}

var LoggingSchema: Schema = new Schema(
  {
    module: {
      type: String,
      index: true
    },
    level: {
      type: LogLevel,
      index: true
    },
    transactionId: String,
    details: String,
    additionalInfo: String,
    createdAt: {
      type: Date,
      default: Date.now,
      expires: LOG_RETENTION_DURATION * 60 * 60 * 24
    }
  },
  {
    usePushEach: true,
    bufferCommands: false,
    versionKey: false
  }
);

export const LoggingModel: Model<ILoggingModel> = model<ILoggingModel>(
  "logs",
  LoggingSchema
);

var outcome = findJsonInJsonArray(config.dynamicModels, "logs", "name");
if (!outcome) {
  let obj: any = {};
  addJson(obj, "name", "logs");
  addJson(obj, "model", LoggingModel)
  config.dynamicModels.push(obj);
}

export let log = function (
  module: string,
  level: LogLevel,
  txId: string | null,
  details: string,
  cb: Function
) {
  let log = new LoggingModel({ module, level, details, transactionId: txId });
  log.save(function (err, result) {
    cb(err, result);
  });
};

export let findByModule = function (
  module: string,
  limit: number,
  cb: Function
) {
  LoggingModel.find({ module: module }, function (err, result) {
    cb(err, result);
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export let findByLogLevel = function (
  level: LogLevel,
  limit: number,
  cb: Function
) {
  LoggingModel.find({ level: level }, function (err, result) {
    cb(err, result);
  })
    .sort({ createdAt: -1 })
    .limit(limit);
};

export let findByTransactionId = function (txId: string, cb: Function) {
  LoggingModel.find({ transactionId: txId }, function (err, result) {
    cb(err, result);
  }).sort({ createdAt: -1 });
};

export let findByModuleAndLogLevel = function (
  module: string[],
  level: LogLevel[],
  limit: number,
  cb: Function
) {
  LoggingModel.find(
    { module: { $in: module }, level: { $in: level } },
    function (err, result) {
      cb(err, result);
    }
  )
    .sort({ createdAt: -1 })
    .limit(limit);
};

export let verbose = function (
  module: string,
  txId: string | null,
  detail: string
) {
  console.log(module, LogLevel.VERBOSE, txId, detail);
  // log(module, LogLevel.VERBOSE, txId, detail, (err: any, result: any) => {});
  //  winstonLog(module, LogLevel.VERBOSE, txId, detail);
};

export let debug = function (
  module: string,
  txId: string | null,
  detail: string
) {
  console.log(module, LogLevel.DEBUG, txId, detail);
  // log(module, LogLevel.DEBUG, txId, detail, (err: any, result: any) => {});
  // winstonLog(module, LogLevel.DEBUG, txId, detail);
};

export let info = function (
  module: string,
  txId: string | null,
  detail: string
) {
  console.log(module, LogLevel.DEBUG, txId, detail);
  // log(module, LogLevel.INFO, txId, detail, (err: any, result: any) => {});
  // winstonLog(module, LogLevel.INFO, txId, detail);
};

export let warning = function (
  module: string,
  txId: string | null,
  detail: string
) {
  console.log(module, LogLevel.DEBUG, txId, detail);
  // log(module, LogLevel.WARNING, txId, detail, (err: any, result: any) => {});
  // winstonLog(module, LogLevel.WARNING, txId, detail);
};

export let error = function (
  module: string,
  txId: string | null,
  detail: string
) {
  console.log(module, LogLevel.DEBUG, txId, detail);
  log(module, LogLevel.ERROR, txId, detail, (err: any, result: any) => {});
  // winstonLog(module, LogLevel.ERROR, txId, detail);
};

export let warn = warning;