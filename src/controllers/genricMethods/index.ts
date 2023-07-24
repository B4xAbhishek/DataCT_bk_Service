import { Request, Response, NextFunction } from "express";
import { config } from "../../config/config";
import { ErrorCodes } from "../../models/models";
import * as logger from "../../models/logs";
import * as DynamicModel from "../../models/dynamicmodel";
import { collectionFields } from "../../utils/constants";
import { Timestamp } from "mongodb";

// const config = new Config();

export async function createRecord(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  //get the collection name
  // get the record to crete entry
  // check the collection existance
  // add entry with awiat method

  console.log("Inside createRecord", req.body);
  console.log("req.user", req.user);

  try {
    let collectionName = req.params.collectionName;

    let newRecord = req.body;
    // newRecord.userinfo = req.user
    console.log("newRecord", newRecord);

    if (!collectionName || !newRecord) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1001],
        customMsg: "Misiing collection name || new reocrd",
        data: {},
      };
      next();
      return;
    }

    if (
      collectionFields &&
      collectionFields[collectionName] &&
      collectionFields[collectionName].length
    ) {
      if (collectionFields[collectionName].includes("TIME_STAMP")) {
        newRecord["TIME_STAMP"] = new Date().getTime();
      }
    }

    let addRecordResult = await DynamicModel.addRecord(
      collectionName,
      newRecord
    );

    if (addRecordResult) {
      req.apiStatus = {
        isSuccess: true,
        customMsg: "DATA ADD SUCESSFULL",
        data: {},
      };
      next();
      return;
      // req.apiStatus = {
      //   isSuccess: false,
      //   error: ErrorCodes[1002],
      //   customMsg: "FAILED TO ADD DATA",
      //   data: {},
      // };
      // next();
      // return;
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        customMsg: "FAILED TO ADD DATA",
        data: {},
      };
      next();
      return;
    }
  } catch (error) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      customMsg: "FAILED TO ADD DATA",
      data: {},
    };
    next();
    return;
  }
}

export async function getRecords(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("Inside getRecords");

  try {
    let { page, limit, sortBy, sortDirection, searchData } = req.body;

    let collectionName = req.params.collectionName;

    if (!collectionName) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1001],
        customMsg: "Misiing collection name",
        data: {},
      };
      next();
      return;
    }

    let aggregateArray: any = [];

    // Prepare search regex
    let searchRegex: any = [];
    if (searchData && Object.keys(searchData).length) {
      for (let key in searchData) {
        let searchObj: any = {};
        searchObj[key] = {
          $regex: searchData[key],
          $options: "i",
        };
        searchRegex.push(searchObj);
      }
    }

    if (searchRegex && searchRegex.length) {
      aggregateArray.push({
        $match: {
          $or: searchRegex,
        },
      });
    }

    // Prepare search regex ends ===========

    // get totalCount

    let counterAggArray = JSON.parse(JSON.stringify(aggregateArray));
    console.log(counterAggArray);

    let totalDocs = await DynamicModel.getTotalCountByAggregate(
      collectionName,
      counterAggArray
    );

    const totalCount = totalDocs && totalDocs[0] ? totalDocs[0].total_count : 0;

    if (!totalCount) {
      req.apiStatus = {
        isSuccess: true,
        customMsg: "NO RECORDS FOUND",
        data: {},
      };
      next();
      return;
    }
    // total count query ends ================

    // preparing skip and limit

    let skip;
    try {
      if (page && limit) {
        page = parseInt(page);
        limit = parseInt(limit);

        skip = (page - 1) * limit;
      } else {
        console.log("d1");

        limit = 10;
      }
    } catch (error) {
      console.log("d2", error);

      limit = 10;
    }

    aggregateArray.push({ $skip: skip ? skip : 0 });
    aggregateArray.push({ $limit: limit });

    // skip and limit ends ============

    // preparing sort

    if (sortBy && sortDirection) {
      let sortObj: any = {};
      sortObj[sortBy] = sortDirection;
      aggregateArray.push({
        $sort: sortObj,
      });
    }
    //sort code ends ==============

    console.log("aggregateArray", JSON.stringify(aggregateArray));

    let getAllRecordsResult = await DynamicModel.aggregate(
      collectionName,
      aggregateArray
    );

    if (getAllRecordsResult) {
      const modifiedData = (getAllRecordsResult) => {
        let data: any = [];
        if (getAllRecordsResult && getAllRecordsResult.length) {
          getAllRecordsResult.forEach((card) => {
            card = JSON.parse(JSON.stringify(card));
            if (card && card.TIME_STAMP) {
              card.TIME_STAMP = new Date(card.TIME_STAMP).toLocaleString();
            }
            data.push(card);
          });
        }
        return data;
      };
      req.apiStatus = {
        isSuccess: true,
        customMsg: "DATA FETCH SUCESSFULL",
        data: {
          totalCount: totalCount,
          list: await modifiedData(getAllRecordsResult),
        },
      };
      next();
      return;
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1004],
        customMsg: "FAILED TO FETCH DATA",
        data: {},
      };
      next();
      return;
    }
  } catch (error) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1004],
      customMsg: "FAILED TO FETCH DATA",
      data: {},
    };
    next();
    return;
  }
}

export async function updateRecord(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("Inside updateRecord");

  try {
    let collectionName = req.params.collectionName;
    let id = req.params.id;

    let updateRecord = req.body;

    if (!collectionName || !id || !updateRecord) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1001],
        customMsg: "Misiing collection name || new reocrd",
        data: {},
      };
      next();
      return;
    }

    if (updateRecord && updateRecord["TIME_STAMP"]) {
      updateRecord["TIME_STAMP"] = new Date().getTime();
    }

    let updateRecordResult = await DynamicModel.updateRecord(
      collectionName,
      id,
      updateRecord
    );

    if (updateRecordResult) {
      req.apiStatus = {
        isSuccess: true,
        customMsg: "DATA UPDATE SUCESSFULL",
        data: {},
      };
      next();
      return;
      // req.apiStatus = {
      //   isSuccess: false,
      //   error: ErrorCodes[1002],
      //   customMsg: "FAILED TO ADD DATA",
      //   data: {},
      // };
      // next();
      // return;
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1007],
        customMsg: "FAILED TO UPDATE DATA",
        data: {},
      };
      next();
      return;
    }
  } catch (error) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1007],
      customMsg: "FAILED TO UPDATE DATA",
      data: {},
    };
    next();
    return;
  }
}

export async function deleteRecord(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("Inside deleteRecord");

  try {
    let collectionName = req.params.collectionName;
    let id = req.params.id;

    if (!collectionName || !id) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1001],
        customMsg: "Misiing collection name || new reocrd",
        data: {},
      };
      next();
      return;
    }

    let deleteRecordResult = await DynamicModel.deleteRecord(
      collectionName,
      id
    );

    if (deleteRecordResult) {
      req.apiStatus = {
        isSuccess: true,
        customMsg: "DATA DELETE SUCESSFULL",
        data: {},
      };
      next();
      return;
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1007],
        customMsg: "FAILED TO DELETE DATA",
        data: {},
      };
      next();
      return;
    }
  } catch (error) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1007],
      customMsg: "FAILED TO DELETE DATA",
      data: {},
    };
    next();
    return;
  }
}

///Add Machine data with CSV file is not implemented right now just to check with add data///

export function createAddRecord(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("Inside function");
  try {
    console.log("inside try function");

    let collectionName = req.params.collectionName;
    // let addNewRecord = req.body;
    let addNewRecord = req.body;

    if (!collectionName || !addNewRecord) {
      console.log("Inside if condition");

      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1001],
        custoMsg: "Missing collection name || new record",
        data: {},
      };
      next();
      return;
    }
    if (
      collectionFields &&
      collectionFields[collectionName] &&
      collectionFields[collectionName].length
    ) {
      console.log("inside 2 if condition");

      if (collectionFields[collectionName].includes("TIME_STAMP")) {
        addNewRecord["addNewRecord"] = new Date().getTime();
      }
    }

    let AddRecordResult = DynamicModel.addRecord(collectionName, addNewRecord);
    console.log("inside addRecord function");

    if (AddRecordResult) {
      console.log("Data Success");

      req.apiStatus = {
        isSuccess: true,
        custoMsg: "DATA ADD SUCCESSFULL",
        data: {},
      };
      next();
      return;
    } else {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        custoMsg: "FAILED TO ADD DATA",
        data: {},
      };
      next();
      return;
    }
  } catch (error) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      custoMsg: "FAILED TO ADD DATA",
      data: {},
    };
    next();
    return;
  }
}

export async function addCsvRecords(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  if (req.skip != true) {
    // console.log('Inside addCsvRecords',req.file)
    // console.log('Inside addCsvRecords',req.files)
    try {
      let csvRecords = req.convertedData;
      console.log("csvRecords", csvRecords);
      let collectionName = req.params.collectionName;
      // let addNewRecord = req.body;

      if (!collectionName || !csvRecords) {
        console.log("inside if collection");

        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1001],
          customMsg: "Missing collection name || new record",
          data: {},
        };
        next();
        return;
      }

      let modifiedArray: any = [];

      if (
        collectionFields &&
        collectionFields[collectionName] &&
        collectionFields[collectionName].length
      ) {
        if (collectionFields[collectionName].includes("TIME_STAMP")) {
          for (let i = 0; i < csvRecords.length; i++) {
            let obj = csvRecords[i];

            obj["TIME_STAMP"] = new Date().getTime();
            modifiedArray.push(obj);
          }
        } else {
          modifiedArray = csvRecords;
        }
      }

      let AddRecordResult = await DynamicModel.addRecord(
        collectionName,
        modifiedArray
      );

      if (AddRecordResult) {
        req.apiStatus = {
          isSuccess: true,
          customMsg: "DATA ADD SUCCESSFULL",
          data: {},
        };
        next();
        return;
      } else {
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1002],
          customMsg: "FAILED TO ADD DATA",
          data: {},
        };
        next();
        return;
      }
    } catch (error) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        customMsg: "FAILED TO ADD DATA",
        data: {},
      };
      next();
      return;
    }
  } else {
    next();
  }
}

export async function validateCsvRecords(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  if (req.skip) {
    next();
    return;
  }
  try {
    let csvRecords = req.convertedData;
    let collectionName = req.params.collectionName;

    if (!collectionName || !csvRecords || !csvRecords.length) {
      req.skip = true;
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1001],
        customMsg: "Missing collection name || new record",
        data: {},
      };
      next();
      return;
    }

    if (
      collectionFields &&
      collectionFields[collectionName] &&
      collectionFields[collectionName].length
    ) {
      for (let i = 0; i < collectionFields[collectionName].length; i++) {

        // Skip checks for 'createdAt' or 'TIME_STAMP'
        if (collectionFields[collectionName][i] === 'createdAt' ||
          collectionFields[collectionName][i] === 'TIME_STAMP') {
          continue;
        }

        if (!csvRecords[0].hasOwnProperty(collectionFields[collectionName][i])) {
          console.log('CSV Field Validation Failed', collectionFields[collectionName][i]);
          req.skip = true;
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1008],
            customMsg: "FAILED TO VALIDATE DATA",
            data: {},
          };
          next();
          return;
        }
      }
      next();
    } else {
      console.log('CSV Validation Failed');
      req.skip = true;
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1008],
        customMsg: "FAILED TO VALIDATE DATA",
        data: {},
      };
      next();
      return;
    }
  } catch (error) {
    req.skip = true;
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1005],
      customMsg: "FAILED TO VALIDATE DATA",
      data: {},
    };
    next();
    return;
  }
}
