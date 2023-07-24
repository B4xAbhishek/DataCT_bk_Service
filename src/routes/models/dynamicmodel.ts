import { NextFunction, query } from "express";
import mongoose = require("mongoose");
import { callbackify } from "util";
import { createBrotliCompress } from "zlib";
import { MACHINE_STATUS } from "../utils/constants";
const { getCollectionObject } = require("../seed/getmodel");

const Schema = mongoose.Schema;
export let schema = new Schema({}, { strict: false, versionKey: false });

//insert data
export var add = (data: JSON, collectionName: string, callBack: Function) => {
  let startTime: any = new Date();
  getCollectionObject(collectionName, schema).insertMany(
    [data],
    function (err, data) {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

//update data
export var updateOne = (
  data: JSON,
  id: string,
  collectionName: string,
  callBack: Function
) => {
  let startTime: any = new Date();
  getCollectionObject(collectionName, schema).updateOne(
    { _id: id },
    { $set: data },
    { upsert: false },
    function (err, data) {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, responseTime);
    }
  );
};

export var upsertOne = (
  collectionName: string,
  id: string,
  data: JSON,
  callBack: Function
) => {
  let startTime: any = new Date();
  getCollectionObject(collectionName, schema).updateOne(
    { _id: id },
    { $set: data },
    { upsert: true },
    function (err, data) {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, responseTime);
    }
  );
};

//find one
export var findOne = (
  id: string,
  collectionName: string,
  callBack: Function
) => {
  let startTime: any = new Date();
  getCollectionObject(collectionName, schema)
    .findById(id)
    .exec(function (err, data) {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    });
};
//delete data
export var deleteOne = (
  id: string,
  collectionName: string,
  callBack: Function
) => {
  let startTime: any = new Date();
  getCollectionObject(collectionName, schema).deleteOne(
    { _id: id },
    function (err) {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, responseTime);
    }
  );
};

//find data
export var findTableData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  // console.log();

  // console.log("query data of machine material", query);
  // console.log("options", options);
  // console.log("projection",projection);

  if (collectionName == "MACHINE_MATERIAL") {
    let aggArray: any = [
      {
        $match: { $and: [query] },
      },
      {
        $lookup: {
          from: "TAB_MATERIAL",
          localField: "MATERIAL",
          foreignField: "MATERIAL",
          as: "CombinedData",
        },
      },

      // {
      //   $sort: options.sort
      // },
      // {
      //   $skip: options.skip
      // },
      // {
      //   $limit: options.limit
      // },
    ];
    if (options.sort) {
      aggArray.push({ $sort: options.sort });
    }
    if (options.skip) {
      aggArray.push({ $skip: options.skip });
    }
    if (options.limit) {
      aggArray.push({ $limit: options.limit });
    }

    return getCollectionObject(collectionName, schema).aggregate(
      aggArray,
      (err, result) => {
        // console.log("result Finalllll",result);

        callBack(err, result);
      }
    );
  } else {
    let startTime: any = new Date();

    let aggArray: any = [];

    if (query && Object.keys(query).length) {
      console.log("query inside", query);

      aggArray.push({
        $match: { $and: [query] },
      });
    }

    aggArray.push({
      $lookup: {
        from: "TAB_MATERIAL",
        localField: "MATERIAL",
        foreignField: "MATERIAL",
        as: "CombinedData",
      },
    });

    if (options.sort) {
      aggArray.push({
        $sort: options.sort,
      });
    }

    if (options.limit) {
      aggArray.push(
        {
          $skip: options.skip,
        },
        {
          $limit: options.limit,
        }
      );
    }

    // example aggregate

    // [
    //   {
    //     $match: { $and: [query] },
    //   },
    //   {
    //     $lookup: {
    //       from: "TAB_MATERIAL",
    //       localField: "MATERIAL",
    //       foreignField: "MATERIAL",
    //       as: "CombinedData",
    //     },
    //   },
    //   {
    //     $sort: options.sort,
    //   },
    //   {
    //     $skip: options.skip,
    //   },
    //   {
    //     $limit: options.limit,
    //   },
    // ]

    console.log("aggArray", aggArray);

    if (collectionName == "MACHINE_MATERIAL") {
      return getCollectionObject(collectionName, schema).aggregate(
        aggArray,
        (err, result) => {
          // console.log("result Finalllll", result);

          callBack(err, result);
        }
      );
    } else {
      let startTime: any = new Date();

      return getCollectionObject(collectionName, schema).find(
        query,
        projection,
        options,
        (err, data) => {
          // console.log("options",options);
          // console.log("data inside dynamicmodel",data)
          let responseTime = new Date().getTime() - startTime.getTime();
          callBack(err, data, responseTime);
        }
      );
    }

    /////////////////
  }
  // return getCollectionObject(collectionName, schema).aggregate(
  //   [
  //     {
  //       $match: {
  //         $and: [
  //           query
  //         ],
  //       },
  //     },
  //      {

  //         $lookup: {
  //           from: "TAB_MATERIAL",
  //           localField: "MATERIAL",
  //           foreignField: "MATERIAL",
  //           as: "TAB_MATERIAL"
  //         },
  //       },
  //     //
  //         {
  //       $group: {
  //         _id: "$MACHINE_ID",
  //         data: {
  //           $push: {
  //             _id: "$_id",
  //             TIME_STAMP: "$TIME_STAMP",
  //             MACHINE_ID: "$MACHINE_ID",
  //             MATERIAL: "$MATERIAL",
  //             MATERIAL_DESCRIPTION: "$TAB_MATERIAL",
  //             SHIFT: "$SHIFT",
  //             FROM_TIME: "$FROM_TIME",
  //             TO_TIME: "$TO_TIME",
  //             DURATION: "$DURATION",
  //           },
  //         },
  //       },
  //     },
  //     {
  //       $sort: {
  //         _id: 1,
  //       },
  //     },
  //   ],

  //   (err, data) => {
  //     let responseTime = new Date().getTime() - startTime.getTime();
  //     // console.log("inside model ",data)
  //     callBack(err, data, responseTime);
  //   }
  // );
};

export var findTableDataAggregate = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: query,
      },
      {
        $project: {
          TIME_STAMP: 1,
          SUPERVISOR: 1,
          OPERATOR: 1,
          MACHINE_NAME: 1,
          SHIFT: 1,
          RAW_PRODUCTION_COUNT: {
            $toDouble: "$RAW_PRODUCTION_COUNT",
          },
          RAW_SHOT_COUNT: {
            $toDouble: "$RAW_SHOT_COUNT",
          },
          RAW_CAVITY: {
            $toDouble: "$RAW_CAVITY",
          },
          PLANNED_COUNT: {
            $toDouble: "$PLANNED_COUNT",
          },
          REJECT_COUNT: {
            $toDouble: "$REJECT_COUNT",
          },
          ACTUAL_CYCLE_TIME: {
            $toDouble: "$ACTUAL_CYCLE_TIME",
          },
          BREAK_TIME: {
            $toDouble: "$BREAK_TIME",
          },
          OEE: {
            $toDouble: "$OEE",
          },
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
        $sort: {
          TIME_STAMP: 1,
        },
      },
      {
        $group: {
          _id: {
            y: {
              $year: {
                date: "$TIME_STAMP",
                timezone: "+05:30",
              },
            },
            m: {
              $month: {
                date: "$TIME_STAMP",
                timezone: "+05:30",
              },
            },
            d: {
              $dayOfMonth: {
                date: "$TIME_STAMP",
                timezone: "+05:30",
              },
            },
            h: {
              $hour: {
                date: "$TIME_STAMP",
                timezone: "+05:30",
              },
            },
            machine_name: "$MACHINE_NAME",
            shift: "$SHIFT",
          },
          OPERATOR: {
            $first: "$OPERATOR",
          },
          SUPERVISOR: {
            $first: "$SUPERVISOR",
          },
          FROM_TIME: {
            $first: "$TIME_STAMP",
          },
          TO_TIME: {
            $last: "$TIME_STAMP",
          },
          SHIFT: {
            $first: "$SHIFT",
          },
          MACHINE_NAME: {
            $first: "$MACHINE_NAME",
          },
          RAW_SHOT_COUNT: {
            $push: "$RAW_SHOT_COUNT",
          },
          PLANNED_COUNT: {
            $push: "$PLANNED_COUNT",
          },
          RAW_PRODUCTION_COUNT: {
            $push: "$RAW_PRODUCTION_COUNT",
          },
          RAW_CAVITY: {
            $push: "$RAW_CAVITY",
          },
          REJECT_COUNT: {
            $push: "$REJECT_COUNT",
          },
          BREAK_TIME: {
            $avg: "$BREAK_TIME",
          },
          ACTUAL_CYCLE_TIME: {
            $avg: "$ACTUAL_CYCLE_TIME",
          },
          OEE: {
            $avg: "$OEE",
          },
          AVAILABILITY: {
            $avg: "$AVAILABILITY",
          },
          PERFORMANCE: {
            $avg: "$PERFORMANCE",
          },
          QUALITY: {
            $avg: "$QUALITY",
          },
        },
      },
      {
        $sort: {
          FROM_TIME: 1,
        },
      },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      console.log("inside model ", err);
      callBack(err, data, responseTime);
    }
  );
};

export var find = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  // return getCollectionObject(collectionName, schema).find(query, projection, options, (err, data)=> {
  return getCollectionObject(collectionName, schema).find(
    query,
    projection,
    options,
    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var findWithoutCB = async (
  collectionName: string,
  query: any,
  projection: any,
  options: any
) => {
  let startTime: any = new Date();
  // return getCollectionObject(collectionName, schema).find(query, projection, options, (err, data)=> {
  try {
    let data = await getCollectionObject(collectionName, schema).find(
      query,
      projection,
      options
    );
    return data;
  } catch (err) {
    return err;
  }
};

export var findWithSearchString = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  searchString: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  if (options) {
    // // console.log("options", options);
  }
  // return getCollectionObject(collectionName, schema).find(query, projection, options, (err, data)=> {
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $match: {
          $or: [
            {
              MACHINE_NAME: {
                $regex: new RegExp(searchString, "i"),
              },
            },
            {
              MATERIAL_DESCRIPTION: {
                $regex: new RegExp(searchString, "i"),
              },
            },
            {
              SAP_CODE: {
                $regex: new RegExp(searchString, "i"),
              },
            },
            {
              SHIFT: {
                $regex: new RegExp(searchString, "i"),
              },
            },
          ],
        },
      },
    ],
    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var oeeGraphData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).find(
    query,
    projection,
    options,
    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var stackedGraphData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  console.log("query", query);

  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $group: {
          _id: {
            mid: "$MACHINE_ID",
            reason: "$REASON",
          },
          duration: {
            $sum: "$DURATION",
          },
        },
      },
      {
        $group: {
          _id: "$_id.mid",
          data: {
            $push: {
              reason: "$_id.reason",
              duration: "$duration",
            },
          },
        },
      },
      {
        $project: {
          name: "$_id",
          data: "$data",
        },
      },
      //     {
      //       $lookup: {
      //           from: 'MACHINE_LIST',
      //           localField: 'name',
      //           foreignField: 'MACHINE_ID',
      //           as: 'machineName'
      //       }
      //   },
      //   {
      //     $project: {
      //         name: '$_id',
      //         data: '$data',
      //         MachineName: '$machineName'
      //     }
      // },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var rejectionGraphData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  // console.log(projection, "111")
  // console.log(query, "000")
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $group: projection,
      },
      { $sort: { _id: 1 } },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var rejectionCounterData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $group: projection,
      },
      { $sort: { _id: 1 } },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var mouldGraphData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  // console.log("query",query);

  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $lookup: {
          from: "TAB_MATERIAL",
          localField: "MATERIAL",
          foreignField: "MATERIAL",
          as: "TAB_MATERIAL",
        },
      },
      {
        $lookup: {
          from: "MACHINE_LIST",
          localField: "MACHINE_ID",
          foreignField: "MACHINE_ID",
          as: "merge",
        },
      },
      //
      {
        $group: {
          _id: "$MACHINE_ID",
          data: {
            $push: {
              _id: "$_id",
              machineName: "$merge",
              TIME_STAMP: "$TIME_STAMP",
              MACHINE_ID: "$MACHINE_ID",
              MATERIAL: "$MATERIAL",
              MATERIAL_DESCRIPTION: "$TAB_MATERIAL",
              SHIFT: "$SHIFT",
              FROM_TIME: "$FROM_TIME",
              TO_TIME: "$TO_TIME",
              DURATION: "$DURATION",
            },
          },
        },
      },
      {
        $lookup: {
          from: "MACHINE_LIST",
          localField: "_id",
          foreignField: "MACHINE_ID",
          as: "displayName",
        },
      },
      {
        $unwind: {
          path: "$displayName",
        },
      },

      {
        $sort: {
          _id: 1,
        },
      },
    ],

    (err, data) => {
      // console.log("MaachineData",data);

      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var distinct = (
  collectionName: string,
  param: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  const model = getCollectionObject(collectionName, schema);
  // return getCollectionObject(collectionName, schema).find(query, projection, options, (err, data)=> {
  return model.distinct(param, {}, (err, data) => {
    let responseTime = new Date().getTime() - startTime.getTime();
    callBack(err, data, responseTime);
  });
};

export var getEnergyCounter = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  console.log("query", query);

  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $project: {
          // convertedDate: {
          //   $toDate: "$TIME_STAMP",
          // },
          convertedDate: "$TIME_STAMP",
          MACHINE_NAME: "$MACHINE_NAME",
          SHIFT: "$SHIFT",
          WH: "$WH",
          WATTS_TOTAL: "$WATT_TOTAL",
        },
      },
      {
        $sort: {
          convertedDate: 1,
        },
      },
      {
        $group: {
          _id: {
            mid: "$MACHINE_NAME",
            // shift: "$SHIFT",
            day: {
              // $dayOfMonth: "$convertedDate",
              $dayOfMonth: { date: "$convertedDate", timezone: "+05:30" },
            },
            month: {
              $month: { date: "$convertedDate", timezone: "+05:30" },
            },
            year: {
              $year: { date: "$convertedDate", timezone: "+05:30" },
            },
          },
          WH: {
            $push: {
              $toDouble: "$WH",
            },
          },
          WATTS_TOTAL: {
            $push: {
              $toDouble: "$WATTS_TOTAL",
            },
          },
        },
      },
    ],

    (err, data) => {
      // console.log("Aggregate data",data);

      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var counterOeeQuery = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $project: {
          convertedDate: "$TIME_STAMP",
          MACHINE_NAME: "$MACHINE_NAME",
          SHIFT: "$SHIFT",
          MATERIAL_DESCRIPTION: "$MATERIAL_DESCRIPTION",
          RAW_PRODUCTION_COUNT: "$RAW_PRODUCTION_COUNT",
          RAW_SHOT_COUNT: "$RAW_SHOT_COUNT",
        },
      },
      {
        $sort: {
          convertedDate: 1,
        },
      },
      {
        $group: {
          _id: {
            mid: "$MACHINE_NAME",
            shift: "$SHIFT",
            material: "$MATERIAL_DESCRIPTION",
            day: {
              $dayOfMonth: "$convertedDate",
            },
            month: {
              $month: "$convertedDate",
            },
            year: {
              $year: "$convertedDate",
            },
          },
          RAW_PRODUCTION_COUNT: {
            $push: "$RAW_PRODUCTION_COUNT",
          },
          RAW_SHOT_COUNT: {
            $push: "$RAW_SHOT_COUNT",
          },
        },
      },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var getDocumentCount = (
  collectionName: string,
  query: any,
  callBack: Function
) => {
  return getCollectionObject(collectionName, schema).countDocuments(
    query,
    (err, count) => {
      callBack(err, count);
    }
  );
};

export var machineBreakdownData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $match: {
          $and: [query],
        },
      },
      {
        $group: {
          _id: "$REASON",
          durationArray: {
            $push: "$DURATION",
          },
          count: {
            $sum: {
              $cond: [
                {
                  $eq: ["$DURATION", 0],
                },
                0,
                1,
              ],
            },
          },
          duarionSum: {
            $sum: "$DURATION",
          },
        },
      },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

export var findLatestOEEBYMachineName = (
  collectionName: string,
  machine: string,
  callBack: Function
) => {
  let startTime: any = new Date();
  getCollectionObject(collectionName, schema)
    .findOne({ MACHINE_NAME: machine })
    .exec(function (err, data) {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    });
};

export var overallPlantData = (
  collectionName: string,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) => {
  let startTime: any = new Date();
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $lookup: {
          from: "OEE_MOLD_OUT",
          as: "OEE_MOLD_OUT",
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
            {
              $sort: {
                TIME_STAMP: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                AVAILABILITY: 1,
                PERFORMANCE: 1,
                QUALITY: 1,
                OEE: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$OEE_MOLD_OUT",
          preserveNullAndEmptyArrays: true,
        },
      },
    ],

    (err, data) => {
      let responseTime = new Date().getTime() - startTime.getTime();
      callBack(err, data, responseTime);
    }
  );
};

// for collections crud

export var addRecord: any = (collectionName: string, data: any): any => {
  let startTime: any = new Date();
  if (data && !data.length) {
    data = [data];
  }
  return getCollectionObject(collectionName, schema).insertMany(data);
};

// update record

export var updateRecord: any = (
  collectionName: string,
  id: any,
  data: any
): any => {
  return getCollectionObject(collectionName, schema).updateOne(
    { _id: id },
    { $set: data },
    { upsert: false }
  );
};

export var deleteRecord: any = (collectionName: string, id: any): any => {
  return getCollectionObject(collectionName, schema).deleteOne({ _id: id });
};

export var aggregate: any = (
  collectionName: string,
  aggregateArray: any
): any => {
  return getCollectionObject(collectionName, schema)
    .aggregate(aggregateArray)
    .exec();
};

export var getTotalCountByAggregate = function (collectionName, array: any) {
  return getCollectionObject(collectionName, schema).aggregate([
    ...array,
    { $count: "total_count" },
  ]);
};

//aggregate for Material_machine && Tab_material

export var getMaterialDescriptionAgg = function (
  collectionName: any,
  array: any,
  callBack: Function
) {
  console.log("907", collectionName);

  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $lookup: {
          from: "TAB_MATERIAL",
          localField: "MATERIAL",
          foreignField: "MATERIAL",
          as: "COMBINEDDATA",
        },
      },
    ],
    (err: any, data: any) => {
      console.log("data", data);

      callBack(err, data);
    }
  );
};

/// separate API for MachineStatus

export var getMachineStatus = function (
  collectionName: any,
  array: any,
  callBack: Function
) {
  return getCollectionObject(collectionName, schema).aggregate(
    [
      {
        $project: {
          MACHINE_ID: 1,
          MACHINE_DISPLAY: 1,
          MACHINE_LV: 1,
        },
      },
      {
        $lookup: {
          from: "OEE_MOLD_OUT",
          as: "latestData",
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
            {
              $sort: {
                TIME_STAMP: -1,
              },
            },
            {
              $limit: 1,
            },
            {
              $project: {
                MACHINE_NAME: "$MACHINE_NAME",
                MACHINE_STATUS: "$MACHINE_STATUS",
                OEE: "$OEE",
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$latestData",
          includeArrayIndex: "latestDataIndex",
          preserveNullAndEmptyArrays: true,
        },
      },
    ],
    (err: any, data: any) => {
      // console.log("dataaaaaaaaaaaaaaaaaaa",data.length);

      callBack(err, data);
    }
  );
};

/// separate API for machineID & machineName

export var getAllMachineData = function (
  collectionName: any,
  query: any,
  projection: any,
  options: any,
  callBack: Function
) {
  return getCollectionObject(collectionName, schema).find(
    query,
    projection,
    options,
    (err, data) => {
      callBack(err, data);
    }
  );
};
