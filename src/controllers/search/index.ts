import { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "../../models/models";
import * as logger from "../../models/logs";
import {
  countersBreakdown,
  countersEnergy,
  countersOEE,
  countersPlannedAnalysis,
  countersRejection,
  countersRejectionMoldlWise,
  search,
  searchDataForGraph,
  searchDataForStackedGraph,
  searchGraphForMouldChange,
  searchGraphForCounterChange,
  searchGraphForplannedAnalysis,
  searchGraphForRejectionAnalysis,
} from "../operations/search";
import { formArray } from "../operations/common";
import { getDocumentCount } from "../../models/dynamicmodel";
import * as Dynamicmodel from "../../models/dynamicmodel";
import moment from "moment";
moment().format();
import * as _ from "lodash";
import { getCollectionObject } from "../../seed/getmodel";
import mongoose = require("mongoose");
import { createPdf } from "../generate";
import { LOADIPHLPAPI } from "dns";
const Schema = mongoose.Schema;
export let schema = new Schema({}, { strict: false, versionKey: false });

export async function searchData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = req.params.collectionName;
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;

  // console.log(
  //   "page, limit",
  //   page,
  //   limit,
  //   typeof sort,
  //   sort,
  //   direction,
  //   searchString
  // );

  // // console.log("request", JSON.stringify(request));

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  let result: any = [];
  let result2: any = {};

  result = await Dynamicmodel.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }

  const promises: any = [];

  conditionArray.map((element) => {
    promises.push(
      search(
        collectionName,
        element,
        page,
        limit,
        sort,
        direction,
        searchString
      )
    );
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      let reportValues: any;
      if (response && response[0] && response[0]["tableData"]) {
        reportValues = response[0]["tableData"];
        let tempExcelTable: any = [];
        reportValues.forEach((element) => {
          if (element["MACHINE_NAME"]) {
            element["MACHINE_NAME"] = result2[element["MACHINE_NAME"]];
          } else {
            element["MACHINE_ID"] = result2[element["MACHINE_ID"]];
          }
          let temp = {};
          temp = { ...element };
          temp["FROM_DATE"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[0]
              ? element["FROM_TIME"].split(", ")[0]
              : "";
          temp["FROM_TIME"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[1]
              ? element["FROM_TIME"].split(", ")[1]
              : "";
          temp["TO_DATE"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[0]
              ? element["TO_TIME"].split(", ")[0]
              : "";
          temp["TO_TIME"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[1]
              ? element["TO_TIME"].split(", ")[1]
              : "";
          temp["TIME_STAMP_DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["TIME_STAMP_TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          tempExcelTable.push(temp);
        });
        // console.log("tabledataaa",tempExcelTable);
        // console.log("result222222", result2);

        // tempExcelTable.forEach(async (item, i) => {
        //   //  console.log("itemmmmm",item);

        //   // item.machineName = result2[item.machineName]
        //   item["MACHINE_ID"] = result2[item["MACHINE_ID"]];
        //   if (i == tempExcelTable.length - 1)
        //     console.log("item", tempExcelTable);
        // });
        console.log("tableExcelTable", tempExcelTable);

        response[0]["tableData"] = tempExcelTable;
        req.apiStatus = {
          isSuccess: true,
          data: response,
        };
        next();
        // console.log("after req.apiStatus",req.apiStatus.data[0].tableData);
      } else {
        req.apiStatus = {
          isSuccess: true,
          data: [{ tableData: [] }],
        };
        next();
      }
    })
    .catch((error) => {
      logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getGraphData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("here...");

  var request: JSON = req.body;
  let collectionName = req.params.collectionName;
  console.log("collectionname", collectionName);

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  let count: number = await getDocumentCount(
    collectionName,
    {},
    (err, response) => {
      if (err) {
        return 0;
      } else {
        // console.log("res.......",response);

        return response;
      }
    }
  );

  const promises: any = [];
  conditionArray.map((element) => {
    // console.log("Element in conditionArray", element);

    promises.push(searchDataForGraph(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      formArray("totalCount", count, response);
      // console.log("Response Data", response);

      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      next();
    })
    .catch((error) => {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getGraphForBreakDown(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = req.params.collectionName;

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(searchDataForStackedGraph(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      // formArray("totalCount", count, response);
      req.apiStatus = {
        isSuccess: true,
        // message: "API SEARCH SUCCESS",
        // timestamp: new Date(),
        // responseTime: new Date().getTime() - new Date(req.startTime).getTime(),
        data: response,
      };
      next();
    })
    .catch((error) => {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getGraphForPlannedAnalysis(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = req.params.collectionName;

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(searchGraphForplannedAnalysis(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      next();
    })
    .catch((error) => {
      // console.log("Graph Error" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getGraphForRejectionAnalysis(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = req.params.collectionName;

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(searchGraphForRejectionAnalysis(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      next();
    })
    .catch((error) => {
      // console.log("Graph Error" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getGraphForMould(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("line 404", req.body.conditions[0].parameters[0]);

  var request: JSON = req.body;
  let collectionName = req.params.collectionName;
  // console.log("collectionName", req.body);

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];
  // console.log("conditionArray", conditionArray);

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];

  conditionArray.map((element) => {
    promises.push(searchGraphForMouldChange(collectionName, element));
  });

  Promise.all(promises)

    .then((response: any) => {
      // console.log("response 430", response);
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      // if (req.apiStatus.data[0].flowData[0].data[4].FROM_TIME) {
      // }
      // console.log(
      //   "req233432",
      //   req.apiStatus.data[0].flowData[0].data[4].FROM_TIME
      // );
      // console.log(
      //   "req233432",
      //   req.apiStatus.data[0].flowData[0].data[4].TO_TIME
      // );

      next();
    })
    .catch((error) => {
      // console.log("Graph Error" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

// =============== couter methods ===========
export async function getCounters(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "OEE_MOLD_OUT";

  // // console.log("request", JSON.stringify(request));

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersOEE(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      // formArray("totalCount", count, response);
      req.apiStatus = {
        isSuccess: true,
        // message: "API SEARCH SUCCESS",
        // timestamp: new Date(),
        // responseTime: new Date().getTime() - new Date(req.startTime).getTime(),
        data: response,
      };
      next();
    })
    .catch((error) => {
      logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getCountersForBreakdown(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "BREAKDOWN_ANALYSIS";

  // // console.log("request", JSON.stringify(request));

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersBreakdown(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      // formArray("totalCount", count, response);
      req.apiStatus = {
        isSuccess: true,
        // message: "API SEARCH SUCCESS",
        // timestamp: new Date(),
        // responseTime: new Date().getTime() - new Date(req.startTime).getTime(),
        data: response,
      };
      next();
    })
    .catch((error) => {
      logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getCountersForPlanned(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "PLANNED_ANALYSIS";

  // // console.log("request", JSON.stringify(request));

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersPlannedAnalysis(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      next();
    })
    .catch((error) => {
      logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getCountersForEnergy(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;

  let collectionName = "ENERGY";

  // console.log("request", JSON.stringify(request));

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersEnergy(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      // console.log("responseeee", response);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      // console.log("dataaa", req.apiStatus.data);

      next();
    })
    .catch((error) => {
      logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getCountersForRejection(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("entered")
  var request: JSON = req.body;
  let collectionName = "REJECTION_ANALYSIS";

  // // console.log("request", JSON.stringify(request));

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersRejection(collectionName, element));
    promises.push(countersRejectionMoldlWise(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      req.apiStatus = {
        isSuccess: true,
        data: response,
      };
      next();
    })
    .catch((error) => {
      logger.error(logger.LogModule.ROUTE, "", "Filter Error:" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function getCountersForMould(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("counters mould", req.body);

  var request: JSON = req.body;
  let collectionName = "MACHINE_MATERIAL";

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  if (!conditionArray) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };

    next();
    return;
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(searchGraphForCounterChange(collectionName, element));
  });

  Promise.all(promises)
    .then((response: any) => {
      // console.log("line 773");

      // logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
      // let final: any = {};
      // let dur = 0;
      // final["durationSum"] = 0;
      // final["count"] = 0;

      // console.log("response in promises", response);

      if (response && response[0] && response[0]["flowData"]) {
        // response[0]["flowData"].forEach((res) => {
        //   res["data"].forEach((data) => {
        //     console.log("Response data",data);

        //     dur =
        //       data && data["DURATION"] && parseInt(data["DURATION"])
        //         ? parseInt(data["DURATION"])
        //         : 0;
        //     final["count"] = final["count"] + 1;
        //     final["durationSum"] = final["durationSum"] + dur;
        //     dur = 0;
        //   });
        // });

        // if (final["count"] == 0) {
        //   final["avgDuration"] = 0;
        // } else {
        //   final["avgDuration"] = final["durationSum"] / final["count"];
        //   final["avgDuration"] = final["avgDuration"].toFixed(2);
        // }
        //  console.log("FinalResult",final);

        req.apiStatus = {
          isSuccess: true,
          data: response,
        };
        // console.log("req.apiStatus", req.apiStatus.data);

        next();
      } else {
        req.apiStatus = {
          isSuccess: true,
          data: response,
        };
        next();
      }
    })
    .catch((error) => {
      // console.log("Graph Error" + error);
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Something went wrong!",
      };
      // exitPoint(req, res)
      next();
      return;
    });
}

export async function machineHoldingsData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineId: any = req.params.id;

  const dateRange: any = new Date().getTime() - 7 * 24 * 60 * 60 * 1000; // past 7 days data

  var query = {
    MACHINE_ID: machineId,
    TIME_STAMP: { $gte: dateRange },
  };

  var breakdownAnalysis: any = [];
  var rejectionAnalysis: any = [];
  var downtimeAnalysis: any = [];

  Dynamicmodel.machineBreakdownData(
    "BREAKDOWN_ANALYSIS",
    query,
    {},
    {},
    (err, breakdownList) => {
      if (err) {
        breakdownList = [];
        // console.log("Error: ", err);
      }

      if (breakdownList && breakdownList.length) {
        var reasonArray: any = [];
        var totalBreakdown: any = 0;
        breakdownList.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));
          reasonArray.push({ reason: card._id, occurance: card.count });
          totalBreakdown = totalBreakdown + card.count;
        });

        var sortedArray = _.sortBy(reasonArray, "occurance");

        if (sortedArray && sortedArray.length > 4) {
          var slicedArray = sortedArray.slice(
            Math.max(sortedArray.length - 4, 0)
          );
        } else {
          slicedArray = sortedArray;
        }

        if (slicedArray && slicedArray.length) {
          slicedArray.forEach((item: any) => {
            breakdownAnalysis.push({
              reason: item.reason,
              percentage: (item.occurance * 100) / totalBreakdown,
            });
          });
        }
      } else {
        // console.log("No data for breakdownAnalysis");
      }

      Dynamicmodel.distinct(
        "REJECTION_REASONS",
        "REASON",
        (err, reasonList) => {
          if (err) {
            // console.log("Error:", err);

            reasonList = [];
          }

          Dynamicmodel.find(
            "REJECTION_ANALYSIS",
            query,
            {},
            {},
            (err, rejectionList) => {
              if (err) {
                // console.log("Error:", err);
                rejectionList = [];
              }
              if (reasonList && reasonList.length) {
                if (rejectionList && rejectionList.length) {
                  var rejReasonObj: any = {};
                  var rejReasonArray: any = [];
                  var totalRejction: number = 0;
                  rejectionList.forEach((card: any) => {
                    card = JSON.parse(JSON.stringify(card));
                    reasonList.forEach((reason: any) => {
                      if (card[reason] && card[reason] != "0") {
                        if (rejReasonObj[reason]) {
                          rejReasonObj[reason].count =
                            rejReasonObj[reason].count + 1;
                        } else {
                          rejReasonObj[reason] = {
                            reason: reason,
                            count: 1,
                          };
                        }
                      }
                    });
                  });

                  Object.keys(rejReasonObj).forEach((k) => {
                    rejReasonArray.push({
                      reason: rejReasonObj[k].reason,
                      count: rejReasonObj[k].count,
                    });
                    totalRejction = totalRejction + rejReasonObj[k].count;
                  });

                  var sortedRejArray = _.sortBy(rejReasonArray, "count");

                  if (sortedRejArray && sortedRejArray.length > 4) {
                    var slicedRejArray = sortedRejArray.slice(
                      Math.max(sortedRejArray.length - 4, 0)
                    );
                  } else {
                    slicedRejArray = sortedRejArray;
                  }

                  if (slicedRejArray && slicedRejArray.length) {
                    slicedRejArray.forEach((item: any) => {
                      rejectionAnalysis.push({
                        reason: item.reason,
                        percentage: (item.count * 100) / totalRejction,
                      });
                    });
                  }
                } else {
                  // console.log("No data for rejectionAnalysis");
                }
              } else {
                // console.log("No reason list");
              }

              req.apiStatus = {
                isSuccess: true,
                data: {
                  breakdownAnalysis: breakdownAnalysis,
                  rejectionAnalysis: rejectionAnalysis,
                },
              };
              // exitPoint(req, res)
              next();
            }
          );
        }
      );
    }
  );
}

export async function machineAverageData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let collectionName: any = req.params.collectionName;
  let startTime: any = req.body.startTime;
  let timeMode = "hours";
  let machineMode = "multi";
  let pdf: any = req.query.pdf;

  let y: any = startTime / (1000 * 60 * 60 * 24);
  let today: any = y.toFixed() * 1000 * 60 * 60 * 24;
  let tomorrow: any = today + 1000 * 60 * 60 * 24;

  let endTime: any = tomorrow;

  if (req.body.endTime) {
    endTime = req.body.endTime;
  }

  if (endTime - startTime >= 24 * 60 * 60 * 1000) {
    timeMode = "days";
  }
  let temp: any = [];
  let machines: any = [];

  let result: any = [];

  let result2: any = {};

  result = await Dynamicmodel.findWithoutCB("MACHINE_LIST", {}, {}, {});

  if (result && result.length) {
    //  console.log("JSON foramt", )

    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);

      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }
  // console.log("machines",machines);
  temp = await getCollectionObject(
    "MACHINE_LIST",
    Dynamicmodel.schema
  ).aggregate([
    {
      $sort: {
        MACHINE_ID: 1,
      },
    },
    {
      $group: {
        _id: null,
        MACHINE: {
          // $push: "$MACHINE_ID",
          $push: "$MACHINE_DISPLAY",
        },
      },
    },
  ]);

  if (req.body.machines && req.body.machines.length) {
    machines = req.body.machines;
  } else {
    if (temp && temp[0] && temp[0]["MACHINE"] && temp[0]["MACHINE"].length) {
      machines = temp[0]["MACHINE"];
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Machine list not fond",
      };
      next();
      return;
    }
  }

  if (machines.length == 1) {
    machineMode = "single";
  }

  let finalData = {};
  let finalDataLessThan10 = {};
  let groupId = {};
  let projectTime = {};
  let variable = "$OEE";

  if (collectionName == "ENERGY") {
    variable = "$WH";
  }

  if (timeMode == "hours") {
    groupId = {
      y: {
        $year: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      m: {
        $month: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      d: {
        $dayOfMonth: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      h: {
        $hour: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
    };
    projectTime = {
      $dateToString: {
        date: "$TIME_STAMP",
        format: "%H",
        timezone: "+05:30",
      },
    };
  } else {
    projectTime = {
      $dateToString: {
        date: "$TIME_STAMP",
        format: "%d-%m-%Y",
        timezone: "+05:30",
      },
    };
    groupId = {
      y: {
        $year: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      m: {
        $month: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      d: {
        $dayOfMonth: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      // shift: "$SHIFT",
      // y: {
      //   $year: { date: "$TIME_STAMP" },
      // },
      // m: {
      //   $month: { date: "$TIME_STAMP" },
      // },
      // d: {
      //   $dayOfMonth: { date: "$TIME_STAMP" },
      // },
    };
  }

  if (collectionName == "ENERGY") {
    // console.log("ENERGY");

    if (machineMode == "single") {
      // console.log("I am here in single data");
      // console.log("time filter", {$gte: new Date(startTime),
      // $lt: new Date(endTime)});

      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
            WH: {
              $ne: "0.000000",
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            // avg: {
            //   $avg: {
            //     $toDouble: variable,
            //   },
            // },
            max: {
              $first: { $toDouble: variable },
            },
            min: {
              $last: { $toDouble: variable },
            },
          },
        },
        {
          $project: {
            // avg: {
            //   $round: ["$avg", 2],
            // },
            Energy: {
              $subtract: ["$max", "$min"],
            },
            time: projectTime,
          },
        },
        {
          $project: {
            time: 1,
            Energy: {
              $round: ["$Energy", 2],
            },
            // Energy: "$Energy",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$Energy",
            },
          },
        },
      ]);
    } else {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            WH: {
              $ne: "0.000000",
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: "$MACHINE_NAME",
            MACHINE_NAME: {
              $first: "$MACHINE_NAME",
            },
            // avg: {
            //   $avg: {
            //     $toDouble: variable,
            //   },
            // },
            max: {
              $first: { $toDouble: variable },
            },
            min: {
              $last: { $toDouble: variable },
            },
          },
        },
        {
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },

        {
          $match: {
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $project: {
            // avg: {
            //   $round: ["$avg", 2],
            // },
            Energy: {
              $subtract: ["$max", "$min"],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $project: {
            MACHINE_NAME: 1,
            Energy: {
              $round: ["$Energy", 2],
            },
            fullName: 1,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$fullName",
            },
            Y: {
              $push: "$Energy",
            },
          },
        },
      ]);
    }
  } else {
    if (machineMode == "single") {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $addFields: {
            OEE: {
              $toDouble: "$OEE",
            },
          },
        },
        {
          $match: {
            OEE: {
              $gt: 10,
            },
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            avg: {
              $avg: {
                $toDouble: variable,
              },
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            time: projectTime,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);
      finalDataLessThan10 = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $addFields: {
            OEE: {
              $toDouble: "$OEE",
            },
          },
        },
        {
          $match: {
            OEE: {
              $lte: 10,
            },
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            avg: {
              $avg: {
                $toDouble: variable,
              },
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            time: projectTime,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);
    } else {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $addFields: {
            OEE: {
              $toDouble: "$OEE",
            },
          },
        },
        {
          $match: {
            OEE: {
              $gt: 10,
            },
          },
        },
        {
          $group: {
            _id: "$MACHINE_NAME",
            MACHINE_NAME: {
              $first: "$MACHINE_NAME",
            },
            avg: {
              $avg: {
                $toDouble: variable,
              },
            },
          },
        },
        {
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },
        {
          $match: {
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$fullName",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);

      finalDataLessThan10 = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $addFields: {
            OEE: {
              $toDouble: "$OEE",
            },
          },
        },
        {
          $match: {
            OEE: {
              $lte: 10,
            },
          },
        },
        {
          $group: {
            _id: "$MACHINE_NAME",
            MACHINE_NAME: {
              $first: "$MACHINE_NAME",
            },
            avg: {
              $avg: {
                $toDouble: variable,
              },
            },
          },
        },
        {
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },
        {
          $match: {
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$fullName",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);
    }
  }

  let responseData: any = {};
  console.log("coll", collectionName);
  if (collectionName == "OEE_MOLD_OUT") {
    responseData["layout"] = {
      yaxis: {
        title: {
          text: "Avg OEE",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
      showlegend: false,
      barmode: "stack",
      xaxis: {
        title: {
          text:
            machineMode == "single"
              ? timeMode == "hours"
                ? "Time(hours)"
                : "Days"
              : "Machines",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
    };
  } else {
    responseData["layout"] = {
      yaxis: {
        title: {
          text: "Energy",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
      showlegend: false,
      barmode: "stack",
      xaxis: {
        title: {
          text:
            machineMode == "single"
              ? timeMode == "hours"
                ? "Time(hours)"
                : "Days"
              : "Machines",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
    };
  }

  // console.log("finalData",finalData);

  // return

  // let sumofoee:any=0;

  // finalData[0]["Y"].forEach((i)=>{
  //   sumofoee+= finalData[0]["Y"][i]
  // })
  // console.log("ss", finalData[0]["Y"]);
  let mergedData = JSON.parse(JSON.stringify(finalData));
  if (collectionName == "OEE_MOLD_OUT") {
    let counter: any = 0;
    let machineCountNot: any = 0;
    console.log(finalData[0]["Y"]);

    // Merged data for OEE > 10 and OEE < 10
    

    if (finalDataLessThan10 && finalDataLessThan10[0] && finalDataLessThan10[0]["X"] && finalDataLessThan10[0]["Y"]) {
      let allKeys:any = new Array();
      allKeys.push(...finalData[0]["X"], ...finalDataLessThan10[0]["X"])
      allKeys = new Set(allKeys);
      allKeys = Array.from(allKeys).sort();
      // console.log(allKeys, allKeys.size)
      // allKeys=allKeys.sort();

      mergedData[0]["X"] = [];
      mergedData[0]["Y"] = [];

      for (let itr=0; itr<allKeys.length; itr++) {
        let key = allKeys[itr];
        // console.log(key)
        mergedData[0]["X"].push(key);
        if (finalData[0]["X"].indexOf(key) > -1 ) {
          mergedData[0]["Y"].push(finalData[0]["Y"][finalData[0]["X"].indexOf(key)])
        } else if (finalDataLessThan10[0]["X"].indexOf(key) > -1 ) {
          mergedData[0]["Y"].push(finalDataLessThan10[0]["Y"][finalDataLessThan10[0]["X"].indexOf(key)])
        }

      }
    }
    // console.log(mergedData)
    let avgVal: any = mergedData[0]["Y"].reduce((a: any, b: any) => {
      counter = counter + 1;
      if (counter == 1) {
        if (parseFloat(a) < 10) {
          a = 0;
          machineCountNot++;
        }
      }
      if (parseFloat(b) < 10) {
        b = 0;
        machineCountNot++;
      }
      return parseFloat(a) + parseFloat(b);
    });
    responseData["avgGraphData"] = [
      {
        type: "bar",
        x: [""],
        y: [avgVal / mergedData[0]["Y"].length],
        text: [
          `${(avgVal / (mergedData[0]["Y"].length - machineCountNot)).toFixed(
            2
          )}`,
        ],
        textposition: "auto",
        hoverinfo: "none",
      },
    ];
    responseData["avgGraphLayout"] = [
      {
        yaxis: {
          title: {
            text: "Avg OEE",
            font: {
              size: 18,
              color: "#7f7f7f",
            },
          },
        },
        showlegend: false,
        barmode: "stack",
        xaxis: {
          title: {
            text: "All Machines",
            font: {
              size: 18,
              color: "#7f7f7f",
            },
          },
        },
      },
    ];
  }

  if (finalData && finalData[0] && finalData[0]["X"] && finalData[0]["Y"]) {
    // console.log(" finalData[0][y]",  finalData[0]["Y"]);

    responseData["graphData"] = [
      {
        type: "bar",
        x: mergedData[0]["X"],
        y: mergedData[0]["Y"],
        text: mergedData[0]["Y"].map(String),
        textposition: "auto",
        hoverinfo: "none",
      },
    ];
  } else {
    responseData["graphData"] = [
      {
        type: "bar",
        x: [],
        y: [],
      },
    ];
  }
  // console.log("test1");
  // console.log("Temp",temp);

  if (pdf == "true") {
    // console.log("test2");
    responseData["flowData"] = responseData["layout"];
    let infoData: any = {};
    infoData["startTime"] = startTime;
    infoData["endTime"] = endTime;
    let a: any = [];

    machines.forEach((i) => {
      a.push(result2[i]);
    });

    infoData["machines"] = a;

    // infoData["machines"] = machines;
    if (collectionName == "ENERGY") {
      infoData["type"] = "ENERGY";
    } else {
      infoData["type"] = "OEE";
    }
    if (temp[0].MACHINE.length == machines.length) {
      infoData["machines"] = ["All SELECTED"];
    }

    responseData["infoData"] = infoData;
    // console.log("infoDataResponse", infoData);

    createPdf("avgDataGraph", responseData, (err, pdfData) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: "pdf gen failed",
        };
        next();
        return;
      }
      req.apiStatus = {
        isSuccess: true,
        data: pdfData,
      };
      next();
    });
  } else {
    // console.log("responseData",responseData);
    req.apiStatus = {
      isSuccess: true,
      data: responseData,
    };
    next();
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

function getDateOld(old, date, hour, min, sec) {
  let today: any = new Date();
  return new Date(
    new Date(
      new Date(
        new Date(new Date(old).setSeconds(sec)).setMinutes(min)
      ).setHours(hour)
    ).setDate(date)
  );
}

export async function singleMachineData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let startTime: any;
  let endTime: any;
  if (req.query.live && Boolean(req.query.live) == true) {
    let shiftData: any = await Dynamicmodel.aggregate("MACHINE_LIST", [
      {
        $match: {
          MACHINE_DISPLAY: req.body.machineName,
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

    // if (
    //   shiftData[0] &&
    //   Object.keys(shiftData[0]) &&
    //   Object.keys(shiftData[0]).length
    // ) {
    //   shiftData = JSON.parse(JSON.stringify(shiftData[0]));
    //   Object.keys(shiftData).forEach((shift: any) => {
    //     shiftData[shift] =
    //       (parseInt(shiftData[shift].split(":")[0]) | 0) +
    //       ((parseInt(shiftData[shift].split(":")[1]) / 60) | 0);
    //   });

    //   let todaysDate: any = new Date();
    //   let hours: any = todaysDate.getHours() + todaysDate.getMinutes() / 60;
    //   let shiftName: any = null;
    //   if (
    //     hours >= shiftData["SHIFT_1_START_TIME"] &&
    //     hours < shiftData["SHIFT_1_END_TIME"]
    //   ) {
    //     shiftName = "SHIFT1";
    //     startTime = getTodaysDate(
    //       parseInt(shiftData["SHIFT_1_START_TIME"]),
    //       (parseFloat(shiftData["SHIFT_1_START_TIME"]) -
    //         parseInt(shiftData["SHIFT_1_START_TIME"])) *
    //         60,
    //       0
    //     );
    //     endTime = getTodaysDate(
    //       parseInt(shiftData["SHIFT_1_END_TIME"]),
    //       (parseFloat(shiftData["SHIFT_1_END_TIME"]) -
    //         parseInt(shiftData["SHIFT_1_END_TIME"])) *
    //         60,
    //       0
    //     );
    //   } else if (
    //     hours >= shiftData["SHIFT_2_START_TIME"] &&
    //     hours < shiftData["SHIFT_2_END_TIME"]
    //   ) {
    //     shiftName = "SHIFT2";
    //     startTime = getTodaysDate(
    //       parseInt(shiftData["SHIFT_2_START_TIME"]),
    //       (parseFloat(shiftData["SHIFT_2_START_TIME"]) -
    //         parseInt(shiftData["SHIFT_2_START_TIME"])) *
    //         60,
    //       0
    //     );
    //     endTime = getTodaysDate(
    //       parseInt(shiftData["SHIFT_2_END_TIME"]),
    //       (parseFloat(shiftData["SHIFT_2_END_TIME"]) -
    //         parseInt(shiftData["SHIFT_2_END_TIME"])) *
    //         60,
    //       0
    //     );
    //   } else if (
    //     (hours >= shiftData["SHIFT_3_START_TIME"] && hours < 24) ||
    //     (hours < shiftData["SHIFT_3_END_TIME"] && hours >= 0)
    //   ) {
    //     shiftName = "SHIFT3";
    //     startTime = getTodaysDate(
    //       parseInt(shiftData["SHIFT_3_START_TIME"]),
    //       (parseFloat(shiftData["SHIFT_3_START_TIME"]) -
    //         parseInt(shiftData["SHIFT_3_START_TIME"])) *
    //         60,
    //       0
    //     );
    //     let temp: any = getTodaysDate(
    //       parseInt(shiftData["SHIFT_3_END_TIME"]),
    //       (parseFloat(shiftData["SHIFT_3_END_TIME"]) -
    //         parseInt(shiftData["SHIFT_3_END_TIME"])) *
    //         60,
    //       0
    //     );
    //     endTime = new Date(temp.setDate(temp.getDate() + 1));
    //   }
    //   console.log(shiftName, startTime, endTime);
    //   startTime = startTime.getTime();
    //   endTime = endTime.getTime();
    //   console.log(shiftName, startTime, endTime);
    // } else {
    //   req.apiStatus = {
    //     isSuccess: false,
    //     error: ErrorCodes[1002],
    //     data: "Shift data not found",
    //   };
    //   next();
    //   return;
    // }

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

      // if (
      //   todaysDate >= getDate(shiftData["SHIFT_1_START_TIME"][0]|0,shiftData["SHIFT_1_START_TIME"][1]|0,0) &&
      //   todaysDate < shiftData["SHIFT_1_END_TIME"]
      // ) {
      //   shiftName = "SHIFT1";
      //   startTime = getDate(
      //     parseInt(shiftData["SHIFT_1_START_TIME"]),
      //     (parseFloat(shiftData["SHIFT_1_START_TIME"]) -
      //       parseInt(shiftData["SHIFT_1_START_TIME"])) *
      //       60,
      //     0
      //   );
      //   endTime = getTodaysDate(
      //     parseInt(shiftData["SHIFT_1_END_TIME"]),
      //     (parseFloat(shiftData["SHIFT_1_END_TIME"]) -
      //       parseInt(shiftData["SHIFT_1_END_TIME"])) *
      //       60,
      //     0
      //   );
      // } else if (
      //   hours >= shiftData["SHIFT_2_START_TIME"] &&
      //   hours < shiftData["SHIFT_2_END_TIME"]
      // ) {
      //   shiftName = "SHIFT2";
      //   startTime = getTodaysDate(
      //     parseInt(shiftData["SHIFT_2_START_TIME"]),
      //     (parseFloat(shiftData["SHIFT_2_START_TIME"]) -
      //       parseInt(shiftData["SHIFT_2_START_TIME"])) *
      //       60,
      //     0
      //   );
      //   endTime = getTodaysDate(
      //     parseInt(shiftData["SHIFT_2_END_TIME"]),
      //     (parseFloat(shiftData["SHIFT_2_END_TIME"]) -
      //       parseInt(shiftData["SHIFT_2_END_TIME"])) *
      //       60,
      //     0
      //   );
      // } else if (
      //   (hours >= shiftData["SHIFT_3_START_TIME"] && hours < 24) ||
      //   (hours < shiftData["SHIFT_3_END_TIME"] && hours >= 0)
      // ) {
      //   shiftName = "SHIFT3";
      //   startTime = getTodaysDate(
      //     parseInt(shiftData["SHIFT_3_START_TIME"]),
      //     (parseFloat(shiftData["SHIFT_3_START_TIME"]) -
      //       parseInt(shiftData["SHIFT_3_START_TIME"])) *
      //       60,
      //     0
      //   );
      //   let temp: any = getTodaysDate(
      //     parseInt(shiftData["SHIFT_3_END_TIME"]),
      //     (parseFloat(shiftData["SHIFT_3_END_TIME"]) -
      //       parseInt(shiftData["SHIFT_3_END_TIME"])) *
      //       60,
      //     0
      //   );
      //   endTime = new Date(temp.setDate(temp.getDate() + 1));
      // }
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
  } else {
    startTime = req.body.startTime;

    let y: any = startTime / (1000 * 60 * 60 * 24);
    let today: any = y.toFixed() * 1000 * 60 * 60 * 24;
    let tomorrow: any = today + 1000 * 60 * 60 * 24;

    endTime = tomorrow;

    if (req.body.endTime) {
      endTime = req.body.endTime;
    }
  }

  let aggr: any = [
    {
      $match: {
        MACHINE_DISPLAY: req.body.machineName,
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
                $sum: {
                  $cond: [{ $gt: ["$QUALITY", 10] }, "$QUALITY", 0],
                },
              },
              PERFORMANCE: {
                $sum: {
                  $cond: [{ $gt: ["$PERFORMANCE", 10] }, "$PERFORMANCE", 0],
                },
              },
              AVAILABILITY: {
                $sum: {
                  $cond: [{ $gt: ["$AVAILABILITY", 10] }, "$AVAILABILITY", 0],
                },
              },
              QUALITYcount: {
                $sum: {
                  $cond: [{ $gt: ["$QUALITY", 10] }, 1, 0],
                },
              },
              PERFORMANCEcount: {
                $sum: {
                  $cond: [{ $gt: ["$PERFORMANCE", 10] }, 1, 0],
                },
              },
              AVAILABILITYcount: {
                $sum: {
                  $cond: [{ $gt: ["$AVAILABILITY", 10] }, 1, 0],
                },
              },
            },
          },
          {
            $project: {
              _id: 0,
              QUALITY: 1,
              PERFORMANCE: 1,
              AVAILABILITY: 1,
              QUALITYcount: {
                $cond: [{ $eq: ["$QUALITYcount", 0] }, 1, "$QUALITYcount"],
              },
              PERFORMANCEcount: {
                $cond: [
                  { $eq: ["$PERFORMANCEcount", 0] },
                  1,
                  "$PERFORMANCEcount",
                ],
              },
              AVAILABILITYcount: {
                $cond: [
                  { $eq: ["$AVAILABILITYcount", 0] },
                  1,
                  "$AVAILABILITYcount",
                ],
              },
            },
          },
          {
            $project: {
              _id: 0,
              QUALITY: {
                $divide: ["$QUALITY", "$QUALITYcount"],
              },
              PERFORMANCE: {
                $divide: ["$PERFORMANCE", "$PERFORMANCEcount"],
              },
              AVAILABILITY: {
                $divide: ["$AVAILABILITY", "$AVAILABILITYcount"],
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
  ];

  let avgDetails: any = await Dynamicmodel.aggregate("MACHINE_LIST", aggr);

  console.log(JSON.stringify(aggr));

  // console.log(
  //   "fff",
  //   JSON.stringify([
  //     {
  //       $match: {
  //         MACHINE_DISPLAY: req.body.machineName,
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "OEE_MOLD_OUT",
  //         let: {
  //           temp1: "$MACHINE_ID",
  //         },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $eq: ["$$temp1", "$MACHINE_NAME"],
  //               },
  //               TIME_STAMP: {
  //                 $gte: new Date(startTime),
  //                 $lte: new Date(endTime),
  //               },
  //             },
  //           },
  //           {
  //             $project: {
  //               AVAILABILITY: {
  //                 $toDouble: "$AVAILABILITY",
  //               },
  //               PERFORMANCE: {
  //                 $toDouble: "$PERFORMANCE",
  //               },
  //               QUALITY: {
  //                 $toDouble: "$QUALITY",
  //               },
  //             },
  //           },
  //           {
  //             $group: {
  //               _id: null,
  //               QUALITY: {
  //                 $sum: "$QUALITY",
  //               },
  //               PERFORMANCE: {
  //                 $sum: "$PERFORMANCE",
  //               },
  //               AVAILABILITY: {
  //                 $sum: "$AVAILABILITY",
  //               },
  //               count: {
  //                 $sum: 1,
  //               },
  //             },
  //           },
  //           {
  //             $project: {
  //               _id: 0,
  //               QUALITY: {
  //                 $divide: ["$QUALITY", "$count"],
  //               },
  //               PERFORMANCE: {
  //                 $divide: ["$PERFORMANCE", "$count"],
  //               },
  //               AVAILABILITY: {
  //                 $divide: ["$AVAILABILITY", "$count"],
  //               },
  //             },
  //           },
  //           {
  //             $project: {
  //               AVAILABILITY: {
  //                 $round: ["$AVAILABILITY", 2],
  //               },
  //               PERFORMANCE: {
  //                 $round: ["$PERFORMANCE", 2],
  //               },
  //               QUALITY: {
  //                 $round: ["$QUALITY", 2],
  //               },
  //             },
  //           },
  //         ],
  //         as: "OEE_MOLD_OUT",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "LIVE_STOPPED_STATUS",
  //         let: {
  //           temp1: "$MACHINE_ID",
  //         },
  //         pipeline: [
  //           {
  //             $addFields: {
  //               FROM_TIME: {
  //                 $substr: ["$FROM_TIME", 0, 34],
  //               },
  //             },
  //           },
  //           {
  //             $addFields: {
  //               FROM_TIME: {
  //                 $toString: { $toDate: "$FROM_TIME" },
  //               },
  //             },
  //           },
  //           {
  //             $match: {
  //               $expr: {
  //                 $eq: ["$$temp1", "$MACHINE_ID"],
  //               },
  //               FROM_TIME: {
  //                 $gte: new Date(startTime).toISOString(),
  //                 $lte: new Date(endTime).toISOString(),
  //               },
  //               $or: [
  //                 {
  //                   MOULD_BREAKDOWN: true,
  //                 },
  //                 {
  //                   MACHINE_BREAKDOWN: true,
  //                 },
  //                 {
  //                   PLANNED_DOWNTIME: true,
  //                 },
  //               ],
  //             },
  //           },
  //           {
  //             $addFields: {
  //               TYPE: {
  //                 $cond: {
  //                   if: {
  //                     $eq: ["$MOULD_BREAKDOWN", true],
  //                   },
  //                   then: "MOULD BREAKDOWN",
  //                   else: {
  //                     $cond: {
  //                       if: {
  //                         $eq: ["$MACHINE_BREAKDOWN", true],
  //                       },
  //                       then: "MACHINE BREAKDOWN",
  //                       else: {
  //                         $cond: {
  //                           if: {
  //                             $eq: ["$PLANNED_DOWNTIME", true],
  //                           },
  //                           then: "PLANNED DOWNTIME",
  //                           else: null,
  //                         },
  //                       },
  //                     },
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //           {
  //             $addFields: {
  //               TIME_STAMP: "$TIMESTAMP",
  //             },
  //           },
  //         ],
  //         as: "LIVE_STOPPED_STATUS",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "BREAKDOWN_ANALYSIS",
  //         let: {
  //           temp1: "$MACHINE_ID",
  //         },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $eq: ["$$temp1", "$MACHINE_ID"],
  //               },
  //               TIME_STAMP: {
  //                 $gte: startTime,
  //                 $lte: endTime,
  //               },
  //               MATERIAL: null,
  //             },
  //           },
  //           {
  //             $addFields: {
  //               TYPE: "MACHINE BREAKDOWN",
  //             },
  //           },
  //         ],
  //         as: "MACHINE_BREAKDOWN",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "BREAKDOWN_ANALYSIS",
  //         let: {
  //           temp1: "$MACHINE_ID",
  //         },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $eq: ["$$temp1", "$MACHINE_ID"],
  //               },
  //               TIME_STAMP: {
  //                 $gte: startTime,
  //                 $lte: endTime,
  //               },
  //               MATERIAL: {
  //                 $ne: null,
  //               },
  //             },
  //           },
  //           {
  //             $addFields: {
  //               TYPE: "MOULD BREAKDOWN",
  //             },
  //           },
  //         ],
  //         as: "MOULD_BREAKDOWN",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "MACHINE_MATERIAL",
  //         let: {
  //           temp1: "$MACHINE_ID",
  //         },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $eq: ["$$temp1", "$MACHINE_ID"],
  //               },
  //               TIME_STAMP: {
  //                 $gte: startTime,
  //                 $lte: endTime,
  //               },
  //             },
  //           },
  //           {
  //             $addFields: {
  //               TYPE: "MACHINE MATERIAL",
  //               REASON: "$MATERIAL",
  //             },
  //           },
  //         ],
  //         as: "MACHINE_MATERIAL",
  //       },
  //     },
  //     {
  //       $lookup: {
  //         from: "PLANNED_ANALYSIS",
  //         let: {
  //           temp1: "$MACHINE_ID",
  //         },
  //         pipeline: [
  //           {
  //             $match: {
  //               $expr: {
  //                 $eq: ["$$temp1", "$MACHINE_ID"],
  //               },
  //               TIME_STAMP: {
  //                 $gte: startTime,
  //                 $lte: endTime,
  //               },
  //             },
  //           },
  //           {
  //             $addFields: {
  //               TYPE: "PLANNED DOWNTIME",
  //             },
  //           },
  //         ],
  //         as: "PLANNED_DOWNTIME",
  //       },
  //     },

  //     {
  //       $addFields: {
  //         DOWNTIME_REASONS: {
  //           $concatArrays: [
  //             "$LIVE_STOPPED_STATUS",
  //             "$MACHINE_BREAKDOWN",
  //             "$MOULD_BREAKDOWN",
  //             "$MACHINE_MATERIAL",
  //             "$PLANNED_DOWNTIME",
  //           ],
  //         },
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: "$OEE_MOLD_OUT",
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     {
  //       $unwind: {
  //         path: "$DOWNTIME_REASONS",
  //         preserveNullAndEmptyArrays: true,
  //       },
  //     },
  //     // {
  //     //   $sort: {
  //     //     "DOWNTIME_REASONS.TIME_STAMP": -1,
  //     //   },
  //     // },
  //     {
  //       $group: {
  //         _id: null,
  //         MACHINE_NAME: {
  //           $first: "$MACHINE_NAME",
  //         },
  //         MACHINE_ID: {
  //           $first: "$MACHINE_ID",
  //         },
  //         MACHINE_DISPLAY: {
  //           $first: "$MACHINE_DISPLAY",
  //         },
  //         OEE_MOLD_OUT: {
  //           $first: "$OEE_MOLD_OUT",
  //         },
  //         DOWNTIME_REASONS: {
  //           $push: "$DOWNTIME_REASONS",
  //         },
  //       },
  //     },
  //     {
  //       $project: {
  //         _id: 0,
  //       },
  //     },
  //   ])
  // );

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

////adding function for calculating averageData for OEE separate API
export async function machineAverageDataOee(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let collectionName: any = req.params.collectionName;
  let startTime: any = req.body.startTime;
  let timeMode = "hours";
  let machineMode = "multi";
  let pdf: any = req.query.pdf;

  let y: any = startTime / (1000 * 60 * 60 * 24);
  let today: any = y.toFixed() * 1000 * 60 * 60 * 24;
  let tomorrow: any = today + 1000 * 60 * 60 * 24;

  let endTime: any = tomorrow;

  if (req.body.endTime) {
    endTime = req.body.endTime;
  }

  if (endTime - startTime >= 24 * 60 * 60 * 1000) {
    timeMode = "days";
  }
  let temp: any = [];
  let machines: any = [];
  // console.log("machines",machines);

  if (req.body.machines && req.body.machines.length) {
    machines = req.body.machines;
  } else {
    temp = await getCollectionObject(
      "MACHINE_LIST",
      Dynamicmodel.schema
    ).aggregate([
      {
        $sort: {
          MACHINE_ID: 1,
        },
      },
      {
        $group: {
          _id: null,
          MACHINE: {
            // $push: "$MACHINE_ID",
            $push: "$MACHINE_DISPLAY",
          },
        },
      },
    ]);
    // console.log("Temp",temp[0].MACHINE.length);

    if (temp && temp[0] && temp[0]["MACHINE"] && temp[0]["MACHINE"].length) {
      machines = temp[0]["MACHINE"];
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Machine list not fond",
      };
      next();
      return;
    }
  }

  if (machines.length == 1) {
    machineMode = "single";
  }

  let finalData = {};
  let groupId = {};
  let projectTime = {};
  let variable = "$OEE";

  if (collectionName == "ENERGY") {
    variable = "$WH";
  }

  if (timeMode == "hours") {
    groupId = {
      y: {
        $year: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      m: {
        $month: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      d: {
        $dayOfMonth: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      h: {
        $hour: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
    };
    projectTime = {
      $dateToString: {
        date: "$TIME_STAMP",
        format: "%H",
        timezone: "+05:30",
      },
    };
  } else {
    projectTime = {
      $dateToString: {
        date: "$TIME_STAMP",
        format: "%d-%m-%Y",
        timezone: "+05:30",
      },
    };
    groupId = {
      y: {
        $year: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      m: {
        $month: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      d: {
        $dayOfMonth: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
    };
  }

  if (collectionName == "ENERGY") {
    // console.log("ENERGY");

    if (machineMode == "single") {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
            WH: {
              $ne: "0.000000",
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            // avg: {
            //   $avg: {
            //     $toDouble: variable,
            //   },
            // },
            max: {
              $first: { $toDouble: variable },
            },
            min: {
              $last: { $toDouble: variable },
            },
          },
        },
        {
          $project: {
            // avg: {
            //   $round: ["$avg", 2],
            // },
            Energy: {
              $subtract: ["$max", "$min"],
            },
            time: projectTime,
          },
        },
        {
          $project: {
            time: 1,
            Energy: {
              $round: ["$Energy", 2],
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$Energy",
            },
          },
        },
      ]);
    } else {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            WH: {
              $ne: "0.000000",
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: "$MACHINE_NAME",
            MACHINE_NAME: {
              $first: "$MACHINE_NAME",
            },
            // avg: {
            //   $avg: {
            //     $toDouble: variable,
            //   },
            // },
            max: {
              $first: { $toDouble: variable },
            },
            min: {
              $last: { $toDouble: variable },
            },
          },
        },
        {
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },

        {
          $match: {
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $project: {
            // avg: {
            //   $round: ["$avg", 2],
            // },
            Energy: {
              $subtract: ["$max", "$min"],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $project: {
            MACHINE_NAME: 1,
            Energy: {
              $round: ["$Energy", 2],
            },
            fullName: 1,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$fullName",
            },
            Y: {
              $push: "$Energy",
            },
          },
        },
      ]);
    }
  } else {
    if (machineMode == "single") {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $addFields: {
            OEE: {
              $toDecimal: "$OEE",
            },
          },
        },
        {
          $match: {
            OEE: {
              $gt: 10,
            },
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            avg: {
              $avg: {
                $toDouble: variable,
              },
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            time: projectTime,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);
    } else {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
          },
        },

        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $addFields: {
            OEE: {
              $toDecimal: "$OEE",
            },
          },
        },
        {
          $match: {
            OEE: {
              $gt: 10,
            },
          },
        },

        {
          $group: {
            // _id: null,
            _id: '$MACHINE_NAME',
            MACHINE_NAME: {
                $first: '$MACHINE_NAME'
              },
            count: {
              $sum: 1,
            },
            avg: {
              $avg: {
                $toDouble: "$OEE",
              },
            },
          },
        },{
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },
        {
          $match: {
            "fullName.MACHINE_DISPLAY": {
              $in: machines,
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            avg: {"$avg" : "$avg"},
          },
        },
        
      ]);
    }
  }

  // console.log("Chetan -FinalData",finalData,machines);

  let totalMachineData: any = {};
  let responseData: any = {};

  responseData["layout"] = {
    // barmode: "stack",
    yaxis: {
      title: {
        text: collectionName == "ENERGY" ? "Energy" : "Avg OEE",
        font: {
          size: 18,
          color: "#7f7f7f",
        },
      },
    },
    showlegend: false,
    barmode: "stack",
    xaxis: {
      title: {
        text:
          machineMode == "single"
            ? timeMode == "hours"
              ? "Time(hours)"
              : "Days"
            : "Machines",
        font: {
          size: 18,
          color: "#7f7f7f",
        },
      },
    },
  };

  // totalMachineData = finalData[0].X.length
  // console.log("total length",totalMachineData);
  // console.log("finaldata.....", finalData);

  if (finalData && finalData[0] && finalData[0]["avg"]) {
    responseData["graphData"] = [
      {
        type: "bar",
        x: ["All Machines"],
        y: [finalData[0]["avg"].toFixed(2)],
        text: [finalData[0]["avg"].toFixed(2)],
        textposition: "auto",
        hoverinfo: "none",
      },
    ];
  } else {
    responseData["graphData"] = [
      {
        type: "bar",
        x: [],
        y: [],
      },
    ];
  }
  // console.log("test1");

  if (pdf == "true") {
    // console.log("test2");
    responseData["flowData"] = responseData["layout"];
    let infoData: any = {};
    infoData["startTime"] = startTime;
    infoData["endTime"] = endTime;
    infoData["machines"] = machines;
    if (collectionName == "ENERGY") {
      infoData["type"] = "ENERGY";
    } else {
      infoData["type"] = "OEE";
    }
    // console.log("Temp.length",temp.length,machines.length);

    if (temp[0].MACHINE.length == machines.length) {
      infoData["machines"] = ["All SELECTED"];
    }

    responseData["infoData"] = infoData;
    // console.log("infoDataResponse", infoData);

    createPdf("avgDataGraph", responseData, (err, pdfData) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: "pdf gen failed",
        };
        next();
        return;
      }
      req.apiStatus = {
        isSuccess: true,
        data: pdfData,
      };
      next();
    });
  } else {
    // console.log("responseData",responseData);
    req.apiStatus = {
      isSuccess: true,
      data: responseData,
    };
    next();
  }
}

export async function machineTotalEnergyData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let collectionName: any = req.params.collectionName;
  let startTime: any = req.body.startTime;
  let timeMode = "hours";
  let machineMode = "multi";
  let pdf: any = req.query.pdf;

  let y: any = startTime / (1000 * 60 * 60 * 24);
  let today: any = y.toFixed() * 1000 * 60 * 60 * 24;
  let tomorrow: any = today + 1000 * 60 * 60 * 24;

  let endTime: any = tomorrow;

  if (req.body.endTime) {
    endTime = req.body.endTime;
  }

  if (endTime - startTime >= 24 * 60 * 60 * 1000) {
    timeMode = "days";
  }
  let temp: any = [];
  let machines: any = [];

  let result: any = [];

  let result2: any = {};

  result = await Dynamicmodel.findWithoutCB("MACHINE_LIST", {}, {}, {});

  if (result && result.length) {
    //  console.log("JSON foramt", )

    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);

      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }
  // console.log("machines",machines);
  temp = await getCollectionObject(
    "MACHINE_LIST",
    Dynamicmodel.schema
  ).aggregate([
    {
      $sort: {
        MACHINE_ID: 1,
      },
    },
    {
      $group: {
        _id: null,
        MACHINE: {
          $push: "$MACHINE_ID",
          // $push: "$MACHINE_DISPLAY",
        },
      },
    },
  ]);

  // console.log("Machines",temp[0].MACHINE,req.body.machines);

  if (req.body.machines && req.body.machines.length) {
    machines = temp[0].MACHINE;
  } else {
    if (temp && temp[0] && temp[0]["MACHINE"] && temp[0]["MACHINE"].length) {
      machines = temp[0]["MACHINE"];
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: "Machine list not fond",
      };
      next();
      return;
    }
  }

  if (machines.length == 1) {
    machineMode = "single";
  }

  let finalData = {};
  let groupId = {};
  let projectTime = {};
  let variable = "$OEE";

  if (collectionName == "ENERGY") {
    variable = "$WH";
  }

  if (timeMode == "hours") {
    groupId = {
      y: {
        $year: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      m: {
        $month: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      d: {
        $dayOfMonth: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      h: {
        $hour: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
    };
    projectTime = {
      $dateToString: {
        date: "$TIME_STAMP",
        format: "%H",
        timezone: "+05:30",
      },
    };
  } else {
    projectTime = {
      $dateToString: {
        date: "$TIME_STAMP",
        format: "%d-%m-%Y",
        timezone: "+05:30",
      },
    };
    groupId = {
      y: {
        $year: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      m: {
        $month: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
      d: {
        $dayOfMonth: { date: "$TIME_STAMP", timezone: "+05:30" },
      },
    };
  }

  if (collectionName == "ENERGY") {
    // console.log("ENERGY collection in");

    if (machineMode == "single") {
      // console.log("single inside");

      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
            WH: {
              $ne: "0.000000",
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            // avg: {
            //   $avg: {
            //     $toDouble: variable,
            //   },
            // },
            max: {
              $first: { $toDouble: variable },
            },
            min: {
              $last: { $toDouble: variable },
            },
          },
        },
        {
          $project: {
            // avg: {
            //   $round: ["$avg", 2],
            // },
            Energy: {
              $subtract: ["$max", "$min"],
            },
            time: projectTime,
          },
        },
        {
          $project: {
            time: 1,
            Energy: {
              $round: ["$Energy", 2],
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$Energy",
            },
          },
        },
      ]);
    } else {
      console.log("Dynamic inside");

      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            WH: {
              $ne: "0.000000",
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: "$MACHINE_NAME",
            MACHINE_NAME: {
              $first: "$MACHINE_NAME",
            },
            // avg: {
            //   $avg: {
            //     $toDouble: variable,
            //   },
            // },
            max: {
              $first: { $toDouble: variable },
            },
            min: {
              $last: { $toDouble: variable },
            },
          },
        },
        {
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },

        {
          $match: {
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $project: {
            // avg: {
            //   $round: ["$avg", 2],
            // },
            Energy: {
              $subtract: ["$max", "$min"],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $project: {
            MACHINE_NAME: 1,
            Energy: {
              $round: ["$Energy", 2],
            },
            fullName: 1,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$fullName",
            },
            Y: {
              $push: "$Energy",
            },
          },
        },
      ]);
    }
  } else {
    if (machineMode == "single") {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $group: {
            _id: groupId,
            TIME_STAMP: {
              $first: "$TIME_STAMP",
            },
            avg: {
              $avg: {
                $toDouble: variable,
              },
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            time: projectTime,
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$time",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);
    } else {
      finalData = await getCollectionObject(
        collectionName,
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: {
              $gte: new Date(startTime),
              $lt: new Date(endTime),
            },
          },
        },
        {
          $sort: {
            TIME_STAMP: -1,
          },
        },
        {
          $group: {
            _id: "$MACHINE_NAME",
            MACHINE_NAME: {
              $first: "$MACHINE_NAME",
            },
            avg: {
              $avg: {
                $toDouble: "$WH",
              },
            },
          },
        },

        {
          $lookup: {
            from: "MACHINE_LIST",
            localField: "MACHINE_NAME",
            foreignField: "MACHINE_ID",
            as: "fullName",
          },
        },
        {
          $unwind: {
            path: "$fullName",
          },
        },

        {
          $match: {
            MACHINE_NAME: {
              $in: machines,
            },
          },
        },
        {
          $project: {
            avg: {
              $round: ["$avg", 2],
            },
            MACHINE_NAME: 1,
            fullName: "$fullName.MACHINE_DISPLAY",
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
        {
          $group: {
            _id: null,
            X: {
              $push: "$fullName",
            },
            Y: {
              $push: "$avg",
            },
          },
        },
      ]);
    }
  }

  let responseData: any = {};

  responseData["layout"] = {
    // barmode: "stack",
    yaxis: {
      title: {
        text: collectionName == "ENERGY" ? "Total Energy" : "Avg OEE",
        font: {
          size: 18,
          color: "#7f7f7f",
        },
      },
    },
    showlegend: false,
    barmode: "stack",
    xaxis: {
      title: {
        text:
          machineMode == "single"
            ? timeMode == "hours"
              ? "Time(hours)"
              : "Days"
            : "Machines",
        font: {
          size: 18,
          color: "#7f7f7f",
        },
      },
    },
  };

  // console.log("FinalData",finalData);
  // let totalMachineData :any ={}
  //   totalMachineData = finalData[0].X.length
  //   console.log("totalMachineData",totalMachineData);

  let sum: any = finalData[0]["Y"].reduce((a, b) => a + b, 0);
  // console.log("sum",sum);

  if (finalData && finalData[0] && finalData[0]["X"] && sum) {
    responseData["graphData"] = [
      {
        type: "bar",
        x: ["All Machine"],
        y: [sum],
        text: [sum],
        textposition: "auto",
        hoverinfo: "none",
      },
    ];
  } else {
    responseData["graphData"] = [
      {
        type: "bar",
        x: [],
        y: [],
      },
    ];
  }
  // console.log("test1");
  // console.log("Temp",temp);

  if (pdf == "true") {
    // console.log("test2");
    responseData["flowData"] = responseData["layout"];
    let infoData: any = {};
    infoData["startTime"] = startTime;
    infoData["endTime"] = endTime;
    let a: any = [];

    machines.forEach((i) => {
      a.push(result2[i]);
    });

    infoData["machines"] = a;

    // infoData["machines"] = machines;
    if (collectionName == "ENERGY") {
      infoData["type"] = "ENERGY";
    } else {
      infoData["type"] = "OEE";
    }
    if (temp[0].MACHINE.length == machines.length) {
      infoData["machines"] = ["All SELECTED"];
    }

    responseData["infoData"] = infoData;
    // console.log("infoDataResponse", infoData);

    createPdf("avgDataGraph", responseData, (err, pdfData) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          data: "pdf gen failed",
        };
        next();
        return;
      }
      req.apiStatus = {
        isSuccess: true,
        data: pdfData,
      };
      next();
    });
  } else {
    console.log("responseData", responseData);
    req.apiStatus = {
      isSuccess: true,
      data: responseData,
    };
    next();
  }
}

export async function machineLiveData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let collectionName: any = req.params.collectionName;
  let startTime: any;
  let endTime: any;
  let finalData: any = {};
  let variable = "$OEE";

  if (collectionName == "ENERGY") {
    variable = "$WH";
  }

  if (collectionName == "OEE_MOLD_OUT") {
    // let shiftData: any = await Dynamicmodel.findWithoutCB(
    //   "SHIFT_MAINTAINANCE",
    //   {},
    //   {},
    //   { $sort: { $natural: -1 }, $limit: 1 }
    // );
    // console.log(shiftData, "meow");
    // if (
    //   shiftData[0] &&
    //   Object.keys(shiftData[0]) &&
    //   Object.keys(shiftData[0]).length
    // ) {
    //   shiftData = JSON.parse(JSON.stringify(shiftData[0]));
    //   Object.keys(shiftData).forEach((shift: any) => {
    //     shiftData[shift] = shiftData[shift].split(":");
    //     for (let x in shiftData[shift]) {
    //       shiftData[shift][x] = parseInt(shiftData[shift][x]);
    //     }
    //   });
    //   let todaysDate: any = new Date();
    //   let shiftName: any = null;
    //   let count: any = 1;
    //   while (
    //     shiftData[`SHIFT_${count}_START_TIME`] &&
    //     shiftData[`SHIFT_${count}_START_TIME`].length
    //   ) {
    //     let tempStartTime: any;
    //     let tempEndTime: any;
    //     if (
    //       shiftData[`SHIFT_${count}_START_TIME`][0] >
    //       shiftData[`SHIFT_${count}_END_TIME`][0]
    //     ) {
    //       if (
    //         todaysDate.getHours() > shiftData[`SHIFT_${count}_START_TIME`][0] &&
    //         todaysDate.getHours() < 24
    //       ) {
    //         tempStartTime = getDate(
    //           new Date().getDate(),
    //           shiftData[`SHIFT_${count}_START_TIME`][0] | 0,
    //           shiftData[`SHIFT_${count}_START_TIME`][1] | 0,
    //           0
    //         );
    //         tempEndTime = getDate(
    //           new Date().getDate() + 1,
    //           shiftData[`SHIFT_${count}_END_TIME`][0] | 0,
    //           shiftData[`SHIFT_${count}_END_TIME`][1] | 0,
    //           0
    //         );
    //       } else if (
    //         todaysDate.getHours() < shiftData[`SHIFT_${count}_END_TIME`][0] &&
    //         todaysDate.getHours() > 0
    //       ) {
    //         tempStartTime = getDate(
    //           new Date().getDate() - 1,
    //           shiftData[`SHIFT_${count}_START_TIME`][0] | 0,
    //           shiftData[`SHIFT_${count}_START_TIME`][1] | 0,
    //           0
    //         );
    //         tempEndTime = getDate(
    //           new Date().getDate(),
    //           shiftData[`SHIFT_${count}_END_TIME`][0] | 0,
    //           shiftData[`SHIFT_${count}_END_TIME`][1] | 0,
    //           0
    //         );
    //       }
    //     } else {
    //       tempStartTime = getDate(
    //         new Date().getDate(),
    //         shiftData[`SHIFT_${count}_START_TIME`][0] | 0,
    //         shiftData[`SHIFT_${count}_START_TIME`][1] | 0,
    //         0
    //       );
    //       tempEndTime = getDate(
    //         new Date().getDate(),
    //         shiftData[`SHIFT_${count}_END_TIME`][0] | 0,
    //         shiftData[`SHIFT_${count}_END_TIME`][1] | 0,
    //         0
    //       );
    //     }
    //     if (todaysDate > tempStartTime && todaysDate <= tempEndTime) {
    //       shiftName = `SHIFT${count}`;
    //       startTime = tempStartTime;
    //       endTime = tempEndTime;
    //       break;
    //     }
    //     count++;
    //   }
    //   console.log(startTime, endTime);

    //   startTime = startTime.getTime();
    //   endTime = endTime.getTime();
    //   if (!(startTime > 0 && endTime > 0)) {
    //     req.apiStatus = {
    //       isSuccess: false,
    //       error: ErrorCodes[1002],
    //       data: "Shift data not found",
    //     };
    //     next();
    //     return;
    //   }
    //   finalData = await getCollectionObject(
    //     collectionName,
    //     Dynamicmodel.schema
    //   ).aggregate([
    //     {
    //       $match: {
    //         TIME_STAMP: {
    //           $gte: new Date(startTime),
    //           $lte: new Date(endTime),
    //         },
    //       },
    //     },
    //     {
    //       $addFields: {
    //         OEE: {
    //           $convert: {
    //             input: "$OEE",
    //             to: "double",
    //             onError: 0,
    //             onNull: 0,
    //           },
    //         },
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: "$MACHINE_NAME",
    //         MACHINE_NAME: {
    //           $first: "$MACHINE_NAME",
    //         },
    //         val: {
    //           $avg: variable,
    //         },
    //       },
    //     },

    //     {
    //       $lookup: {
    //         from: "MACHINE_LIST",
    //         localField: "MACHINE_NAME",
    //         foreignField: "MACHINE_ID",
    //         as: "fullName",
    //       },
    //     },
    //     {
    //       $unwind: {
    //         path: "$fullName",
    //         preserveNullAndEmptyArrays: true,
    //       },
    //     },
    //     {
    //       $project: {
    //         MACHINE_NAME: 1,
    //         fullName: "$fullName.MACHINE_DISPLAY",
    //         val: 1,
    //       },
    //     },

    //     {
    //       $sort: {
    //         MACHINE_NAME: 1,
    //       },
    //     },
    //     {
    //       $group: {
    //         _id: null,
    //         x: {
    //           $push: "$fullName",
    //         },
    //         y: {
    //           $push: "$val",
    //         },
    //       },
    //     },
    //   ]);
    //   console.log(finalData, "jiii");
    // }
    finalData = await getCollectionObject(
      collectionName,
      Dynamicmodel.schema
    ).aggregate([
      {
        $sort: {
          TIME_STAMP: -1,
        },
      },
      {
        $group: {
          _id: "$MACHINE_NAME",
          MACHINE_NAME: {
            $first: "$MACHINE_NAME",
          },
          val: {
            $first: variable,
          },
        },
      },

      {
        $lookup: {
          from: "MACHINE_LIST",
          localField: "MACHINE_NAME",
          foreignField: "MACHINE_ID",
          as: "fullName",
        },
      },
      {
        $unwind: {
          path: "$fullName",
        },
      },
      {
        $project: {
          MACHINE_NAME: 1,
          fullName: "$fullName.MACHINE_DISPLAY",
          val: 1,
        },
      },
      {
        $sort: {
          MACHINE_NAME: 1,
        },
      },
      {
        $group: {
          _id: null,
          x: {
            $push: "$fullName",
          },
          y: {
            $push: "$val",
          },
        },
      },
    ]);
  } else {
    finalData = await getCollectionObject(
      collectionName,
      Dynamicmodel.schema
    ).aggregate([
      {
        $group: {
          _id: "$MACHINE_NAME",
          MACHINE_NAME: {
            $first: "$MACHINE_NAME",
          },
          val: {
            $last: variable,
          },
        },
      },

      {
        $lookup: {
          from: "MACHINE_LIST",
          localField: "MACHINE_NAME",
          foreignField: "MACHINE_ID",
          as: "fullName",
        },
      },
      {
        $unwind: {
          path: "$fullName",
        },
      },
      {
        $project: {
          MACHINE_NAME: 1,
          fullName: "$fullName.MACHINE_DISPLAY",
          val: 1,
        },
      },

      {
        $sort: {
          MACHINE_NAME: 1,
        },
      },
      {
        $group: {
          _id: null,
          x: {
            $push: "$fullName",
          },
          y: {
            $push: "$val",
          },
        },
      },
    ]);
  }

  let responseData: any = {};
  console.log(finalData);

  if (!(finalData && finalData.length)) {
    finalData = [
      {
        x: [],
        y: [],
      },
    ];
  }

  //////////////////////

  if (collectionName == "OEE_MOLD_OUT") {
    responseData["layout"] = {
      barmode: "stack",
      yaxis: {
        title: {
          text: "Live OEE",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
      xaxis: {
        title: {
          text: "Machines",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
    };
  } else {
    responseData["layout"] = {
      barmode: "stack",
      yaxis: {
        title: {
          text: "Live Energy",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
      xaxis: {
        title: {
          text: "Machines",
          font: {
            size: 18,
            color: "#7f7f7f",
          },
        },
      },
    };
  }
  if (collectionName == "OEE_MOLD_OUT") {
    let counter: any = 0;
    let machineCountNot: any = 0;
    if (finalData[0]["y"].length > 0) {
      let avgVal: any = finalData[0]["y"].reduce((a: any, b: any) => {
        counter = counter + 1;
        if (counter == 1) {
          if (parseFloat(a) < 10) {
            a = 0;
            machineCountNot++;
          }
        }
        if (parseFloat(b) < 10) {
          b = 0;
          machineCountNot++;
        }
        return parseFloat(a) + parseFloat(b);
      });
      responseData["avgGraphData"] = [
        {
          type: "bar",
          x: [""],
          y: [avgVal / finalData[0]["y"].length],
          text: [
            `${(avgVal / (finalData[0]["y"].length - machineCountNot)).toFixed(
              2
            )}`,
          ],
          textposition: "auto",
          hoverinfo: "none",
        },
      ];
    }

    responseData["avgGraphLayout"] = [
      {
        yaxis: {
          title: {
            text: "Live Avg OEE",
            font: {
              size: 18,
              color: "#7f7f7f",
            },
          },
        },
        showlegend: false,
        barmode: "stack",
        xaxis: {
          title: {
            text: "All Machines",
            font: {
              size: 18,
              color: "#7f7f7f",
            },
          },
        },
      },
    ];
  }

  ////////////////////

  // responseData["layout"] = {
  //   barmode: "stack",
  //   yaxis: {
  //     title: {
  //       text: collectionName == "ENERGY" ? "Live Energy" : "Live OEE",
  //       font: {
  //         size: 18,
  //         color: "#7f7f7f",
  //       },
  //     },
  //   },
  //   xaxis: {
  //     title: {
  //       text: "Machines",
  //       font: {
  //         size: 18,
  //         color: "#7f7f7f",
  //       },
  //     },
  //   },
  // };

  if (finalData && finalData[0] && finalData[0]["x"] && finalData[0]["y"]) {
    responseData["graphData"] = [
      {
        type: "bar",
        x: finalData[0]["x"],
        y: finalData[0]["y"],
        text: finalData[0]["y"].map((x) => {
          return parseFloat(x).toFixed(2);
        }),
        textposition: "auto",
        hoverinfo: "none",
      },
    ];
    // responseData["x"] = finalData[0]["x"];
    // responseData["y"] = finalData[0]["y"];
  } else {
    responseData["graphData"] = [
      {
        type: "bar",
        x: [],
        y: [],
      },
    ];
    // responseData["x"] = [];
    // responseData["y"] = [];
  }

  req.apiStatus = {
    isSuccess: true,
    data: responseData,
  };
  next();
}

// export async function machineStatusData(
//   req: Request | any,
//   res: Response,
//   next: NextFunction
// ) {
//   let machineName: any = "";
//   let fromTime: any = new Date();

//   if (req.body && req.body.machineName && req.body.dateTime) {
//     machineName = req.body.machineName;
//     fromTime = req.body.dateTime;
//   } else {
//     req.apiStatus = {
//       isSuccess: false,
//       error: ErrorCodes[1002],
//       data: "Machine/Date name not found",
//     };
//     next();
//     return;
//   }

//   fromTime = new Date(fromTime).getTime() + 6 * 60 * 60 * 1000;
//   let startTime: any = fromTime;
//   let endTime: any = startTime + 24 * 60 * 60 * 1000 - 1;
//   let today: any = new Date().getTime();
//   // if (startTime == today) {
//   //   endTime = today;
//   // }
//   endTime = new Date(endTime);
//   startTime = new Date(startTime);
//   console.log("test", startTime, endTime);

//   let aggr: any = await getCollectionObject(
//     "OEE_MOLD_OUT",
//     Dynamicmodel.schema
//   ).aggregate([
//     {
//       $match: {
//         TIME_STAMP: {
//           $gte: startTime,
//           $lte: endTime,
//         },
//         MACHINE_NAME: machineName,
//       },
//     },
//     {
//       $sort: {
//         TIME_STAMP: 1,
//       },
//     },
//     // {
//     //   $limit: 10,
//     // },
//     {
//       $project: {
//         MACHINE_STATUS: 1,
//         TIME_STAMP: 1,
//         _id: 0,
//       },
//     },
//   ]);

//   // console.log("aggr", aggr);

//   let graphData: any = {};

//   graphData["layout"] = {
//     height: 250,
//     width: "100%",
//     showlegend: false,
//     xaxis: {
//       autorange: false,
//       range: [6, 12],
//       fixedrange: true,
//       tickmode: "linear", //  If "linear", the placement of the ticks is determined by a starting position `tick0` and a tick step `dtick`
//       tick0: 1,
//       dtick: 1,
//     },
//   };

//   const zone: any = { timeZone: "Asia/Kolkata" };
//   graphData["data"] = [];
//   let x: any = [];

//   for (let i = 0; i < aggr.length; i++) {
//     console.log("coming from postman");

//     let nextStatus =
//       aggr[i + 1] && aggr[i + 1].MACHINE_STATUS
//         ? aggr[i + 1].MACHINE_STATUS
//         : null;
//     if (aggr[i].MACHINE_STATUS == nextStatus) {
//       aggr[i].continue = true;
//     } else {
//       aggr[i].continue = false;
//     }
//     if (i == aggr.length - 1) {
//       aggr[i].from = new Date(aggr[i].TIME_STAMP)
//         .toLocaleString(zone)
//         .split(",")[1];
//       aggr[i].to = new Date(endTime).toLocaleString(zone).split(",")[1];
//     } else {
//       aggr[i].from = new Date(aggr[i].TIME_STAMP)
//         .toLocaleString(zone)
//         .split(",")[1];
//       aggr[i].to = new Date(aggr[i + 1].TIME_STAMP)
//         .toLocaleString(zone)
//         .split(",")[1];
//     }

//     x[0] = aggr[i - 1] && aggr[i - 1].continue ? x[0] : aggr[i].from;
//     x[1] = x[0];
//     x[2] = aggr[i] && aggr[i].to ? aggr[i].to : endTime;
//     x[3] = x[2];

//     switch (parseInt(aggr[i].MACHINE_STATUS)) {
//       case 0:
//         aggr[i].name = `RUNNING (${x[0]} to ${x[2]}`;
//         aggr[i].fillcolor = "#4caf50";
//         break;

//       case 1:
//         aggr[i].name = `IDLE (${x[0]} to ${x[2]})`;
//         aggr[i].fillcolor = "#ffbf00";
//         break;

//       case 2:
//         aggr[i].name = `STOPPED (${x[0]} to ${x[2]})`;
//         aggr[i].fillcolor = "#f44336";
//         break;

//       case 3:
//         aggr[i].name = `DISCONNECTED (${x[0]} to ${x[2]})`;
//         aggr[i].fillcolor = "#a6a6a6";
//         break;
//     }

//     console.log("after switch case", i, x[0], x[2], aggr[i].continue);

//     if (aggr[i].continue == false) {
//       graphData["data"].push(
//         JSON.parse(
//           JSON.stringify({
//             x: [1,2,3,4,5,6,7,8],
//             y: [0, 1, 1, 0],
//             mode: "markers",
//             name: aggr[i].name,
//             line: { shape: "hv" },
//             type: "scatter",
//             fillcolor: aggr[i].fillcolor,

//             fill: "toself",
//             marker: {
//               opacity: 0,
//             },
//           })
//         )
//       );
//     }
//   }

//   console.log(aggr);
//   console.log("graphData", graphData);

//   req.apiStatus = {
//     isSuccess: true,
//     data: graphData,
//   };
//   next();
// }

export async function machineStatusDataOldWorking(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineName: any = "";
  let fromTime: any = new Date();

  if (req.body && req.body.machineName && req.body.dateTime) {
    machineName = req.body.machineName;
    fromTime = req.body.dateTime;
  } else {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      data: "Machine/Date name not found",
    };
    next();
    return;
  }

  fromTime = new Date(fromTime).getTime() + 6 * 60 * 60 * 1000;
  let startTime: any = fromTime;
  let endTime: any = startTime + 24 * 60 * 60 * 1000 - 1;
  let today: any = new Date().getTime();
  // if (startTime == today) {
  //   endTime = today;
  // }

  // console.log("test", startTime, endTime);

  endTime = new Date(endTime);
  startTime = new Date(startTime);
  // console.log("test", startTime, endTime);
  // console.log("test", new Date(startTime).toLocaleString(), new Date(endTime).toLocaleString());

  let aggr: any = await getCollectionObject(
    "OEE_MOLD_OUT",
    Dynamicmodel.schema
  ).aggregate([
    {
      $match: {
        TIME_STAMP: {
          $gte: startTime,
          $lte: endTime,
        },
        MACHINE_NAME: machineName,
      },
    },
    {
      $sort: {
        TIME_STAMP: 1,
      },
    },
    //group based on shift
    // {$group: {
    //   _id: '$SHIFT',
    //   TIME_STAMP: {
    //    $push: '$TIME_STAMP'
    //   },
    //   MACHINE_STATUS: {
    //    $push: '$MACHINE_STATUS'
    //   },
    //   ACTUAL_CYCLE_TIME: {
    //    $push: '$ACTUAL_CYCLE_TIME'
    //   },
    //   IDEAL_CYCLE_TIME: {
    //    $push: '$IDEAL_CYCLE_TIME'
    //   },
    //   SHIFT_TIME: {
    //    $push: '$SHIFT_TIME'
    //   },
    //   BREAK_TIME: {
    //    $push: '$BREAK_TIME'
    //   },
    //   BREAK_DOWN: {
    //    $push: '$BREAK_DOWN'
    //   },
    //   PRODUCTION_COUNT: {
    //    $push: '$PRODUCTION_COUNT'
    //   },
    //   REJECT_COUNT: {
    //    $push: '$REJECT_COUNT'
    //   },
    //   PLANNED_PRODUCTION_TIME: {
    //    $push: '$PLANNED_PRODUCTION_TIME'
    //   },
    //   RUN_TIME: {
    //    $push: '$RUN_TIME'
    //   },
    //   GOOD_COUNT: {
    //    $push: '$GOOD_COUNT'
    //   },
    //   AVAILABILITY: {
    //    $push: '$AVAILABILITY'
    //   },
    //   PERFORMANCE: {
    //    $push: '$PERFORMANCE'
    //   },
    //   QUALITY: {
    //    $push: '$QUALITY'
    //   },
    //   OEE: {
    //    $push: '$OEE'
    //   },
    //   PLANNED_COUNT: {
    //    $push: '$PLANNED_COUNT'
    //   },
    //   PLANNED_COUNT_INSTANT: {
    //    $push: '$PLANNED_COUNT_INSTANT'
    //   },
    //   MATERIAL_DESCRIPTION: {
    //    $push: '$MATERIAL_DESCRIPTION'
    //   },
    //   SAP_CODE: {
    //    $push: '$SAP_CODE'
    //   },
    //   SHOT_COUNT: {
    //    $push: '$SHOT_COUNT'
    //   },
    //   TIMESTAMP_STRING: {
    //    $push: '$TIMESTAMP_STRING'
    //   }
    //  }},

    // {
    //   $limit: 10,
    // },
    {
      $project: {
        MACHINE_STATUS: 1,
        TIME_STAMP: 1,
        _id: 1,
      },
    },
  ]);

  // console.log("aggr", aggr);

  let graphData: any = {};

  graphData["layout"] = {
    height: 250,
    width: "100%",
    showlegend: false,
    xaxis: {
      autorange: false,
      range: [0, 24],
      fixedrange: true,
      tickmode: "linear", //  If "linear", the placement of the ticks is determined by a starting position `tick0` and a tick step `dtick`
      tick0: 1,
      dtick: 1,
    },
  };

  const zone: any = { timeZone: "Asia/Kolkata" };
  graphData["data"] = [];
  let x: any = [];

  for (let i = 0; i < aggr.length; i++) {
    // console.log("coming from postman", aggr[i]);

    let nextStatus =
      aggr[i + 1] && aggr[i + 1].MACHINE_STATUS
        ? aggr[i + 1].MACHINE_STATUS
        : null;
    if (aggr[i].MACHINE_STATUS == nextStatus) {
      aggr[i].continue = true;
    } else {
      aggr[i].continue = false;
    }
    if (i == aggr.length - 1) {
      // aggr[i].from = new Date(aggr[i].TIME_STAMP)
      //   .toLocaleString(zone)
      //   .split(",")[1];
      // aggr[i].to = new Date(endTime).toLocaleString(zone).split(",")[1];
      // aggr[i].from =
      //   new Date(aggr[i].TIME_STAMP).getHours() +
      //   new Date(aggr[i].TIME_STAMP).getMinutes() / 60;
      // aggr[i].to =
      //   new Date(endTime).getHours() + new Date(endTime).getMinutes() / 60;
    } else {
      // aggr[i].from = new Date(aggr[i].TIME_STAMP)
      //   .toLocaleString(zone)
      //   .split(",")[1];
      // aggr[i].to = new Date(aggr[i + 1].TIME_STAMP)
      //   .toLocaleString(zone)
      //   .split(",")[1];
      aggr[i].from =
        new Date(aggr[i].TIME_STAMP).getHours() +
        new Date(aggr[i].TIME_STAMP).getMinutes() / 60;
      aggr[i].to =
        new Date(aggr[i + 1].TIME_STAMP).getHours() +
        new Date(aggr[i + 1].TIME_STAMP).getMinutes() / 60;
    }
    aggr[i].from = parseFloat(aggr[i].from);
    aggr[i].to = parseFloat(aggr[i].to);

    // console.log("aggr[i]", aggr[i]);

    let endTimeInt: any = (
      new Date(endTime).getHours() +
      new Date(endTime).getMinutes() / 60
    ).toFixed(2);

    if (i != aggr.length - 1) {
      x[0] = aggr[i - 1] && aggr[i - 1].continue ? x[0] : aggr[i].from;

      x[1] = x[0];
      x[2] = aggr[i] && aggr[i].to ? aggr[i].to : 24;
      x[3] = x[2];

      // for x0
      // let finalX2 = x[0].split(".");
      // let hours2 = parseInt(finalX2[0]);

      // let min2 = parseInt(finalX2[1]);

      // let x0: any = [];
      // if (finalX2[1] > 59) {
      //   hours2 = hours2 + 1;
      //   min2 = finalX2[1] - 60;
      //   // console.log(hours, min);
      //   x0.push(hours2, min2);

      //   x0 = x0.join(":");
      //   // finalX[0] = hours;
      // } else {
      //   finalX2 = finalX2.join(":");
      //   x0 = finalX2;
      // }
      // // console.log("finaxl", hours, min);
      // console.log("finaxl2", x0);

      // for x2

      // let finalX = x[2].split(".");
      // let hours = parseInt(finalX[0]);
      // let min = parseInt(finalX[1]);

      // let x2: any = [];
      // if (finalX[1] > 59) {
      //   hours = hours + 1;
      //   min = finalX[1] - 60;
      //   // console.log(hours, min);
      //   x2.push(hours, min);

      //   x2 = x2.join(":");
      // } else {
      //   finalX = finalX.join(":");
      //   x2 = finalX;
      // }
      // console.log("finaxl", x2);

      let v1: any = parseInt(x[0]);
      v1 = v1.toString().padStart(2, "0");
      // console.log("v1", v1);

      let v2: any = x[0] - v1;
      // console.log("v2", v2);

      v2 = v2 * 60;
      v2 = parseInt(v2);
      v2 = v2.toString().padStart(2, "0");
      // console.log("v22", v2);

      let v3: any = parseInt(x[3]);
      v3 = v3.toString().padStart(2, "0");
      // console.log("v1", v1);

      let v4: any = x[3] - v3;
      // console.log("v2", v2);

      v4 = v4 * 60;
      v4 = parseInt(v4);
      v4 = v4.toString().padStart(2, "0");

      switch (parseInt(aggr[i].MACHINE_STATUS)) {
        case 0:
          // aggr[i].name = `RUNNING (${x[0]} to ${x[2]}`;
          aggr[i].name = `RUNNING (${v1}:${v2} to ${v3}:${v4}`;

          aggr[i].fillcolor = "#4caf50";
          break;

        case 1:
          aggr[i].name = `IDLE (${v1}:${v2} to ${v3}:${v4})`;
          aggr[i].fillcolor = "#ffbf00";
          break;

        case 2:
          aggr[i].name = `STOPPED (${v1}:${v2} to ${v3}:${v4})`;
          aggr[i].fillcolor = "#f44336";
          break;

        case 3:
          aggr[i].name = `DISCONNECTED (${v1}:${v2} to ${v3}:${v4})`;
          aggr[i].fillcolor = "#a6a6a6";
          break;
      }

      // console.log("after switch case", i, x[0], x[2], aggr[i].continue);

      if (aggr[i].continue == false) {
        graphData["data"].push(
          JSON.parse(
            JSON.stringify({
              x: x,
              y: [0, 1, 1, 0],
              mode: "markers",
              name: aggr[i].name,
              line: { shape: "hv" },
              type: "scatter",
              fillcolor: aggr[i].fillcolor,

              fill: "toself",
              marker: {
                opacity: 0,
              },
            })
          )
        );
      }
    }
  }

  // console.log(aggr);
  // console.log("graphData", graphData["data"][0]);

  req.apiStatus = {
    isSuccess: true,
    data: graphData,
  };
  next();
}

export async function machineStatusData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineName: any = "";
  let selectedTime: any = new Date();

  if (req.body && req.body.machineName && req.body.dateTime) {
    machineName = req.body.machineName;
    selectedTime = req.body.dateTime;
  } else {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      data: "Machine/Date name not found",
    };
    next();
    return;
  }

  try {
    // console.log("machineName", machineName);

    selectedTime = new Date(selectedTime).getTime();

    console.log("selectedTime", selectedTime);

    let selectedDay6amTime = new Date(selectedTime + 5.75 * 60 * 60 * 1000);
    let selectedDay6amTimeIndia = new Date(
      selectedTime + 11.25 * 60 * 60 * 1000
    );
    // console.log("selectedTime day", selectedDay6amTimeIndia);

    // let selectedDay12pmTime = new Date(selectedTime + 12 * 60 * 60 * 1000);

    // let selectedDay12_1pmTime = new Date(
    //   selectedTime + 12 * 60 * 60 * 1000 + 60 * 1000
    // );

    // let selectedDay6pmTime = new Date(
    //   selectedTime + 18 * 60 * 60 * 1000 + 60 * 1000
    // );

    // let selectedDay6_1pmTime = new Date(
    //   selectedTime + 18 * 60 * 60 * 1000 + 60 * 1000
    // ); //shift B starts at 6 hr 1 minutes pm

    // let selectedDay11_59pmTime = new Date(
    //   selectedTime + 24 * 60 * 60 * 1000 - 60 * 1000
    // );

    // let nextDayofSelectedDay12amTime = new Date(
    //   selectedTime + 24 * 60 * 60 * 1000
    // );
    let currentTime = Date.now();
    let nextDayofSelectedDay6amTime: any;
    let nextDayTimeIndia: any;
    let nextDayTimeOriginal: any;
    // console.log(selectedTime, new Date(selectedTime),currentTime, new Date(currentTime))
    console.log(
      new Date(selectedTime + 30 * 60 * 60 * 1000),
      new Date(currentTime)
    );
    if (selectedTime + 29.75 * 60 * 60 * 1000 > currentTime) {
      nextDayofSelectedDay6amTime = new Date(currentTime);
      nextDayTimeIndia = new Date(currentTime + 5.5 * 60 * 60 * 1000);
      nextDayTimeOriginal = new Date(currentTime);
    } else {
      nextDayofSelectedDay6amTime = new Date(
        selectedTime + 30 * 60 * 60 * 1000
      );
      nextDayTimeIndia = new Date(selectedTime + 35.5 * 60 * 60 * 1000);
      nextDayTimeOriginal = new Date(selectedTime);
    }
    let nextDayTimeFixedIndia: any = new Date(
      selectedTime + 35.25 * 60 * 60 * 1000
    );

    let shiftTimeArray = {
      shiftA1: {
        $gte: selectedDay6amTime,
        $lte: nextDayofSelectedDay6amTime,
      },
    };

    let totalShifts = Object.keys(shiftTimeArray); // ["shiftA", "shifB"]

    const getShiftData = async (searchWithInShift, shift) => {
      let shiftDetails: any = await getCollectionObject(
        "SHIFT_MAINTAINANCE",
        Dynamicmodel.schema
      ).findOne({ MACHINE_NAME: machineName }, {}, {});
      let lunchBreak: any = [];
      let shiftName: any = null;
      let count: any = 1;
      shiftDetails = shiftDetails ? shiftDetails.toJSON() : {};
      while (
        shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`] &&
        shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`]
      ) {
        shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`] =
          shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`].split(":");
        for (let x in shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`]) {
          shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][x] = parseInt(
            shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][x]
          );
        }
        shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`] =
          shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`].split(":");
        for (let x in shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`]) {
          shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][x] = parseInt(
            shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][x]
          );
        }
        let tempStartTime: any;
        let tempEndTime: any;
        if (
          shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][0] >=
          shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][0]
        ) {
          if (
            shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][0] > 6 &&
            shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][0] < 24
          ) {
            tempStartTime = getDateOld(
              searchWithInShift["$gte"],
              new Date(searchWithInShift["$gte"]).getDate(),
              shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][0] | 0,
              shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][1] | 0,
              0
            );
            tempEndTime = getDateOld(
              searchWithInShift["$gte"],
              new Date(searchWithInShift["$gte"]).getDate(),
              shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][0] | 0,
              shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][1] | 0,
              0
            );
          } else {
            tempStartTime = getDateOld(
              searchWithInShift["$gte"],
              new Date(searchWithInShift["$gte"]).getDate() + 1,
              shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][0] | 0,
              shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][1] | 0,
              0
            );
            tempEndTime = getDateOld(
              searchWithInShift["$gte"],
              new Date(searchWithInShift["$gte"]).getDate() + 1,
              shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][0] | 0,
              shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][1] | 0,
              0
            );
          }
        } else {
          tempStartTime = getDateOld(
            searchWithInShift["$gte"],
            new Date(searchWithInShift["$gte"]).getDate(),
            shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][0] | 0,
            shiftDetails[`SHIFT_${count}_LUNCH_START_TIME`][1] | 0,
            0
          );
          tempEndTime = getDateOld(
            searchWithInShift["$gte"],
            new Date(searchWithInShift["$gte"]).getDate() + 1,
            shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][0] | 0,
            shiftDetails[`SHIFT_${count}_LUNCH_END_TIME`][1] | 0,
            0
          );
        }
        shiftName = `SHIFT${count}`;
        lunchBreak.push({
          from: tempStartTime,
          to: tempEndTime,
        });
        count++;
      }
      console.log(lunchBreak, "lunchbreak");
      console.log(searchWithInShift);

      // if (
      //   shiftDetails["SHIFT_1_LUNCH_START_TIME"] &&
      //   shiftDetails["SHIFT_1_LUNCH_END_TIME"] &&
      //   shiftDetails["SHIFT_1_LUNCH_START_TIME"].length &&
      //   shiftDetails["SHIFT_1_LUNCH_END_TIME"].length
      // ) {
      //   lunchBreak.push({
      //     from: shiftDetails["SHIFT_1_LUNCH_START_TIME"],
      //     to: shiftDetails["SHIFT_1_LUNCH_END_TIME"],
      //   });
      // }
      // if (
      //   shiftDetails["SHIFT_2_LUNCH_START_TIME"] &&
      //   shiftDetails["SHIFT_2_LUNCH_END_TIME"] &&
      //   shiftDetails["SHIFT_2_LUNCH_START_TIME"].length &&
      //   shiftDetails["SHIFT_2_LUNCH_END_TIME"].length
      // ) {
      //   lunchBreak.push({
      //     from: shiftDetails["SHIFT_2_LUNCH_START_TIME"],
      //     to: shiftDetails["SHIFT_2_LUNCH_END_TIME"],
      //   });
      // }

      // if (
      //   shiftDetails["SHIFT_3_LUNCH_START_TIME"] &&
      //   shiftDetails["SHIFT_3_LUNCH_END_TIME"] &&
      //   shiftDetails["SHIFT_3_LUNCH_START_TIME"].length &&
      //   shiftDetails["SHIFT_3_LUNCH_END_TIME"].length
      // ) {
      //   lunchBreak.push({
      //     from: shiftDetails["SHIFT_3_LUNCH_START_TIME"],
      //     to: shiftDetails["SHIFT_3_LUNCH_END_TIME"],
      //   });
      // }

      console.log(shiftDetails, "SD");
      let aggr: any = await getCollectionObject(
        "OEE_MOLD_OUT",
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: searchWithInShift,
            MACHINE_NAME: machineName,
          },
        },
        {
          $sort: {
            TIME_STAMP: 1,
          },
        },
        {
          $project: {
            MACHINE_STATUS: 1,
            TIME_STAMP: 1,
            _id: 1,
          },
        },
      ]);

      let graphData: any = {};
      // let lastData:any ={};

      graphData["layout"] = {
        height: 300,
        width: "100%",
        showlegend: false,
        automargin: true,
        autosize: false,
        yaxis: {
          tick0: 1,
          dtick: 1,
        },
        xaxis: {
          title: "(in Hours)",
          autorange: false,
          range: [selectedDay6amTimeIndia, nextDayTimeFixedIndia],
          // fixedrange: true,
          tickmode: "array",
          tick0: 1,
          dtick: 1,
          tickvals: [
            new Date(selectedTime + 11.25 * 60 * 60 * 1000),
            new Date(selectedTime + 12.25 * 60 * 60 * 1000),
            new Date(selectedTime + 13.25 * 60 * 60 * 1000),
            new Date(selectedTime + 14.25 * 60 * 60 * 1000),
            new Date(selectedTime + 15.25 * 60 * 60 * 1000),
            new Date(selectedTime + 16.25 * 60 * 60 * 1000),
            new Date(selectedTime + 17.25 * 60 * 60 * 1000),
            new Date(selectedTime + 18.25 * 60 * 60 * 1000),
            new Date(selectedTime + 19.25 * 60 * 60 * 1000),
            new Date(selectedTime + 20.25 * 60 * 60 * 1000),
            new Date(selectedTime + 21.25 * 60 * 60 * 1000),
            new Date(selectedTime + 22.25 * 60 * 60 * 1000),
            new Date(selectedTime + 23.25 * 60 * 60 * 1000),
            new Date(selectedTime + 24.25 * 60 * 60 * 1000),
            new Date(selectedTime + 25.25 * 60 * 60 * 1000),
            new Date(selectedTime + 26.25 * 60 * 60 * 1000),
            new Date(selectedTime + 27.25 * 60 * 60 * 1000),
            new Date(selectedTime + 28.25 * 60 * 60 * 1000),
            new Date(selectedTime + 29.25 * 60 * 60 * 1000),
            new Date(selectedTime + 30.25 * 60 * 60 * 1000),
            new Date(selectedTime + 31.25 * 60 * 60 * 1000),
            new Date(selectedTime + 32.25 * 60 * 60 * 1000),
            new Date(selectedTime + 33.25 * 60 * 60 * 1000),
            new Date(selectedTime + 34.25 * 60 * 60 * 1000),
            new Date(selectedTime + 35.25 * 60 * 60 * 1000),
          ],
          ticktext: [
            "05:45",
            "06:45",
            "07:45",
            "08:45",
            "09:45",
            "10:45",
            "11:45",
            "12:45",
            "13:45",
            "14:45",
            "15:45",
            "16:45",
            "17:45",
            "18:45",
            "19:45",
            "20:45",
            "21:45",
            "22:45",
            "23:45",
            "00:45",
            "01:45",
            "02:45",
            "03:45",
            "04:45",
            "05:45",
          ],
        },
      };

      const zone: any = { timeZone: "Asia/Kolkata" };
      graphData["data"] = [];
      let x: any = [];
      let startDownTime: any;
      let endDownTime: any;

      if (!aggr || !aggr.length) {
        graphData["data"] = [];
        return graphData;
      }

      console.log(aggr);
      let durationStatus: any = {
        RUNNING: 0,
        IDLE: 0,
        STOPPED: 0,
        DISCONNECTED: 0,
      };

      for (let i = 0; i < aggr.length; i++) {
        let nextStatus =
          aggr[i + 1] && aggr[i + 1].MACHINE_STATUS
            ? aggr[i + 1].MACHINE_STATUS
            : null;
        if (aggr[i].MACHINE_STATUS == nextStatus) {
          aggr[i].continue = true;
        } else {
          aggr[i].continue = false;
        }
        // aggr[i].fromOriginal = aggr[i].TIME_STAMP;
        aggr[i].from =
          new Date(aggr[i].TIME_STAMP).getTime() + 5.5 * 60 * 60 * 1000;
        // aggr[i].toOriginal =
        //   aggr[i + 1] && aggr[i + 1].TIME_STAMP
        //     ? aggr[i + 1].TIME_STAMP
        //     : nextDayTimeOriginal;
        aggr[i].to =
          aggr[i + 1] && aggr[i + 1].TIME_STAMP
            ? new Date(aggr[i + 1].TIME_STAMP).getTime() + 5.5 * 60 * 60 * 1000
            : nextDayTimeIndia;
        // aggr[i].fromOriginal = new Date(aggr[i].fromOriginal);
        // aggr[i].toOriginal = new Date(aggr[i].toOriginal);
        aggr[i].from = new Date(aggr[i].from);
        aggr[i].to = new Date(aggr[i].to);

        // startDownTime =
        //   aggr[i - 1] && aggr[i - 1].continue
        //     ? startDownTime
        //     : aggr[i].fromOriginal;
        // endDownTime =
        //   aggr[i] && aggr[i].toOriginal
        //     ? aggr[i].toOriginal
        //     : nextDayTimeOriginal;

        x[0] = aggr[i - 1] && aggr[i - 1].continue ? x[0] : aggr[i].from;
        x[1] = x[0];
        x[2] = aggr[i] && aggr[i].to ? aggr[i].to : nextDayTimeIndia;
        x[3] = x[2];

        startDownTime = new Date(x[0].getTime() - 5.5 * 60 * 60 * 1000);
        endDownTime = new Date(x[2].getTime() - 5.5 * 60 * 60 * 1000);

        let v1: any = x[0].getUTCHours();
        v1 = v1.toString().padStart(2, "0");

        let v2: any = x[0].getUTCMinutes();
        v2 = v2.toString().padStart(2, "0");
        let v12: any = x[0].getUTCSeconds();
        v12 = v12.toString().padStart(2, "0");
        let v3: any = x[2].getUTCHours();
        v3 = v3.toString().padStart(2, "0");
        let v4: any = x[2].getUTCMinutes();
        v4 = v4.toString().padStart(2, "0");
        let v34: any = x[2].getUTCSeconds();
        v34 = v34.toString().padStart(2, "0");

        switch (parseInt(aggr[i].MACHINE_STATUS)) {
          case 0:
            aggr[i].name = `RUNNING (${v1}:${v2}:${v12} to ${v3}:${v4}:${v34})`;
            aggr[i].fillcolor = "#4caf50";
            break;

          case 1:
            aggr[i].name = `IDLE (${v1}:${v2}:${v12} to ${v3}:${v4}:${v34})`;
            aggr[i].fillcolor = "#ffbf00";
            break;

          case 2:
            aggr[i].name = `STOPPED (${v1}:${v2}:${v12} to ${v3}:${v4}:${v34})`;
            aggr[i].fillcolor = "#f44336";
            break;

          case 3:
            aggr[
              i
            ].name = `DISCONNECTED (${v1}:${v2}:${v12} to ${v3}:${v4}:${v34})`;
            aggr[i].fillcolor = "#a6a6a6";
            break;
        }

        if (aggr[i].continue == false) {
          switch (parseInt(aggr[i].MACHINE_STATUS)) {
            case 0:
              durationStatus["RUNNING"] =
                durationStatus["RUNNING"] + (endDownTime - startDownTime);
              break;

            case 1:
              durationStatus["IDLE"] =
                durationStatus["IDLE"] + (endDownTime - startDownTime);
              break;

            case 2:
              durationStatus["STOPPED"] =
                durationStatus["STOPPED"] + (endDownTime - startDownTime);
              break;

            case 3:
              durationStatus["DISCONNECTED"] =
                durationStatus["DISCONNECTED"] + (endDownTime - startDownTime);
              break;
          }
          console.log(
            startDownTime,
            endDownTime,
            aggr[i].MACHINE_STATUS,
            "Dater"
          );

          let downTimeReasons: any = await Dynamicmodel.aggregate(
            "MACHINE_LIST",
            [
              {
                $match: {
                  MACHINE_ID: machineName,
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
                        FROM_TIME: {
                          $gte: new Date(startDownTime).getTime(),
                          $lte: new Date(endDownTime).getTime(),
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
                        TIME_STAMP: "$FROM_TIME",
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
                        // TIME_STAMP: {
                        //   $gte: new Date(startDownTime),
                        //   $lte: new Date(endDownTime),
                        // },
                        $or: [
                          {
                            FROM_TIME: {
                              $gte: new Date(startDownTime).getTime(),
                              $lte: new Date(endDownTime).getTime(),
                            },
                          },
                          {
                            TO_TIME: {
                              $gte: new Date(startDownTime).getTime(),
                              $lte: new Date(endDownTime).getTime(),
                            },
                          },
                          {
                            $and: [
                              {
                                FROM_TIME: {
                                  $lte: new Date(startDownTime).getTime(),
                                },
                              },
                              {
                                TO_TIME: {
                                  $gte: new Date(endDownTime).getTime(),
                                },
                              },
                            ],
                          },
                        ],
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
                        // TIME_STAMP: {
                        //   $gte: new Date(startDownTime),
                        //   $lte: new Date(endDownTime),
                        // },
                        $or: [
                          {
                            FROM_TIME: {
                              $gte: new Date(startDownTime).getTime(),
                              $lte: new Date(endDownTime).getTime(),
                            },
                          },
                          {
                            TO_TIME: {
                              $gte: new Date(startDownTime).getTime(),
                              $lte: new Date(endDownTime).getTime(),
                            },
                          },
                          {
                            $and: [
                              {
                                FROM_TIME: {
                                  $lte: new Date(startDownTime).getTime(),
                                },
                              },
                              {
                                TO_TIME: {
                                  $gte: new Date(endDownTime).getTime(),
                                },
                              },
                            ],
                          },
                        ],
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
              //             $gte: startDownTime,
              //             $lte: endDownTime,
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
                        // TIME_STAMP: {
                        //   $gte: new Date(startDownTime),
                        //   $lte: new Date(endDownTime),
                        // },
                        $or: [
                          {
                            FROM_TIME: {
                              $gte: new Date(startDownTime).getTime(),
                              $lte: new Date(endDownTime).getTime(),
                            },
                          },
                          {
                            TO_TIME: {
                              $gte: new Date(startDownTime).getTime(),
                              $lte: new Date(endDownTime).getTime(),
                            },
                          },
                          {
                            $and: [
                              {
                                FROM_TIME: {
                                  $lte: new Date(startDownTime).getTime(),
                                },
                              },
                              {
                                TO_TIME: {
                                  $gte: new Date(endDownTime).getTime(),
                                },
                              },
                            ],
                          },
                        ],
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
                  path: "$DOWNTIME_REASONS",
                  preserveNullAndEmptyArrays: true,
                },
              },
              {
                $sort: {
                  "DOWNTIME_REASONS.TIME_STAMP": -1,
                },
              },
              {
                $group: {
                  _id: null,
                  DOWNTIME_REASONS: {
                    $push: "$DOWNTIME_REASONS",
                  },
                },
              },
            ]
          );

          downTimeReasons = downTimeReasons[0];

          let original: any = JSON.parse(JSON.stringify(downTimeReasons));
          let liveData: any = downTimeReasons.DOWNTIME_REASONS.find((x) => {
            return x.ORIGIN == "LIVE_STOPPED_STATUS";
          });
          if (liveData && Object.keys(liveData)) {
            let tempVar: any = downTimeReasons.DOWNTIME_REASONS;
            let liveIndex: any = tempVar.indexOf(liveData);
            tempVar.splice(liveIndex, 1);
            let duplicate: any = tempVar.findIndex((x) => {
              return x.FROM_TIME == liveData.FROM_TIME;
            });
            if (duplicate != -1) {
              downTimeReasons.DOWNTIME_REASONS = tempVar;
            } else {
              downTimeReasons = original;
            }
          }

          let dialog: any =
            downTimeReasons &&
            downTimeReasons["DOWNTIME_REASONS"] &&
            aggr[i].MACHINE_STATUS != 0
              ? downTimeReasons["DOWNTIME_REASONS"].map((e) => {
                  let x = `${e.TYPE} `;

                  if (e.FROM_TIME) {
                    x =
                      x +
                      `from ${new Date(
                        e.FROM_TIME
                      ).toLocaleTimeString()} (${new Date(
                        e.FROM_TIME
                      ).getFullYear()}-${new Date(
                        e.FROM_TIME
                      ).getMonth()}-${new Date(e.FROM_TIME).getDate()}) `;
                  }

                  if (e.TO_TIME) {
                    x =
                      x +
                      `to ${new Date(
                        e.TO_TIME
                      ).toLocaleTimeString()} (${new Date(
                        e.TO_TIME
                      ).getFullYear()}-${new Date(
                        e.TO_TIME
                      ).getMonth()}-${new Date(e.TO_TIME).getDate()}) `;
                  }

                  if (e.REASON) {
                    x = x + `due to ${e.REASON}`;
                  }

                  return x;
                })
              : [];
          for (let k = 0; k < lunchBreak.length; k++) {
            if (
              ((startDownTime < lunchBreak[k].from &&
                endDownTime > lunchBreak[k].from) ||
                (startDownTime < lunchBreak[k].to &&
                  endDownTime > lunchBreak[k].to) ||
                (lunchBreak[k].from < startDownTime &&
                  lunchBreak[k].to > startDownTime) ||
                (lunchBreak[k].from < endDownTime &&
                  lunchBreak[k].to > endDownTime)) &&
              aggr[i].MACHINE_STATUS != 0
            ) {
              dialog.push(
                `LUNCH BREAK from ${new Date(
                  lunchBreak[k].from
                ).toLocaleTimeString()} (${new Date(
                  lunchBreak[k].from
                ).getFullYear()}-${new Date(
                  lunchBreak[k].from
                ).getMonth()}-${new Date(
                  lunchBreak[k].from
                ).getDate()}) to ${new Date(
                  lunchBreak[k].to
                ).toLocaleTimeString()} (${new Date(
                  lunchBreak[k].to
                ).getFullYear()}-${new Date(
                  lunchBreak[k].to
                ).getMonth()}-${new Date(lunchBreak[k].to).getDate()})`
              );
              console.log("orki");
            }
          }
          if (dialog.length == 0 && aggr[i].MACHINE_STATUS != 0) {
            dialog.push("REASON UNKNOWN");
          }
          console.log(dialog);
          let temp = JSON.parse(
            JSON.stringify({
              x: x,
              y: [0, 1, 1, 0],
              mode: "markers",
              name: aggr[i].name,
              text: `${aggr[i].name}<br>${dialog.join("<br>")}<br>`,
              hoverlabel: {
                bordercolor: "rgb(100, 100, 100)",
                bgcolor: "rgb(240, 240, 240)",
              },
              hoverinfo: "text",
              line: { shape: "hv" },
              type: "scatter",
              fillcolor: aggr[i].fillcolor,

              fill: "toself",
              marker: {
                opacity: 0,
              },
            })
          );
          graphData["data"].push(temp);
        }
      }
      graphData["duration"] = {
        RUNNING: durationStatus["RUNNING"] / (1000 * 60),
        IDLE: durationStatus["IDLE"] / (1000 * 60),
        STOPPED: durationStatus["STOPPED"] / (1000 * 60),
        DISCONNECTED: durationStatus["DISCONNECTED"] / (1000 * 60),
      };
      return graphData;
    };

    let allShiftData: any = {};
    allShiftData["data"] = [];
    allShiftData["layout"] = {};

    let searchWithInShift = shiftTimeArray["shiftA1"];
    console.log("SHIFT time", searchWithInShift);
    let shiftData = await getShiftData(searchWithInShift, "shiftA1");
    allShiftData["data"] =
      shiftData && shiftData["data"] ? shiftData["data"] : [];
    allShiftData["layout"] =
      shiftData && shiftData["layout"] ? shiftData["layout"] : {};
    allShiftData["duration"] =
      shiftData && shiftData["duration"] ? shiftData["duration"] : {};
    // console.log(allShiftData);

    req.apiStatus = {
      isSuccess: true,
      data: allShiftData,
    };
    next();
    return;
  } catch (error) {
    console.log("error", error);

    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      data: "Something went wrong!",
    };
    next();
    return;
  }
}

export async function machineStatusDataOld(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let machineName: any = "";
  let selectedTime: any = new Date();

  if (req.body && req.body.machineName && req.body.dateTime) {
    machineName = req.body.machineName;
    selectedTime = req.body.dateTime;
  } else {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      data: "Machine/Date name not found",
    };
    next();
    return;
  }

  try {
    console.log("machineName", machineName);

    selectedTime = new Date(selectedTime).getTime();

    console.log("from time", selectedTime);

    let selectedDay6amTime = new Date(selectedTime + 6 * 60 * 60 * 1000);

    let selectedDay6pmTime = new Date(selectedTime + 18 * 60 * 60 * 1000);
    let selectedDay6_1pmTime = new Date(
      selectedTime + 18 * 60 * 60 * 1000 + 60 * 1000
    ); //shift B starts at 6 hr 1 minutes pm

    let nextDayofSelectedDay6amTime = new Date(
      selectedTime + 30 * 60 * 60 * 1000
    );

    console.log("selected day 6am time", selectedDay6amTime.toLocaleString());
    console.log("selected day  6pm time", selectedDay6pmTime.toLocaleString());

    console.log(
      "next day of selected day 6am time",
      nextDayofSelectedDay6amTime.toLocaleString()
    );
    let shiftTimeArray = {
      shiftA: {
        $gte: selectedDay6amTime,
        $lte: selectedDay6pmTime,
      },
      shiftB: {
        $gte: selectedDay6_1pmTime,
        $lte: nextDayofSelectedDay6amTime,
      },
    };

    let graphData = {}; // { shiftA: {}, shiftB: {},};

    let totalShifts = Object.keys(shiftTimeArray); // ["shiftA", "shifB"]

    for (let i = 0; i < totalShifts.length; i++) {
      let searchWithInShift = shiftTimeArray[totalShifts[i]];
      console.log("searchWithInShift", searchWithInShift);

      let dbData: any = await getCollectionObject(
        "OEE_MOLD_OUT",
        Dynamicmodel.schema
      ).aggregate([
        {
          $match: {
            TIME_STAMP: searchWithInShift,
            MACHINE_NAME: machineName,
          },
        },
        {
          $sort: {
            TIME_STAMP: 1,
          },
        },
        {
          $project: {
            MACHINE_STATUS: 1,
            TIME_STAMP: 1,
            _id: 1,
          },
        },
      ]);

      // console.log("dbData", dbData);

      let formatDataForGraph = (dbData) => {
        /**
       * 
       this function will return shift data
       {
         layout: {},
         data: [{},{}]
       }
       */

        let shiftData: any = {
          layout: {
            height: 250,
            width: "100%",
            showlegend: false,
            xaxis: {
              autorange: false,
              range: [0, 24],
              fixedrange: true,
              tickmode: "linear", //  If "linear", the placement of the ticks is determined by a starting position `tick0` and a tick step `dtick`
              tick0: 1,
              dtick: 1,
            },
          },
          data: [],
        };

        if (dbData && dbData.length) {
          let sets: any = {}; // {set1:{}, set2: {},set3: {}}

          let currentMachineStatus: any = -1; // -1 indicates undefined or status not found
          let nextMachineStatus: any = -1; // -1 indicates undefined or status not found

          let setObjIndex = 1;
          dbData.forEach(async (card, cardIndex) => {
            let setObj: any = {
              fill: "toself",
              // fillcolor: "#f44336",
              mode: "markers",
              type: "scatter",
              line: { shape: "hv" },
              marker: { opacity: 0 },
              machineStatus: "",
              x: [],
              y: [],
            };

            card = JSON.parse(JSON.stringify(card));
            // console.log("card", card);
            if (
              card.hasOwnProperty("TIME_STAMP") &&
              card.hasOwnProperty("MACHINE_STATUS")
            ) {
              // console.log("l2226", card.MACHINE_STATUS, currentMachineStatus);

              if (currentMachineStatus > -1) {
                // console.log("dbData[cardIndex + 1]", dbData[cardIndex + 1]);

                if (card.MACHINE_STATUS == currentMachineStatus) {
                  // console.log(
                  //   "l2230 matching",
                  //   card.MACHINE_STATUS,
                  //   currentMachineStatus,
                  //   card.TIME_STAMP
                  // );

                  sets["set" + setObjIndex].x.push(
                    new Date(card.TIME_STAMP).getHours() +
                      new Date(card.TIME_STAMP).getMinutes() / 60
                  );
                  if (
                    dbData[cardIndex + 1] &&
                    dbData[cardIndex + 1].MACHINE_STATUS == currentMachineStatus
                  ) {
                    // sets["set" + setObjIndex].y.push(1);
                  } else {
                    // sets["set" + setObjIndex].y.push(1); // last item in the set should be 0
                  }
                  sets["set" + setObjIndex].machineStatus = card.MACHINE_STATUS;
                  // sets["set" + setObjIndex] = setObj;
                } else {
                  // console.log(
                  //   "l2235",
                  //   card.MACHINE_STATUS,
                  //   currentMachineStatus
                  // );

                  setObjIndex++; // shifting from set1 to set2
                  currentMachineStatus = parseInt(card.MACHINE_STATUS);
                  setObj.x.push(
                    new Date(card.TIME_STAMP).getHours() +
                      new Date(card.TIME_STAMP).getMinutes() / 60
                  );
                  // setObj.y.push(1);
                  setObj.y = [0, 1, 1, 0];
                  setObj.machineStatus = card.MACHINE_STATUS;
                  // console.log("card.MACHINE_STATUS 2258", (card.MACHINE_STATUS));
                  let getCollorAndName: any = ColorAndNameByMachineStatus(
                    card.MACHINE_STATUS
                  );
                  setObj.name = getCollorAndName.name;
                  setObj.fillcolor = getCollorAndName.color;
                  sets["set" + setObjIndex] = setObj;
                }
              } else {
                // console.log("card.MACHINE_STATUS", card.MACHINE_STATUS);

                currentMachineStatus = parseInt(card.MACHINE_STATUS);
                setObj.x.push(
                  new Date(card.TIME_STAMP).getHours() +
                    new Date(card.TIME_STAMP).getMinutes() / 60
                );
                // setObj.y.push(1);
                setObj.y = [0, 1, 1, 0];
                setObj.machineStatus = card.MACHINE_STATUS;
                let getCollorAndName: any = ColorAndNameByMachineStatus(
                  card.MACHINE_STATUS
                );
                setObj.name = getCollorAndName.name;
                setObj.fillcolor = getCollorAndName.color;
                sets["set" + setObjIndex] = setObj;
                // console.log("setObj", sets["set" + setObjIndex]);
              }
            }

            setObj = {};
          });

          if (sets && Object.keys(sets).length) {
            for (let set in sets) {
              shiftData.data.push(sets[set]);
            }
          }

          // console.log("shiftData", shiftData);

          return shiftData;
        }
      };

      graphData[totalShifts[i]] = await formatDataForGraph(dbData);
    }

    // console.log("graphData", graphData);

    req.apiStatus = {
      isSuccess: true,
      data: graphData,
    };
    next();
  } catch (error) {
    console.log("error", error);

    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      data: "Something went wrong!",
    };
    next();
    return;
  }
}

const ColorAndNameByMachineStatus = (mahineStatus) => {
  let status = mahineStatus;
  let colorAndName = {
    color: "",
    name: "",
  };
  switch (parseInt(status)) {
    case 0:
      colorAndName.name = `RUNNING`;
      colorAndName.color = "#4caf50";
      break;

    case 1:
      colorAndName.name = `IDLE`;
      colorAndName.color = "#ffbf00";
      break;

    case 2:
      colorAndName.name = `STOPPED`;
      colorAndName.color = "#f44336";
      break;

    case 3:
      colorAndName.name = `DISCONNECTED`;
      colorAndName.color = "#a6a6a6";
      break;
  }

  return colorAndName;
};

export function getRange(shift) {
  //
  return [6, 24];
}
