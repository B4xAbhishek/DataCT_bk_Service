import { Document, Schema, Model, model, Mongoose } from "mongoose";
import { findJsonInJsonArray, addJson} from "../utils/helper";
import { config } from "../config/config";

export interface IRejectionReasons {
  REJ_REASON: string;
  createdAt?: Date;
}

export interface IRejectionReasonsModel extends IRejectionReasons, Document {}

export const RejectionReasonSchema: Schema = new Schema(
  {
    
    REJ_REASON: {type: String, unique:true, index: true},
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    usePushEach: true,
    bufferCommands: false,
    versionKey: false,
  }
);

RejectionReasonSchema.set("toObject", { virtuals: true });
RejectionReasonSchema.set("toJSON", { virtuals: true });

export const RejectionReasonsModel: Model<IRejectionReasonsModel> = model<IRejectionReasonsModel>(
  "RejectionReasons",
  RejectionReasonSchema,
  "REJECTION_REASONS"
);

var outcome = findJsonInJsonArray(config.dynamicModels, "REJECTION_REASONS", "name");
if (!outcome) {
  let obj: any = {};
  addJson(obj, "name", "REJECTION_REASONS");
  addJson(obj, "model", RejectionReasonsModel)
  config.dynamicModels.push(obj);
}

export var createRejReason = function (ReasonObjs: any, cb: Function) {
    RejectionReasonsModel.insertMany(ReasonObjs, {}, function (err, ReasonList) {
    cb(err, ReasonList);
  });
};

export var findByMachineId = function (machineId: string, cb: Function) {
    RejectionReasonsModel.findOne({ machineId }, function (err, BreakDown) {
    cb(err, BreakDown);
  });
};

export var findById = function (id: Schema.Types.ObjectId, cb: Function) {
    RejectionReasonsModel.findById(id).exec(function (err, BreakDown) {
    cb(err, BreakDown);
  });
};

export var getAllBreakDowns = function (cb: Function) {
    RejectionReasonsModel.find({}, {}, {}, function (err, BreakDownList) {
    cb(err, BreakDownList);
  });
};

export var findByReason = function (Breason: any, cb: Function) {
    RejectionReasonsModel.find({BREASON : Breason}, {}, {}, function (err, BreakDownList) {
    cb(err, BreakDownList);
  });
};

export var queryRejReason = function (
  query,
  projection: any,
  options: any,
  cb: Function
) {
    RejectionReasonsModel.find(
    query,
    projection,
    options,
    function (err, RreasonList) {
      cb(err, RreasonList);
    }
  );
};