// import { Document, Schema, Model, model, Mongoose } from "mongoose";

// export enum MACHINE_STATUS {
//   RUNNING = "RUNNING",
//   IDLE = "IDLE",
//   STOPPED = "STOPPED",
//   DISCONNECTED = "DISCONNECTED"
// }

// export interface IMachineData {
//   name: string,
//   partName: string,
//   machineId: string,
//   planCount: number,
//   prodCount: number,
//   shotCount: number,
//   oee: number,
//   availability: number,
//   performance: number,
//   quality: number,
//   machineStatus: string,
//   stdCT: number,
//   actualCT: number,
//   createdAt: Date,
//   lastUpdatedAt: Date
// }

// export interface IMachineDataModel extends IMachineData, Document {}

// export const MachineDataSchema: Schema = new Schema(
//   {
//     name: {
//       type: String,
//       uppercase: true
//     },
//     partName: {
//       type: String,
//       uppercase: true
//     },
//     machineId: {
//       type: String,
//       lowercase: true,
//       index: true,
//       required: true
//     },
//     planCount: Number,
//     prodCount: Number,
//     shotCount: Number,
//     oee: Number,
//     availability: Number,
//     performance: Number,
//     quality: Number,
//     machineStatus: {
//       type: String,
//       enum: [MACHINE_STATUS.DISCONNECTED,MACHINE_STATUS.IDLE,MACHINE_STATUS.RUNNING,MACHINE_STATUS.STOPPED],
//       default: MACHINE_STATUS.DISCONNECTED,
//       index: true
//     },
//     stdCT: Number,
//     actualCT: Number,
//     createdAt: {
//       type: Date,
//       default: Date.now,
//       index: true
//     },
//     lastUpdatedAt: {
//       type: Date,
//       default: Date.now,
//       index: true   
//     }
//   },
//   {
//     usePushEach: true,
//     bufferCommands: false,
//     versionKey: false
//   }
// );

// MachineDataSchema.set("toObject", { virtuals: true });
// MachineDataSchema.set("toJSON", { virtuals: true });

// export const MachineDataModel: Model<IMachineDataModel> = model<IMachineDataModel>(
//   "machinedata",
//   MachineDataSchema
// );

// export var createMachineData = function (MachineDataObj: any, cb: Function) {
//   MachineDataModel.insertMany(
//     [MachineDataObj],
//     function (err, MachineData) {
//       cb(err, MachineData);
//     }
//   );
// };

// export var updateMachineDataById = function (
//   id: any,
//   MachineDataObj: any,
//   cb: Function
// ) {
//   MachineDataObj.lastUpdatedAt = Date.now();
//   MachineDataModel.updateOne(
//     { _id: id },
//     { $set: MachineDataObj },
//     { upsert: false },
//     function (err, result) {
//       if(result && result["nModified"] == 0){
//         err = "Data Not Updated";
//       }
//       cb(err);
//     }
//   );
// };

// export var deleteMachineData = (machineId: string,cb: Function) => {
//   MachineDataModel.deleteOne({ machineId: machineId }, (err: any) => {
//     cb(err);
//   });
// };

// export var findMachineData = (query,projection,options,cb: Function) => {
//   MachineDataModel.find(query, projection,options,(err: any,data: any) => {
//     cb(err,data)
//   });
// };

// export var getDocumentCount = function (query: any, cb: Function) {
//   MachineDataModel.countDocuments(query, function (err, response) {
//     cb(err, response);
//   });
// };