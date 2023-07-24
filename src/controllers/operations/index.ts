import {
  add,
  updateOne,
  findOne,
  deleteOne,
  find,
  getDocumentCount,
  distinct,
} from "../../models/dynamicmodel";
import { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "../../models/models";
import * as logger from "../../models/logs";
import { config } from "../../config/config";
// import { formArray } from "../../controllers/operations/common";
// import { processRequest } from "../../controllers/operations/dataFetch";

//create
export function addData(req: Request | any, res: Response, next: NextFunction) {
  var collectionName: string = req.params.collectionName;
  var data: JSON = req.body;

  logger.debug(
    logger.DEFAULT_MODULE,
    "",
    "collection name : " + collectionName + " data : " + data
  );

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

  findAnyOne(data, collectionName, (isDataFound = false) => {

    if (isDataFound) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1007],
        data: {},
      };
      next();
      return;
    }

    add(data, collectionName, (err: any, response: any, responseTime: any) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1003],
          data: err,
        };
        next();
        return;
      }
  
      req.apiStatus = {
        isSuccess: true,
        message: "DATA ADD SUCCESSFUL",
        responseTime: responseTime,
        timestamp: new Date(),
        data: response,
      };
  
      next();
    });

  })

}

//update
export function updateData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var collectionName: string = req.params.collectionName;
  var id: string = req.params.id;
  var data: JSON = req.body;

  logger.debug(
    logger.DEFAULT_MODULE,
    "",
    "collection name : " + collectionName + " id : " + id + " data : " + data
  );

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

  updateOne(data, id, collectionName, (err: any, responseTime: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true,
      message: "DATA UPDATE SUCCESSFUL",
      responseTime: responseTime,
      timestamp: new Date(),
    };

    next();
  });
}

//delete
export function deleteData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var collectionName: string = req.params.collectionName;
  var id = req.params.id;

  logger.debug(
    logger.DEFAULT_MODULE,
    "",
    "collection name : " + collectionName + "id : " + id
  );

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

  deleteOne(id, collectionName, (err: any, responseTime: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true,
      message: "DATA DELETED",
      responseTime: responseTime,
      timestamp: new Date(),
    };

    next();
  });
}

//read
export function findOneData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var collectionName: string = req.params.collectionName;
  var id: string = req.params.id;

  logger.debug(
    logger.DEFAULT_MODULE,
    "",
    "collection name : " + collectionName + " id : " + id
  );

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

  findOne(id, collectionName, (err: any, response: any, responseTime: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true,
      message: "GET DATA SUCCESSFUL",
      timestamp: new Date(),
      responseTime: responseTime,
      data: response,
    };

    next();
  });
}

//read all
export function findAllData(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let query: any = {};
  let projection: any = {};
  let options: any = { sort: { createdAt: -1 } };
  let collectionName: any = req.params.collectionName;

  let page;
  let limit;

  try {
    if (req.query.page && parseInt(req.query.page) > 1) {
      page = parseInt(req.query.page);
    }

    if (req.query.limit && parseInt(req.query.limit) > 0) {
      limit = parseInt(req.query.limit);
    }
  } catch (err) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: err,
    };
    next();
    return;
  }

  if (page && limit) {
    const startIndex = (page - 1) * limit;
    options.limit = limit;
    options.skip = startIndex;
  }

  find(
    collectionName,
    query,
    projection,
    options,
    (err: any, response: any, responseTime: any) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1003],
          data: err,
        };
        next();
        return;
      }

      getDocumentCount(collectionName, query, (err: any, totalCount: any) => {
        if (err) {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1003],
            data: err,
          };
          next();
          return;
        }

        req.apiStatus = {
          isSuccess: true,
          data: { list: response, total: totalCount },
        };

        next();
      });
    }
  );
}

export function findAnyOne(
  query: any,
  collectionName: any,
  cb: Function
) {
  let projection: any = {};
  let options: any = { sort: { createdAt: -1 } };
  let limit = 1;


  if (limit) {
    options.limit = limit;
  }

  find(
    collectionName,
    query,
    projection,
    options,
    (err: any, response: any, responseTime: any) => {
      if (err) {
        cb(false);
        return;
      }

      if (response && response.length > 0) {
        console.log("findAnyOneData", response);
        cb(true)
        return;
      }
      cb(false);
    }
  );
}

// =============== Apis for  filter params==========

export function getAllReasons(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("inside get all machinde ids");

  let query: any = {};
  let project: any = { REASON: 1 };
  let options: any = {};
  let collectionName: any = req.params.collectionName;

  find(
    collectionName,
    query,
    project,
    options,
    (err: any, responseList: any) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1003],
          data: err,
        };
        next();
        return;
      }

      req.apiStatus = {
        isSuccess: true,
        data: responseList,
      };

      next();
    }
  );
}

export function getmatrialListForBreakdown(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("inside getmatrialListForBreakdown");

  // let query: any = {};
  // let projection: any = {};
  // let options: any = { sort: { createdAt: -1 } };
  let collectionName: any = req.params.collectionName;

  distinct(
    collectionName,
    "MATERIAL",
    (err: any, responseList: any, responseTime: any) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1003],
          data: err,
        };
        next();
        return;
      }

      if (responseList && responseList.length) {
        // console.log("responseList", responseList);

        let query: any = { MATERIAL: { $in: responseList } };
        let project: any = { MATERIAL: 1, MATERIAL_DESCRIPTION: 1 };
        // let project: any = { };
        let options: any = {};

        let Cname = "TAB_MATERIAL";
        find(Cname, query, project, options, (err: any, materialList: any) => {
          if (err) {
            req.apiStatus = {
              isSuccess: false,
              error: ErrorCodes[1003],
              data: err,
            };
            logger.error(
              logger.LogModule.ROUTE,
              req.txId,
              "Failed to query: queryTabMaterials"
            );
            next();
            return;
          }

          req.apiStatus = {
            isSuccess: true,
            data: materialList,
          };
          

          next();
        });
      } else {
        logger.error(
          logger.LogModule.ROUTE,
          req.txId,
          "Breakdown material list not found"
        );
        req.apiStatus = {
          isSuccess: true,
          data: [],
        };

        next();
      }
    }
  );
}

export function getAllMachineIds(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("inside get all machinde ids");

  let query: any = {};
  let project: any = { MACHINE_ID: 1 ,MACHINE_DISPLAY:1};
  let options: any = { sort: { MACHINE_ID: 1 }};
  let collectionName: any = req.params.collectionName;

  find(
    collectionName,
    query,
    project,
    options,
    (err: any, responseList: any) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1003],
          data: err,
        };
        next();
        return;
      }
     console.log(responseList)
      req.apiStatus = {
        isSuccess: true,
        data: responseList,
      };

      next();
    }
  );
}

export function getmatrialListForOee(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("inside getAllTabMaterial");

  let query: any = {};
  let project: any = { MATERIAL: 1, MATERIAL_DESCRIPTION: 1 };
  let options: any = {};
  let collectionName: any = req.params.collectionName;

  distinct(
    collectionName,
    "MATERIAL_DESCRIPTION",
    (err: any, responseList: any) => {
      if (err) {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1003],
          data: err,
        };
        logger.error(
          logger.LogModule.ROUTE,
          req.txId,
          "Failed to query: queryOeeOutMaterialDesc"
        );
        next();
        return;
      }

      if (responseList && responseList.length) {
        try {
          // filter for "", undefined, null
          // const uniqueArray:any = responseList.filter(item=> item)

          // responseList = [1,2, "", " ", undefined, null,"null","NaN", "success"]
          var materialList: any = [];
          var i = 1;
          responseList.forEach((item: any) => {
            if (
              item != null &&
              item != "null" &&
              item != undefined &&
              item != "NaN" &&
              item != "" &&
              item != " "
            ) {
              materialList.push({ id: i, MATERIAL_DESCRIPTION: item });
              i++;
            }
          });
        } catch {
          logger.error(
            logger.LogModule.ROUTE,
            req.txId,
            "Failed to filter oee material list"
          );
          req.apiStatus = {
            isSuccess: true,
            data: [],
          };

          next();
        }

        req.apiStatus = {
          isSuccess: true,
          data: materialList,
        };

        next();
      } else {
        logger.error(
          logger.LogModule.ROUTE,
          req.txId,
          "Oee material list not found"
        );
        req.apiStatus = {
          isSuccess: true,
          data: [],
        };

        next();
      }
    }
  );
}

export function getmatrialListForRejection(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  // console.log("inside getmatrialListForRejection");

  let query: any = {};
  let project: any = {};
  let options: any = {};
  let collectionName: any = req.params.collectionName;

  distinct(collectionName, "MOULD", (err: any, responseList: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      logger.error(
        logger.LogModule.ROUTE,
        req.txId,
        "Failed to query: queryRejMaterialDesc"
      );
      next();
      return;
    }

    if (responseList && responseList.length) {
      try {
        // filter for "", undefined, null
        // const uniqueArray:any = responseList.filter(item=> item) -->method1

        // responseList = [1,2, "", " ", undefined, null,"null","NaN", "success"] //--> method2
        var materialList: any = [];
        var i = 1;
        responseList.forEach((item: any) => {
          if (
            item != null &&
            item != "null" &&
            item != undefined &&
            item != "NaN" &&
            item != "" &&
            item != " "
          ) {
            materialList.push({ id: i, MATERIAL_DESCRIPTION: item });
            i++;
          }
        });
      } catch {
        logger.error(
          logger.LogModule.ROUTE,
          req.txId,
          "Failed to filter rejection material list"
        );
        req.apiStatus = {
          isSuccess: true,
          data: [],
        };

        next();
      }

      req.apiStatus = {
        isSuccess: true,
        data: materialList,
      };

      next();
    } else {
      logger.error(
        logger.LogModule.ROUTE,
        req.txId,
        "Rejection material list not found"
      );
      req.apiStatus = {
        isSuccess: true,
        data: [],
      };

      next();
    }
  });
}
