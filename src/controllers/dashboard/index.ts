import e, { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "../../models/models";
import { find } from "../../models/dynamicmodel";
import { CONSTANTS, MACHINE_STATUS } from "../../utils/constants";
import * as DynamicModels from "../../models/dynamicmodel";
import * as logger from "../../models/logs";

export async function getStatusCount(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var errors = req.validationErrors();
  let cardData: any = {};
  let total: number = 0;

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  const values = Object.values(MACHINE_STATUS);
  console.log("Values = ", values);

  for (let value of values) {
    let query = { machineStatus: value };
    let projection = {};
    let options = {};

    const data: any = await new Promise(function (resolve, reject) {
      return find(
        CONSTANTS.MACHINE_COLLECTION,
        query,
        projection,
        options,
        (err: any, response: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(response);
          }
        }
      );
    });

    cardData[value] = data.length;
    total = total + data.length;
  }

  cardData["TOTAL"] = total;

  req.apiStatus = {
    isSuccess: true,
    data: cardData,
  };

  next();
}

// export async function getcardsData(
//   req: Request | any,
//   res: Response,
//   next: NextFunction
// ) {
//   // console.log("running cardddddddddddddddddddd");
//   DynamicModels.distinct(
//     "machineInfo",
//     "machineCode",
//     async (err: any, machineList: any) => {
//       if (err) {
//         req.apiStatus = {
//           isSuccess: false,
//           error: ErrorCodes[1002],
//           data: "Falied to fetch Machine list",
//         };

//         next();
//         return;
//       }
//       var mStatus = {
//         RUNNING: 0,
//         IDLE: 0,
//         STOPPED: 0,
//         DISCONNECTED: 0,
//         TOTAL: 0,
//       };
//       if (machineList && machineList.length) {
//         var promises: any = [];
//         machineList.forEach((machine: any) => {
//           promises.push(machineStatusCount(machine));
//         });

//         Promise.all(promises)
//           .then((response: any) => {
//             logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");

//             if (response && response.length) {
//               response.forEach((item: any) => {
//                 if (item && item.status) {
//                   if (item.status == 0) {
//                     mStatus.RUNNING = mStatus.RUNNING + 1;
//                   } else if (item.status == 1) {
//                     mStatus.IDLE = mStatus.IDLE + 1;
//                   } else if (item.status == 2) {
//                     mStatus.STOPPED = mStatus.STOPPED + 1;
//                   } else if (item.status == 3) {
//                     mStatus.DISCONNECTED = mStatus.DISCONNECTED + 1;
//                   }
//                 } else {
//                   mStatus.DISCONNECTED = mStatus.DISCONNECTED + 1;
//                 }
//               });
//               mStatus.TOTAL = machineList.length;
//             }
//             // console.log("mStatus",mStatus);
//             req.apiStatus = {
//               isSuccess: true,
//               data: mStatus,
//             };
//             next();
//           })
//           .catch((error) => {
//             logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
//             req.apiStatus = {
//               isSuccess: false,
//               error: ErrorCodes[1002],
//               data: "Something went wrong!",
//             };
//             next();
//             return;
//           });

//       } else {
//         req.apiStatus = {
//           isSuccess: false,
//           error: ErrorCodes[1002],
//           data: "Machine list not found",
//         };
//         next();
//         return;
//       }
//     }
//   );

// }

// export async function getMachineData(
//   req: Request | any,
//   res: Response,
//   next: NextFunction
// ) {
//   console.log("start point :", new Date(Date.now()).getTime());
//   const startPoint = new Date(Date.now()).getTime();
//   let page = 1;
//   let limit = 50;
//   try {
//     if (req.query.page && parseInt(req.query.page) > 1) {
//       page = parseInt(req.query.page);
//     }

//     if (req.query.limit && parseInt(req.query.limit) > 0) {
//       limit = parseInt(req.query.limit);
//     }
//   } catch (err) {
//     console.log("invalid query params " + err);
//   }
//   const startIndex = (page - 1) * limit;
//   const endIndex = startIndex + limit;
//   DynamicModels.distinct(
//     "machineInfo",
//     "machineCode",
//     async (err: any, machineList: any) => {
//       if (err) {
//         req.apiStatus = {
//           isSuccess: false,
//           error: ErrorCodes[1002],
//           data: "Falied to fetch Machine list",
//         };

//         next();
//         return;
//       }
//       // machineList= ["IMM-01", "IMM-02", "IMM-03", "IMM-09","IMM-04"]

//       if (machineList && machineList.length) {
//         machineList.sort(); // sorting machine names
//         const slicedMachineList = machineList.slice(startIndex, endIndex);
//         console.log("start index");
//         if (slicedMachineList && !slicedMachineList.length) {
//           req.apiStatus = {
//             isSuccess: false,
//             error: ErrorCodes[1002],
//             data: "Machine list is empty",
//           };
//           next();
//           return;
//         }
//         var promises: any = [];
//         slicedMachineList.forEach((machine: any) => {
//           promises.push(latestData(machine));
//         });

//         Promise.all(promises)
//           .then((response: any) => {
//             logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
//             req.apiStatus = {
//               isSuccess: true,
//               data: {
//                 total: response.length,
//                 list: response,
//               },
//             };
//             console.log(
//               "Result: " + (new Date(Date.now()).getTime() - startPoint)
//             );

//             next();
//           })
//           .catch((error) => {
//             logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
//             req.apiStatus = {
//               isSuccess: false,
//               error: ErrorCodes[1002],
//               data: "Something went wrong!",
//             };
//             next();
//             return;
//           });
//       } else {
//         req.apiStatus = {
//           isSuccess: false,
//           error: ErrorCodes[1002],
//           data: "Machine list not found",
//         };
//         next();
//         return;
//       }
//     }
//   );
// }

const latestData = (machine: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await DynamicModels.find(
        "OEE_MOLD_OUT",
        { MACHINE_NAME: machine },
        {},
        { sort: { TIME_STAMP: -1 }, limit: 1 },
        (err: any, result: any) => {
          if (err) {
            console.log("Error in finding latest data for:", machine);
            // return { machine: machine, latestData: {} };
          } else {
            // return { machine: machine, latestData: {} };
          }
        }
      );

      ////aggregation/////
      // const data = await DynamicModels.aggregate(
      //   [{$lookup: {
      //     from: 'OEE_MOLD_OUT',
      //     as: 'combineOEE',
      //     'let': {
      //      temp1: '$MACHINE_ID'
      //     },
      //     pipeline: [
      //      {
      //       $match: {
      //        $expr: {
      //         $eq: [
      //          '$$temp1',
      //          '$MACHINE_NAME'
      //         ]
      //        }
      //       }
      //      },
      //      {
      //       $sort: {
      //        TIME_STAMP: -1
      //       }
      //      },
      //      {
      //       $project: {
      //        MACHINE_STATUS: '$MACHINE_STATUS'
      //       }
      //      }
      //     ]
      //    }}],
      //  (err:any,result2:any)=>{
      //    if(err){
      //      console.log("Error in finding latest data for:");
      //    }else{
      //      return result2
      //    }
      //  }
      // )

      /////////////

      let machineData = {};

      const result = await getMachine(machine);

      if (result && result.length) {
        const resultObj = JSON.parse(JSON.stringify(result));
        console.log("result machine name", resultObj);
        machineData["MACHINE_ID"] = resultObj[0].MACHINE_ID;
        machineData["MACHINE_LV"] = resultObj[0].MACHINE_LV;
      }

      const mData = {
        machine: machine,
        data: machineData,
        latestData: data && data.length ? data[0] : {},
        // latestData: data,
      };
      resolve(mData);
    } catch (error) {
      console.log("Promise Error:", error);

      const data = { machine: machine, latestData: {} };
      // const data = { machine: machine };

      resolve(data);
    }
  });
};

const getMachine = (machine: any) => {
  const machineList = DynamicModels.find(
    "MACHINE_LIST",
    { MACHINE_ID: machine },
    {},
    {},
    (err: any, result: any) => {
      if (err) {
        console.log("Error in finding machine list for:", machine);
        // return { machine: machine, latestData: {} };
      } else {
        // return { machine: machine, latestData: {} };
        // if(result && result.length) {
        //   const resultObj = JSON.parse(JSON.stringify(result));
        //   machineData["MACHINE_ID"]=resultObj[0].MACHINE_ID;
        //   machineData["MACHINE_DISPLAY"]=resultObj[0].MACHINE_DISPLAY;
        //   machineData["MACHINE_LV"]=resultObj[0].MACHINE_LV;
        //  // console.log(resultObj[0].MACHINE_NAME);
        // }
      }
    }
  );
  return machineList;
};

export async function getLatestDataByMachineName(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineName = req.params.id;
  if (!machineName) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Missing machineName info",
    };

    next();
    return;
  }
  let machineData = {};

  const result = await getMachine(machineName);
  if (result && result.length) {
    const resultObj = JSON.parse(JSON.stringify(result));
    machineData["MACHINE_ID"] = resultObj[0].MACHINE_ID;
    machineData["MACHINE_DISPLAY"] = resultObj[0].MACHINE_DISPLAY;
  }
  DynamicModels.find(
    "OEE_MOLD_OUT",
    { MACHINE_NAME: machineName },
    {},
    { sort: { TIME_STAMP: -1 }, limit: 1 },
    (err: any, result: any) => {
      if (err) {
        console.log("Error in finding latest data for:", machineName);
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: err,
        };
        next();
        return;
      } else {
        const oeeData = result && result.length ? result[0] : {};

        DynamicModels.find(
          "ENERGY",
          { MACHINE_NAME: machineName },
          {},
          { sort: { TIME_STAMP: -1 }, limit: 1 },
          (err: any, energyResult: any) => {
            if (err) {
              console.log("Error in finding latest data for:", machineName);
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: err,
              };
              next();
              return;
            } else {
              DynamicModels.find(
                "OEE_MOLD_OUT_INST",
                { MACHINE_NAME: machineName },
                {},
                { sort: { TIME_STAMP: -1 }, limit: 1 },
                (erroor, instData) => {
                  if (erroor) {
                    console.log(
                      "Error in finding instanteneous data for:",
                      machineName
                    );
                    req.apiStatus = {
                      isSuccess: false,
                      error: ErrorCodes[1002],
                      data: err,
                    };
                    next();
                    return;
                  }
                  const energyData =
                    energyResult && energyResult.length ? energyResult[0] : {};
                  const instaData =
                    instData && instData.length ? instData[0] : {};
                  const finalJson = JSON.parse(JSON.stringify(oeeData));
                  finalJson.energy = energyData;
                  finalJson.machineInfo = machineData;
                  finalJson.insta = instaData;
                  req.apiStatus = {
                    isSuccess: true,
                    data: { latestData: finalJson },
                  };
                  next();
                }
              );
            }
          }
        );
      }
    }
  );
}

export async function getPrevDataByMachineName(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineName = req.params.id;
  if (!machineName) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Missing machineName info",
    };

    next();
    return;
  }
  let machineData = {};

  const result = await getMachine(machineName);
  if (result && result.length) {
    const resultObj = JSON.parse(JSON.stringify(result));
    machineData["MACHINE_ID"] = resultObj[0].MACHINE_ID;
    machineData["MACHINE_DISPLAY"] = resultObj[0].MACHINE_DISPLAY;
  }
  DynamicModels.find(
    "OEE_MOLD_OUT",
    { MACHINE_NAME: machineName },
    {},
    { sort: { TIME_STAMP: -1 }, skip: 1, limit: 1 },
    (err: any, result: any) => {
      if (err) {
        console.log("Error in finding latest data for:", machineName);
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: err,
        };
        next();
        return;
      } else {
        const oeeData = result && result.length ? result[0] : {};

        const finalJson = JSON.parse(JSON.stringify(oeeData));
        finalJson.machineInfo = machineData;
        req.apiStatus = {
          isSuccess: true,
          data: { prevData: finalJson },
        };
        next();
      }
    }
  );
}

export async function getOverallPlantData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // let overData = {}
  const machineList = await DynamicModels.overallPlantData(
    "MACHINE_LIST",
    {},
    {},
    {},
    (err: any, result: any) => {
      console.log(result, "result");
      if (err || !result || result.length == 0) {
        console.log("Machine list not found");
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: err,
        };
        next();
        return;
      }
      let availability = 0;
      let oee = 0;
      let quality = 0;
      let performance = 0;

      let OEEcounter: number = 0;
      let QUALITYcounter: number = 0;
      let PERFORMANCEcounter: number = 0;
      let AVAILABILITYcounter: number = 0;
      result.forEach((e) => {
        if (e.OEE_MOLD_OUT && parseFloat(e.OEE_MOLD_OUT.OEE) > 10) {
          OEEcounter++;
          oee =
            oee +
            (e.OEE_MOLD_OUT && e.OEE_MOLD_OUT.OEE
              ? parseFloat(e.OEE_MOLD_OUT.OEE)
              : 0);
        }
        if (e.OEE_MOLD_OUT && parseFloat(e.OEE_MOLD_OUT.AVAILABILITY) > 10) {
          AVAILABILITYcounter++;
          availability =
            availability +
            (e.OEE_MOLD_OUT && e.OEE_MOLD_OUT.AVAILABILITY
              ? parseFloat(e.OEE_MOLD_OUT.AVAILABILITY)
              : 0);
        }
        if (e.OEE_MOLD_OUT && parseFloat(e.OEE_MOLD_OUT.PERFORMANCE) > 10) {
          PERFORMANCEcounter++;
          performance =
            performance +
            (e.OEE_MOLD_OUT && e.OEE_MOLD_OUT.PERFORMANCE
              ? parseFloat(e.OEE_MOLD_OUT.PERFORMANCE)
              : 0);
        }
        if (e.OEE_MOLD_OUT && parseFloat(e.OEE_MOLD_OUT.QUALITY) > 10) {
          QUALITYcounter++;
          quality =
            quality +
            (e.OEE_MOLD_OUT && e.OEE_MOLD_OUT.QUALITY
              ? parseFloat(e.OEE_MOLD_OUT.QUALITY)
              : 0);
        }
      });

      // console.log("oee, count", oee, count);
      if (OEEcounter == 0) {
        OEEcounter = 1;
      }
      if (QUALITYcounter == 0) {
        QUALITYcounter = 1;
      }
      if (PERFORMANCEcounter == 0) {
        PERFORMANCEcounter = 1;
      }
      if (AVAILABILITYcounter == 0) {
        AVAILABILITYcounter = 1;
      }
      console.log(OEEcounter, "count");

      let finalResult = {
        oee: oee / OEEcounter,
        quality: quality / QUALITYcounter,
        performance: performance / PERFORMANCEcounter,
        availability: availability / AVAILABILITYcounter,
      };

      // req.apiStatus = {
      //   isSuccess: true,
      //   data: finalResult,
      // };

      ////Merge api's
      DynamicModels.distinct(
        "machineInfo",
        "machineCode",
        async (err: any, machineList: any, cb: NextFunction) => {
          if (err) {
            req.apiStatus = {
              isSuccess: false,
              error: ErrorCodes[1002],
              data: "Falied to fetch Machine list",
            };

            next();
            return;
          }
          var mStatus = {
            RUNNING: 0,
            IDLE: 0,
            STOPPED: 0,
            DISCONNECTED: 0,
            TOTAL: 0,
          };
          if (machineList && machineList.length) {
            var promises: any = [];
            machineList.forEach((machine: any) => {
              promises.push(machineStatusCount(machine));
            });

            Promise.all(promises)
              .then((response: any) => {
                logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");

                if (response && response.length) {
                  response.forEach((item: any) => {
                    if (item && item.status) {
                      if (item.status == 0) {
                        mStatus.RUNNING = mStatus.RUNNING + 1;
                      } else if (item.status == 1) {
                        mStatus.IDLE = mStatus.IDLE + 1;
                      } else if (item.status == 2) {
                        mStatus.STOPPED = mStatus.STOPPED + 1;
                      } else if (item.status == 3) {
                        mStatus.DISCONNECTED = mStatus.DISCONNECTED + 1;
                      }
                    } else {
                      mStatus.DISCONNECTED = mStatus.DISCONNECTED + 1;
                    }
                  });
                  mStatus.TOTAL = machineList.length;
                }
                let cardData: any = {};
                let finalData: any = {};

                cardData = mStatus;
                console.log("finalResult", finalResult);

                finalData = finalResult;

                // req.apiStatus = {
                //   isSuccess: true,
                //   data: {cardData,finalData},
                // };

                //merging machineData api into here
                // const startPoint = new Date(Date.now()).getTime();
                // let page = 1;
                // let limit = 50;
                // try {
                //   if (req.query.page && parseInt(req.query.page) > 1) {
                //     page = parseInt(req.query.page);
                //   }

                //   if (req.query.limit && parseInt(req.query.limit) > 0) {
                //     limit = parseInt(req.query.limit);
                //   }
                // } catch (err) {
                //   console.log("invalid query params " + err);
                // }
                // const startIndex = (page - 1) * limit;
                // const endIndex = startIndex + limit;
                // DynamicModels.distinct(
                //   "machineInfo",
                //   "machineCode",
                //   async (err: any, machineList: any) => {
                //     if (err) {
                //       req.apiStatus = {
                //         isSuccess: false,
                //         error: ErrorCodes[1002],
                //         data: "Falied to fetch Machine list",
                //       };

                //       next();
                //       return;
                //     }
                //     // machineList= ["IMM-01", "IMM-02", "IMM-03", "IMM-09","IMM-04"]

                //     if (machineList && machineList.length) {
                //       machineList.sort(); // sorting machine names
                //       const slicedMachineList = machineList.slice(startIndex, endIndex);
                //       console.log("start index");
                //       if (slicedMachineList && !slicedMachineList.length) {
                //         req.apiStatus = {
                //           isSuccess: false,
                //           error: ErrorCodes[1002],
                //           data: "Machine list is empty",
                //         };
                //         next();
                //         return;
                //       }
                //       var promises: any = [];
                //       slicedMachineList.forEach((machine: any) => {
                //         promises.push(latestData(machine));
                //       });

                //       let length:any = {}
                //       let list:any = []

                //       Promise.all(promises)
                //         .then((response: any) => {
                //           logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");

                //          length=response.length
                //           list=response

                //           req.apiStatus = {
                //             isSuccess: true,
                //             data: {
                //               cardData,
                //               finalData,
                //               length,
                //               list
                //               // total: response.length,
                //               // list: response,

                //             },
                //           };
                //           console.log(
                //             "Result: " + (new Date(Date.now()).getTime() - startPoint)
                //           );

                //           next();
                //         })
                //         .catch((error) => {
                //           logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
                //           req.apiStatus = {
                //             isSuccess: false,
                //             error: ErrorCodes[1002],
                //             data: "Something went wrong!",
                //           };
                //           next();
                //           return;
                //         });
                //     } else {
                //       req.apiStatus = {
                //         isSuccess: false,
                //         error: ErrorCodes[1002],
                //         data: "Machine list not found",
                //       };
                //       next();
                //       return;
                //     }
                //   }
                // );

                //////
                /////New MachineStatus for dashboard//
                let list: any = [];
                DynamicModels.getMachineStatus(
                  "MACHINE_LIST",
                  {},
                  async (err: any, result: any) => {
                    if (err || !result) {
                      req.apiStatus = {
                        isSuccess: false,
                        error: ErrorCodes[1002],
                        data: err || "Machine data not found",
                      };
                      next();
                      return;
                    } else {
                      // console.log("listtttttttt",result.length);
                      let stoppedReason: any = [];
                      list = result;
                      if (list.length) {
                        let stoppedMachine: any = list.filter((li) => {
                          if (
                            li.latestData &&
                            li.latestData.MACHINE_STATUS == 2
                          ) {
                            return true;
                          } else {
                            return false;
                          }
                        });

                        // if (stoppedMachine.length / 2 >= 1) {
                        //   stoppedReason.push({
                        //     Reason: "Machine Breakdown",
                        //     machines: stoppedMachine.splice(
                        //       0,
                        //       stoppedMachine.length / 2
                        //     ),
                        //   });
                        // }
                        // if (stoppedMachine.length / 2 >= 1) {
                        //   stoppedReason.push({
                        //     Reason: "Mould Breakdown",
                        //     machines: stoppedMachine.splice(
                        //       0,
                        //       stoppedMachine.length / 2
                        //     ),
                        //   });
                        // }
                        // if (stoppedMachine.length / 2 >= 1) {
                        //   stoppedReason.push({
                        //     Reason: "Planned Downtime",
                        //     machines: stoppedMachine.splice(
                        //       0,
                        //       stoppedMachine.length / 2
                        //     ),
                        //   });
                        // }
                        // if (stoppedMachine.length >= 1) {
                        //   stoppedReason.push({
                        //     Reason: "Reason Unknown",
                        //     machines: stoppedMachine,
                        //   });
                        // }
                        let filterData: any = [];
                        for (let d in stoppedMachine) {
                          if (
                            stoppedMachine[d] &&
                            stoppedMachine[d].MACHINE_ID
                          ) {
                            filterData.push({
                              MACHINE_ID: stoppedMachine[d].MACHINE_ID,
                            });
                          }
                        }
                        let liveStoppedStatus: any =
                          await DynamicModels.findWithoutCB(
                            "LIVE_STOPPED_STATUS",
                            { $or: filterData },
                            {},
                            {}
                          );

                        let machineBeakdown: any = [];
                        let mouldBeakdown: any = [];
                        let mouldChange: any = [];
                        let plannedDowntime: any = [];
                        let reasonUnknown: any = [];
                        for (let d in stoppedMachine) {
                          let foundMachine: any = {};
                          for (let data of liveStoppedStatus) {
                            if (
                              data &&
                              Object.keys(data) &&
                              Object.keys(data).length &&
                              data.toJSON()["MACHINE_ID"] ==
                                stoppedMachine[d].MACHINE_ID
                            ) {
                              foundMachine = JSON.parse(
                                JSON.stringify(data.toJSON())
                              );
                              break;
                            }
                          }
                          console.log(foundMachine, "XXX");

                          if (
                            foundMachine &&
                            Object.keys(foundMachine) &&
                            foundMachine.MACHINE_BREAKDOWN
                          ) {
                            machineBeakdown.push({
                              ...stoppedMachine[d],
                              TIMESTAMP: foundMachine.FROM_TIME,
                              REASON: foundMachine.REASON,
                            });
                          } else if (
                            foundMachine &&
                            Object.keys(foundMachine) &&
                            foundMachine.MOULD_BREAKDOWN
                          ) {
                            mouldBeakdown.push({
                              ...stoppedMachine[d],
                              TIMESTAMP: foundMachine.FROM_TIME,
                              REASON: foundMachine.REASON,
                            });
                          } else if (
                            foundMachine &&
                            Object.keys(foundMachine) &&
                            foundMachine.MOULD_CHANGE
                          ) {
                            mouldChange.push({
                              ...stoppedMachine[d],
                              TIMESTAMP: foundMachine.FROM_TIME,
                              REASON: foundMachine.REASON,
                            });
                          } else if (
                            foundMachine &&
                            Object.keys(foundMachine) &&
                            foundMachine.PLANNED_DOWNTIME
                          ) {
                            plannedDowntime.push({
                              ...stoppedMachine[d],
                              TIMESTAMP: foundMachine.FROM_TIME,
                              REASON: foundMachine.REASON,
                            });
                          } else {
                            reasonUnknown.push({
                              ...stoppedMachine[d],
                              TIMESTAMP: null,
                              REASON: "",
                            });
                          }
                        }

                        if (machineBeakdown && machineBeakdown.length) {
                          stoppedReason.push({
                            Reason: "MACHINE BREAKDOWN",
                            machines: machineBeakdown,
                          });
                        }
                        if (mouldBeakdown && mouldBeakdown.length) {
                          stoppedReason.push({
                            Reason: "MOULD BREAKDOWN",
                            machines: mouldBeakdown,
                          });
                        }
                        if (mouldChange && mouldChange.length) {
                          stoppedReason.push({
                            Reason: "MOULD CHANGE",
                            machines: mouldChange,
                          });
                        }
                        if (plannedDowntime && plannedDowntime.length) {
                          stoppedReason.push({
                            Reason: "PLANNED DOWNTIME",
                            machines: plannedDowntime,
                          });
                        }
                        if (reasonUnknown && reasonUnknown.length) {
                          stoppedReason.push({
                            Reason: "REASON UNKNOWN",
                            machines: reasonUnknown,
                          });
                        }
                      }

                      req.apiStatus = {
                        isSuccess: true,
                        data: {
                          cardData,
                          finalData,
                          list,
                          stoppedReason,
                        },
                      };
                    }
                    next();
                  }
                );

                ///////////////////
                // next();
                return;
              })
              .catch((error) => {
                logger.error(
                  logger.LogModule.ROUTE,
                  "",
                  "Filter Error:" + error
                );
                req.apiStatus = {
                  isSuccess: false,
                  error: ErrorCodes[1002],
                  data: "Something went wrong!",
                };
                next();
                return;
              });
          } else {
            req.apiStatus = {
              isSuccess: false,
              error: ErrorCodes[1002],
              data: "Machine list not found",
            };
            next();
            return;
          }
        }
      );
      //////
      // next();
    }
  );

  ////

  // let machineName = req.params.id;
  // if (!machineName) {
  //   req.apiStatus = {
  //     isSuccess: false,
  //     error: ErrorCodes[1001],
  //     data: "Missing machineName info",
  //   };

  //   next();
  //   return;
  // }
  // let machineData = {};

  // const result = await getMachine(machineName);
  // if (result && result.length) {
  //   const resultObj = JSON.parse(JSON.stringify(result));
  //   machineData["MACHINE_ID"] = resultObj[0].MACHINE_ID;
  //   machineData["MACHINE_DISPLAY"] = resultObj[0].MACHINE_DISPLAY;
  // }
  // DynamicModels.find(
  //   "OEE_MOLD_OUT",
  //   { MACHINE_NAME: machineName },
  //   {},
  //   { sort: { TIME_STAMP: -1 }, skip: 1 ,limit: 1 },
  //   (err: any, result: any) => {
  //     if (err) {
  //       console.log("Error in finding latest data for:", machineName);
  //       req.apiStatus = {
  //         isSuccess: false,
  //         error: ErrorCodes[1002],
  //         data: err,
  //       };
  //       next();
  //       return;
  //     } else {
  //       const oeeData = result && result.length ? result[0] : {};

  //           const finalJson = JSON.parse(JSON.stringify(oeeData));
  //           finalJson.machineInfo = machineData
  //           req.apiStatus = {
  //             isSuccess: true,
  //             data: { prevData: finalJson },
  //           };
  //           next();
  //     }
  //   }
  // );
}

const machineStatusCount = (machine: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await DynamicModels.find(
        "OEE_MOLD_OUT",
        { MACHINE_NAME: machine },
        {},
        { sort: { TIME_STAMP: -1 }, limit: 1 },
        (err: any, result: any) => {
          if (err) {
            console.log("Error in finding latest data for:", machine);
            // return { machine: machine, latestData: {} };
          } else {
            // return { machine: machine, latestData: {} };
          }
        }
      );
      // console.log("data line 656",data);

      var machineData: any = data && data.length ? data[0] : "";
      // let machineData = data && Object.keys(data).length !=0 ? data[0]:null;
      machineData = JSON.parse(JSON.stringify(machineData));
      // console.log("machineDataaaaaaaaaaaaaaa",machineData);

      resolve({ machine: machine, status: machineData.MACHINE_STATUS });
    } catch (error) {
      console.log("Promise Error:", error);

      const data = { machine: machine, status: null };
      resolve(data);
    }
  });
};

export async function latestMachineData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("start point :", new Date(Date.now()).getTime());
  const startPoint = new Date(Date.now()).getTime();

  DynamicModels.find("latest_OEE", {}, {}, {}, (err: any, result: any) => {
    if (err || !result) {
      console.log("Failed to fetch latest oee data");
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: err || "latest_OEE data not found",
      };
      next();
      return;
    } else {
      req.apiStatus = {
        isSuccess: true,
        data: {
          total: result.length,
          list: result,
        },
      };
      console.log("Result: " + (new Date(Date.now()).getTime() - startPoint));
      next();
    }
  });
}

///separate API for

export async function machineStatusAgg(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  DynamicModels.getMachineStatus(
    "MACHINE_LIST",
    {},
    (err: any, result: any) => {
      if (err || !result) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: err || "Machine data not found",
        };
        next();
        return;
      } else {
        console.log("machineStatus length", result.length);

        req.apiStatus = {
          isSuccess: true,
          data: result,
        };
      }
      next();
    }
  );
}

////for only get machineID and machineName from collection called MACHINE_LIST
export async function getAllMachineData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let query: any = {};
  let projection: any = {};
  if (req.query.searchData == '' || req.query.searchData) {
    projection.MACHINE_DISPLAY = 1;
    projection.MACHINE_ID = 1;
  }
  
  if (req.query.searchData) {
    query['$or'] = [
      { MACHINE_INT: { $regex: req.query.searchData, $options: 'i' } },
      { MACHINE_ID: { $regex: req.query.searchData, $options: 'i' } },
      { MACHINE_NAME: { $regex: req.query.searchData, $options: 'i' } },
      { MACHINE_DISPLAY: { $regex: req.query.searchData, $options: 'i' } },
      { MACHINE_LV: { $regex: req.query.searchData, $options: 'i' } },
    ]
  }

  DynamicModels.find("MACHINE_LIST", query, projection, {}, (err: any, result: any) => {
    if (err || !result) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: err || "Data is not found",
      };
      next();
      return;
    } else {
      let result2: any = [];
      if (result && result.length) {
        result.forEach((i) => {
          // console.log("ii", i);
          result2.push({
            MACHINE_FULLNAME: i._doc.MACHINE_DISPLAY,
            MACHINE_NAME: i._doc.MACHINE_ID,
          });
        });
      }

      // const [MACHINE_ID,MACHINE_NAME] = result
      // console.log("machineID and MachineName",MACHINE_ID,MACHINE_NAME);
      req.apiStatus = {
        isSuccess: true,
        data: result2,
      };
    }
    next();
  });
}

export async function shiftDowntimeReasons(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineName = req.params.id;
  if (!machineName) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Missing machineName info",
    };

    next();
    return;
  } else {
    let startTime: any;
    let endTime: any;
    let shiftData: any = await DynamicModels.aggregate("MACHINE_LIST", [
      {
        $match: {
          MACHINE_ID: machineName,
        },
      },
      {
        $lookup: {
          from: "SHIFT_MAINTAINANCE",
          let: {
            temp1: "$MACHINE_ID",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$temp1", "$MACHINE_NAME"],
                },
              },
            },
          ],
          as: "SHIFT_MAINTAINANCE",
        },
      },
      {
        $unwind: {
          path: "$SHIFT_MAINTAINANCE",
        },
      },
      {
        $project: {
          SHIFT_MAINTAINANCE: 1,
        },
      },
      {
        $replaceRoot: {
          newRoot: "$SHIFT_MAINTAINANCE",
        },
      },
      {
        $project: {
          MACHINE_NAME: 0,
          TIME_STAMP: 0,
          _id: 0,
        },
      },
    ]);
    if (
      shiftData[0] &&
      Object.keys(shiftData[0]) &&
      Object.keys(shiftData[0]).length
    ) {
      shiftData = JSON.parse(JSON.stringify(shiftData[0]));
      Object.keys(shiftData).forEach((shift: any) => {
        shiftData[shift] = shiftData[shift].split(":");
        for (let x in shiftData[shift]) {
          shiftData[shift][x] = parseInt(shiftData[shift][x]);
        }
      });
      let todaysDate: any = new Date();
      let shiftName: any = null;
      let count: any = 1;
      while (
        shiftData[`SHIFT_${count}_START_TIME`] &&
        shiftData[`SHIFT_${count}_START_TIME`].length
      ) {
        let tempStartTime: any;
        let tempEndTime: any;
        if (
          shiftData[`SHIFT_${count}_START_TIME`][0] >
          shiftData[`SHIFT_${count}_END_TIME`][0]
        ) {
          if (
            todaysDate.getHours() > shiftData[`SHIFT_${count}_START_TIME`][0] &&
            todaysDate.getHours() < 24
          ) {
            tempStartTime = getDate(
              new Date().getDate(),
              shiftData[`SHIFT_${count}_START_TIME`][0] | 0,
              shiftData[`SHIFT_${count}_START_TIME`][1] | 0,
              0
            );
            tempEndTime = getDate(
              new Date().getDate() + 1,
              shiftData[`SHIFT_${count}_END_TIME`][0] | 0,
              shiftData[`SHIFT_${count}_END_TIME`][1] | 0,
              0
            );
          } else if (
            todaysDate.getHours() < shiftData[`SHIFT_${count}_END_TIME`][0] &&
            todaysDate.getHours() > 0
          ) {
            tempStartTime = getDate(
              new Date().getDate() - 1,
              shiftData[`SHIFT_${count}_START_TIME`][0] | 0,
              shiftData[`SHIFT_${count}_START_TIME`][1] | 0,
              0
            );
            tempEndTime = getDate(
              new Date().getDate(),
              shiftData[`SHIFT_${count}_END_TIME`][0] | 0,
              shiftData[`SHIFT_${count}_END_TIME`][1] | 0,
              0
            );
          }
        } else {
          tempStartTime = getDate(
            new Date().getDate(),
            shiftData[`SHIFT_${count}_START_TIME`][0] | 0,
            shiftData[`SHIFT_${count}_START_TIME`][1] | 0,
            0
          );
          tempEndTime = getDate(
            new Date().getDate(),
            shiftData[`SHIFT_${count}_END_TIME`][0] | 0,
            shiftData[`SHIFT_${count}_END_TIME`][1] | 0,
            0
          );
        }
        if (todaysDate > tempStartTime && todaysDate < tempEndTime) {
          shiftName = `SHIFT${count}`;
          startTime = tempStartTime;
          endTime = tempEndTime;
          break;
        }
        count++;
      }
      console.log(startTime, endTime);

      startTime = startTime.getTime();
      endTime = endTime.getTime();
      if (!(startTime > 0 && endTime > 0)) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: "Shift data not found",
        };
        next();
        return;
      }
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Shift data not found",
      };
      next();
      return;
    }
    let avgDetails: any = await DynamicModels.aggregate("MACHINE_LIST", [
      {
        $match: {
          MACHINE_ID: machineName,
        },
      },
      {
        $lookup: {
          from: "OEE_MOLD_OUT",
          let: {
            temp1: "$MACHINE_ID",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$temp1", "$MACHINE_NAME"],
                },
                TIME_STAMP: {
                  $gte: new Date(startTime),
                  $lte: new Date(endTime),
                },
              },
            },
            {
              $project: {
                AVAILABILITY: {
                  $toDouble: "$AVAILABILITY",
                },
                PERFORMANCE: {
                  $toDouble: "$PERFORMANCE",
                },
                QUALITY: {
                  $toDouble: "$QUALITY",
                },
              },
            },
            {
              $group: {
                _id: null,
                QUALITY: {
                  $sum: "$QUALITY",
                },
                PERFORMANCE: {
                  $sum: "$PERFORMANCE",
                },
                AVAILABILITY: {
                  $sum: "$AVAILABILITY",
                },
                count: {
                  $sum: 1,
                },
              },
            },
            {
              $project: {
                _id: 0,
                QUALITY: {
                  $divide: ["$QUALITY", "$count"],
                },
                PERFORMANCE: {
                  $divide: ["$PERFORMANCE", "$count"],
                },
                AVAILABILITY: {
                  $divide: ["$AVAILABILITY", "$count"],
                },
              },
            },
            {
              $project: {
                AVAILABILITY: {
                  $round: ["$AVAILABILITY", 2],
                },
                PERFORMANCE: {
                  $round: ["$PERFORMANCE", 2],
                },
                QUALITY: {
                  $round: ["$QUALITY", 2],
                },
              },
            },
          ],
          as: "OEE_MOLD_OUT",
        },
      },
      {
        $lookup: {
          from: "LIVE_STOPPED_STATUS",
          let: {
            temp1: "$MACHINE_ID",
          },
          pipeline: [
            // {
            //   $addFields: {
            //     FROM_TIME: {
            //       $substr: ["$FROM_TIME", 0, 34],
            //     },
            //   },
            // },
            // {
            //   $addFields: {
            //     FROM_TIME: {
            //       $toString: { $toDate: "$FROM_TIME" },
            //     },
            //   },
            // },
            {
              $match: {
                $expr: {
                  $eq: ["$$temp1", "$MACHINE_ID"],
                },
                // FROM_TIME: {
                //   $gte: new Date(startTime).toISOString(),
                //   $lte: new Date(endTime).toISOString(),
                // },
                TIMESTAMP: {
                  $gte: new Date(startTime).getTime(),
                  $lte: new Date(endTime).getTime(),
                },
                $or: [
                  {
                    MOULD_BREAKDOWN: true,
                  },
                  {
                    MACHINE_BREAKDOWN: true,
                  },
                  {
                    PLANNED_DOWNTIME: true,
                  },
                ],
              },
            },
            {
              $addFields: {
                TYPE: {
                  $cond: {
                    if: {
                      $eq: ["$MOULD_BREAKDOWN", true],
                    },
                    then: "MOULD BREAKDOWN",
                    else: {
                      $cond: {
                        if: {
                          $eq: ["$MACHINE_BREAKDOWN", true],
                        },
                        then: "MACHINE BREAKDOWN",
                        else: {
                          $cond: {
                            if: {
                              $eq: ["$PLANNED_DOWNTIME", true],
                            },
                            then: "PLANNED DOWNTIME",
                            else: null,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            {
              $addFields: {
                TIME_STAMP: "$TIMESTAMP",
              },
            },
            {
              $addFields: {
                ORIGIN: "LIVE_STOPPED_STATUS",
              },
            },
          ],
          as: "LIVE_STOPPED_STATUS",
        },
      },
      {
        $lookup: {
          from: "BREAKDOWN_ANALYSIS",
          let: {
            temp1: "$MACHINE_ID",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$temp1", "$MACHINE_ID"],
                },
                FROM_TIME: {
                  $gte: new Date(startTime).getTime(),
                  $lte: new Date(endTime).getTime(),
                },
                MATERIAL: null,
              },
            },
            {
              $addFields: {
                TYPE: "MACHINE BREAKDOWN",
              },
            },
          ],
          as: "MACHINE_BREAKDOWN",
        },
      },
      {
        $lookup: {
          from: "BREAKDOWN_ANALYSIS",
          let: {
            temp1: "$MACHINE_ID",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$temp1", "$MACHINE_ID"],
                },
                FROM_TIME: {
                  $gte: new Date(startTime).getTime(),
                  $lte: new Date(endTime).getTime(),
                },
                MATERIAL: {
                  $ne: null,
                },
              },
            },
            {
              $addFields: {
                TYPE: "MOULD BREAKDOWN",
              },
            },
          ],
          as: "MOULD_BREAKDOWN",
        },
      },
      // {
      //   $lookup: {
      //     from: "MACHINE_MATERIAL",
      //     let: {
      //       temp1: "$MACHINE_ID",
      //     },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $eq: ["$$temp1", "$MACHINE_ID"],
      //           },
      //           TIME_STAMP: {
      //             $gte: startTime,
      //             $lte: endTime,
      //           },
      //         },
      //       },
      //       {
      //         $addFields: {
      //           TYPE: "MACHINE MATERIAL",
      //           REASON: "$MATERIAL",
      //         },
      //       },
      //     ],
      //     as: "MACHINE_MATERIAL",
      //   },
      // },
      {
        $lookup: {
          from: "PLANNED_ANALYSIS",
          let: {
            temp1: "$MACHINE_ID",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$temp1", "$MACHINE_ID"],
                },
                FROM_TIME: {
                  $gte: new Date(startTime).getTime(),
                  $lte: new Date(endTime).getTime(),
                },
              },
            },
            {
              $addFields: {
                TYPE: "PLANNED DOWNTIME",
              },
            },
          ],
          as: "PLANNED_DOWNTIME",
        },
      },
      {
        $addFields: {
          DOWNTIME_REASONS: {
            $concatArrays: [
              "$LIVE_STOPPED_STATUS",
              "$MACHINE_BREAKDOWN",
              "$MOULD_BREAKDOWN",
              // "$MACHINE_MATERIAL",
              "$PLANNED_DOWNTIME",
            ],
          },
        },
      },
      {
        $unwind: {
          path: "$OEE_MOLD_OUT",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $unwind: {
          path: "$DOWNTIME_REASONS",
          preserveNullAndEmptyArrays: true,
        },
      },
      // {
      //   $sort: {
      //     "DOWNTIME_REASONS.TIME_STAMP": -1,
      //   },
      // },
      {
        $group: {
          _id: null,
          MACHINE_NAME: {
            $first: "$MACHINE_NAME",
          },
          MACHINE_ID: {
            $first: "$MACHINE_ID",
          },
          MACHINE_DISPLAY: {
            $first: "$MACHINE_DISPLAY",
          },
          OEE_MOLD_OUT: {
            $first: "$OEE_MOLD_OUT",
          },
          DOWNTIME_REASONS: {
            $push: "$DOWNTIME_REASONS",
          },
        },
      },
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    if (avgDetails) {
      console.log(startTime, endTime);
      console.log(avgDetails[0], "vg");

      let original: any = JSON.parse(JSON.stringify(avgDetails[0]));
      let liveData: any = avgDetails[0].DOWNTIME_REASONS.find((x) => {
        return x.ORIGIN == "LIVE_STOPPED_STATUS";
      });
      if (liveData && Object.keys(liveData)) {
        let tempVar: any = avgDetails[0].DOWNTIME_REASONS;
        let liveIndex: any = tempVar.indexOf(liveData);
        tempVar.splice(liveIndex, 1);
        let duplicate: any = tempVar.findIndex((x) => {
          return x.FROM_TIME == liveData.FROM_TIME;
        });
        if (duplicate != -1) {
          avgDetails[0].DOWNTIME_REASONS = tempVar;
        } else {
          avgDetails[0] = original;
        }
      }
      req.apiStatus = {
        isSuccess: true,
        data: avgDetails[0],
      };
      next();
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Data not found",
      };
      next();
      return;
    }
  }
}

function getDate(date, hour, min, sec) {
  let today: any = new Date();
  return new Date(
    new Date(
      new Date(new Date(new Date().setSeconds(sec)).setMinutes(min)).setHours(
        hour
      )
    ).setDate(date)
  );
}
