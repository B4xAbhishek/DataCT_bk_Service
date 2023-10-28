import * as logger from "../../models/logs";
import {
  getConditionAttribute,
  formKeyValue,
  formData,
  formDateData,
  checkConditions,
  countMachine,
  getMachineAttribute,
  getReasonAttribute,
  getMaterialAttribute,
} from "./common";
import { config } from "../../config/config";
import {
  getDocumentCount,
  find,
  oeeGraphData,
  stackedGraphData,
  rejectionGraphData,
  findWithSearchString,
  findTableData,
  findTableDataAggregate,
  rejectionCounterData,
  getEnergyCounter,
  counterOeeQuery,
  mouldGraphData,
} from "../../models/dynamicmodel";
import { CONSTANTS } from "../../utils/constants";
import moment from "moment";
moment().format();
import * as _ from "lodash";
import { NextFunction } from "express";
import * as DynamicModels from '../../models/dynamicmodel'

// const options = { sort: { _id: -1 }, limit: Number(config.recordLimit) };
// const options: any = { sort: { TIME_STAMP: 1 } };
let options: any = { sort: { TIME_STAMP: 1 } };

export const search = (
  collectionName: any,
  condition: JSON,
  page: any,
  limit: any,
  sort: any,
  direction: any,
  searchString: any
) => {
  
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");

      output = await prepareQuery(date, parameters, output);

      // console.log("output fom postman",output);

      // if (collectionName == "OEE_MOLD_OUT") {
      //   delete output["MATERIAL_DESCRIPTION"];
      // }

      let sortObj: any = { sort: { TIME_STAMP: 1 } };
      //====pagination ====
      if (page && limit) {
        try {
          if (page && parseInt(page) > 1) {
            page = parseInt(page);
          }

          if (limit && parseInt(limit) > 0) {
            limit = parseInt(limit);
          }
        } catch (err) {
          // console.log("invalid query params " + err);
        }
      }
      //  else {
      //   page = 1;
      //   limit = 50;
      // }

      if (limit > 0) {
        // check if limit selected as ALL
        const startIndex = (page - 1) * limit;
        sortObj.limit = limit;
        sortObj.skip = startIndex;
      } else {
        sortObj.limit = 0;
        sortObj.skip = 0;
      }

      //====pagination logic end====

      //====== set SORT params========

      if (sort && direction) {
        let sortingParam: any = {};

        formKeyValue(sort, direction, sortingParam);
        if (sort != "TIME_STAMP") {
          formKeyValue("TIME_STAMP", 1, sortingParam); // passing timestamp as second sorting level
        }

        sortObj.sort = sortingParam;
      } else {
        sortObj.sort = { TIME_STAMP: 1 };
      }

      //====== set SORT params logic end========
      if (searchString) {
        output["$or"] = [
          {
            SHIFT: {
              $regex: new RegExp(searchString, "i"),
            },
          },
          {
            MACHINE_NAME: {
              $regex: new RegExp(searchString, "i"),
            },
          },
          {
            MACHINE_ID: {
              $regex: new RegExp(searchString, "i"),
            },
          },
          {
            MATERIAL_DESCRIPTION: {
              $regex: new RegExp(searchString, "i"),
            },
          },
          {
            MATERIAL: {
              $regex: new RegExp(searchString, "i"),
            },
          },
          {
            SAP_CODE: {
              $regex: new RegExp(searchString, "i"),
            },
          },
          {
            REASON: {
              $regex: new RegExp(searchString, "i"),
            },
          },
        ];
      } else {
        // console.log("<----------not inserting search param-------->");
      }

      // console.log("final quey to db===>", output);
      // console.log("final projection to db===>", projection);
      // console.log("final options to db===>", sortObj);

      // logger.debug(
      //   logger.DEFAULT_MODULE,
      //   null,
      //   "FIND QUERY => " + JSON.stringify(output)
      // );

      var tableData: any = [];

      // if (collectionName == "OEE_MOLD_OUT") {
      // tableData = await findTableDataAggregate(
      //   collectionName,
      //   output,
      //   projection,
      //   sortObj,
      //   (err: any, Tdata: any, responseTime: any) => {
      //     if (err) {
      // console.log("error while finding");
      //       return [];
      //     } else {
      //       return Tdata;
      //     }
      //   }
      // );

      // if (tableData) {
      //   tableData.forEach((dattta) => {
      //     dattta["RAW_SHOT_COUNT"] =
      //       dattta["RAW_SHOT_COUNT"] && dattta["RAW_SHOT_COUNT"].length
      //         ? dattta["RAW_SHOT_COUNT"][
      //             dattta["RAW_SHOT_COUNT"].length - 1
      //           ] - dattta["RAW_SHOT_COUNT"][0]
      //         : 0;
      //     dattta["RAW_CAVITY"] =
      //       dattta["RAW_CAVITY"] && dattta["RAW_CAVITY"].length
      //         ? dattta["RAW_CAVITY"][dattta["RAW_CAVITY"].length - 1] -
      //           dattta["RAW_CAVITY"][0]
      //         : 0;
      //     dattta["RAW_PRODUCTION_COUNT"] =
      //       dattta["RAW_PRODUCTION_COUNT"] &&
      //       dattta["RAW_PRODUCTION_COUNT"].length
      //         ? dattta["RAW_PRODUCTION_COUNT"][
      //             dattta["RAW_PRODUCTION_COUNT"].length - 1
      //           ] - dattta["RAW_PRODUCTION_COUNT"][0]
      //         : 0;
      //     dattta["PLANNED_COUNT"] =
      //       dattta["PLANNED_COUNT"] && dattta["PLANNED_COUNT"].length
      //         ? dattta["PLANNED_COUNT"][dattta["PLANNED_COUNT"].length - 1] -
      //           dattta["PLANNED_COUNT"][0]
      //         : 0;
      //     dattta["REJECT_COUNT"] =
      //       dattta["REJECT_COUNT"] && dattta["REJECT_COUNT"].length
      //         ? dattta["REJECT_COUNT"][dattta["REJECT_COUNT"].length - 1] -
      //           dattta["REJECT_COUNT"][0]
      //         : 0;
      //     dattta["OEE"] = isNaN(dattta["OEE"]) ? 0 : dattta["OEE"].toFixed(2);
      //     dattta["BREAK_TIME"] = isNaN(dattta["BREAK_TIME"])
      //       ? 0
      //       : dattta["BREAK_TIME"].toFixed(2);
      //     dattta["ACTUAL_CYCLE_TIME"] = isNaN(dattta["ACTUAL_CYCLE_TIME"])
      //       ? 0
      //       : dattta["ACTUAL_CYCLE_TIME"].toFixed(2);
      //     dattta["AVAILABILITY"] = isNaN(dattta["AVAILABILITY"])
      //       ? 0
      //       : dattta["AVAILABILITY"].toFixed(2);
      //     dattta["PERFORMANCE"] = isNaN(dattta["PERFORMANCE"])
      //       ? 0
      //       : dattta["PERFORMANCE"].toFixed(2);
      //     dattta["QUALITY"] = isNaN(dattta["QUALITY"])
      //       ? 0
      //       : dattta["QUALITY"].toFixed(2);
      //   });
      // }
      // } else {
      tableData = await findTableData(
        collectionName,
        output,
        projection,
        sortObj,
        (err: any, Tdata: any, responseTime: any) => {
          // console.log("coming postman data in findTableData",Tdata);
          
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return Tdata;
          }
        }
      );
      // }

      const convertTimeStamp = (tableData: any) => {
        
        const filter: any = [];
        tableData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          if (card && card.TIME_STAMP) {
            card.TIME_STAMP = new Date(card.TIME_STAMP).toLocaleString();
          }
          if (card && card.FROM_TIME) {
            // console.log(
            //   card.FROM_TIME,
            //   new Date(card.FROM_TIME),
            //   new Date(card.FROM_TIME).toLocaleString()
            // );

            card.FROM_TIME = new Date(card.FROM_TIME).toLocaleString();
          }
          if (card && card.TO_TIME) {
            card.TO_TIME = new Date(card.TO_TIME).toLocaleString();
          }
          filter.push(card);
        });
        return filter;
      };

      // const convertTimeStampOEE = (tableData: any) => {
      //   const filter: any = [];
      //   tableData.forEach((card: any) => {
      //     card = JSON.parse(JSON.stringify(card));

      //     if (card && card.TIME_STAMP) {
      //       card.TIME_STAMP = new Date(card.TIME_STAMP).toLocaleString([], {
      //         year: "numeric",
      //         month: "2-digit",
      //         day: "2-digit",
      //         hour: "2-digit",
      //         minute: "2-digit",
      //       });
      //     }
      //     if (card && card.FROM_TIME) {
      //       console.log(
      //         card.FROM_TIME,
      //         new Date(card.FROM_TIME),
      //         new Date(card.FROM_TIME).toLocaleString([], {
      //           year: "numeric",
      //           month: "2-digit",
      //           day: "2-digit",
      //           hour: "2-digit",
      //           minute: "2-digit",
      //         })
      //       );

      //       card.FROM_TIME = new Date(card.FROM_TIME).toLocaleString([], {
      //         year: "numeric",
      //         month: "2-digit",
      //         day: "2-digit",
      //         hour: "2-digit",
      //         minute: "2-digit",
      //       });
      //     }
      //     if (card && card.TO_TIME) {
      //       card.TO_TIME = new Date(card.TO_TIME).toLocaleString([], {
      //         year: "numeric",
      //         month: "2-digit",
      //         day: "2-digit",
      //         hour: "2-digit",
      //         minute: "2-digit",
      //       });
      //     }
      //     filter.push(card);
      //   });
      //   return filter;
      // };

      if (tableData && tableData.length) {
        // if (collectionName == "OEE_MOLD_OUT") {
        //   var filterData = await convertTimeStampOEE(tableData);
        // } else {
        var filterData = await convertTimeStamp(tableData);
        // }
      } else {
        filterData = [];
      }
      
      formKeyValue("tableData", filterData, resultElement);

      var countOfRecords: any = 0;
      // if (collectionName == "OEE_MOLD_OUT") {
      //   countOfRecords = filterData.length;
      // } else {
      countOfRecords = await getDocumentCount(
        collectionName,
        output,
        // query,
        (err, response) => {
          if (err) {
            return 0;
          } else {
            return response;
          }
        }
      );
      // }

      formKeyValue("count", countOfRecords, resultElement);

      result = resultElement;

      // console.log("result is coming from postman", result);
      // console.log(output);

      resolve(result);

      // options= { sort: { TIME_STAMP: 1 } };

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

let processSearch = async (date: any, parameters: any, output: any) => {
  let data: any = {};
  // console.log("processSearch==>");
  // console.log("date==>", date);
  // console.log("parameters==>", parameters);
  //   // console.log("output==>", output);

  if (parameters != undefined) {
    var param: any = [];
    for (let i = 0; i < parameters.length; i++) {
      try {
        data = {};
        // if (mapping.length > 0) {
        //     data = await searchMapping(mapping, parameters[i]);
        // } else {

        data = parameters[i];
        // }
        formData(data["name"], data["value"], output);

        // console.log("output", output);

        // param = [...param, ...output]
      } catch (err) {
        // console.log(err);
      }
    }
    let result: any;
    if (param.length) {
      formKeyValue("$or", param, result);
    }
  }

  logger.debug(
    logger.DEFAULT_MODULE,
    "",
    "AFTER PARAMETERS" + JSON.stringify(output)
  );

  if (date != undefined) {
    // formDateData("_id", date, output);
    formDateData("TIME_STAMP", date, output);
    logger.debug(
      logger.DEFAULT_MODULE,
      "",
      "AFTER DATE" + JSON.stringify(output)
    );
  }

  return output;
};

let searchMapping = async (mapping: any, element: any) => {
  logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:4 - START SEARCH MAPPING");
  let projectionObj: any = {};
  let obj: any = {};
  let queryObj: any = {};
  let isSearchFound: boolean = false;
  let list: any = [];

  mapping.forEach((eleObj) => {
    eleObj = JSON.parse(JSON.stringify(eleObj));

    if (eleObj["xKey"] === element["name"]) {
      obj = eleObj;
      isSearchFound = true;
    }
  });

  if (isSearchFound) {
    formKeyValue(obj["xGetValueOf"], 1, projectionObj);

    //queryJSON
    if (Array.isArray(element["value"])) {
      let valueObj: any = new Object();
      valueObj["$in"] = element["value"];
      queryObj[element["name"]] = valueObj;
    } else {
      formKeyValue(element["name"], element["value"], queryObj);
    }

    logger.debug(
      logger.DEFAULT_MODULE,
      "",
      "DEBUG:5 - QUERY FOR SEARCH" + JSON.stringify(queryObj)
    );

    let data: any = await find(
      obj["xCollection"],
      queryObj,
      projectionObj,
      options,
      (err, data, responseTime) => {
        if (err) {
          // console.log("error while finding");
          return [];
        }
        // console.log("responseTime", responseTime);

        return data;
      }
    );
    logger.debug(logger.DEFAULT_MODULE, "", "DATA FOR MAPPING OBTAINED");

    //// console.log("MACHINE = ", data, " query = " + JSON.stringify(queryObj));

    if (data.length > 0) {
      data.forEach((json) => {
        json = JSON.parse(JSON.stringify(json));
        list.push(json[obj["xGetValueOf"]]);
      });
      element["name"] = obj["xReplaceKey"];
      element["value"] = list;
    }
    //// console.log("element = ", element);
  }

  logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:6 - END OF SEARCH MAPPING");
  return element;
};

let prepareQuery = async (date: any, parameters: any, output: any) => {
  let query: any = {};

  if (parameters != undefined) {
    for (let i = 0; i < parameters.length; i++) {
      try {
        const item: any = parameters[i];
        // // console.log("item", item, item["name"]);
        let x = item["name"];
        let y = item["value"];

        query[x] = { $in: y };
        // // console.log("query", query);
      } catch (err) {
        // console.log(err);
      }
    }
  }

  logger.debug(
    logger.DEFAULT_MODULE,
    "",
    "AFTER PARAMETERS" + JSON.stringify(output)
  );

  if (date != undefined) {
    // formDateData("_id", date, output);
    formDateData("TIME_STAMP", date, output);
    query.TIME_STAMP = output.TIME_STAMP;
    logger.debug(
      logger.DEFAULT_MODULE,
      "",
      "AFTER DATE" + JSON.stringify(query)
    );
  }

  return query;
};

// export const searchDataForGraph = (collectionName: any, condition: JSON) => {
//   // options= { sort: { TIME_STAMP: 1 } };
//   return new Promise(async (resolve, reject) => {
//     try {
//       let conditionId: string,
//         date: any,
//         parameters: any,
//         projection: any,
//         graphRequired: any;
//       let resultElement: any = {};
//       let returnObj: any = {};
//       let result: any = {},
//         output = {};

//       // // console.log("condition",JSON.stringify(condition));

//       logger.debug(
//         logger.DEFAULT_MODULE,
//         "",
//         "DEBUG:2 - CONDITION SEGREGATION"
//       );
//       // conditionId = getConditionAttribute(condition, "conditionId");
//       date = getConditionAttribute(condition, "date");
//       parameters = getConditionAttribute(condition, "parameters");
//       projection = getConditionAttribute(condition, "projection");
//       graphRequired = getConditionAttribute(condition, "graphs");

//       // returnObj = checkConditions(date);
//       // if (!returnObj.value) {
//       //   reject(returnObj.data);
//       // }

//       output = await prepareQuery(date, parameters, output);

//       // console.log("graph output", output);

//       logger.debug(
//         logger.DEFAULT_MODULE,
//         null,
//         "FIND QUERY => " + JSON.stringify(output)
//       );

//       // console.log("grapgh final query to db", output);
//       // console.log("final projection to db", projection);
//       // console.log("grapgh final options to db", options);

//       var tableData = await find(
//         collectionName,
//         output,
//         projection,
//         options,
//         (err: any, data: any, responseTime: any) => {
//           if (err) {
//             // console.log("error while finding");
//             data = [];
//             return data;
//           } else {
//             console.log("Result Data inside aggr",data);
            
//             return data;
//           }
//         }
//       );

//       // console.log("filteredData", tableData.length);

//       const fetchingGraphData = (graphRequired: any, filteredData: any) => {
//         // console.log("params", graphRequired);
//         // // console.log("filteredData", filteredData);
//         // const sensors = ['EMS001', 'EMS002']
//         if (graphRequired && graphRequired.length) {
//           const graphdata: any = [];
//           graphRequired.forEach((param: any) => {
//             let series: any = { parameter: param, paramData: [] };

//             let seriesItem: any = {};
//             filteredData.forEach((card: any) => {
//               // console.log("card Data",card);
              
//               card = JSON.parse(JSON.stringify(card));
//               //   const checkValue = card[param] === "0.00" ? false : true;
//               const checkValue = parseFloat(card[param]);
//               const format = "YYYY-MM-DD HH:mm:ss";
//               if (checkValue) {
//                 var date = new Date(card.TIME_STAMP);
//                 var cDate: any = moment(date).format(format);
//                 if (seriesItem[card.MACHINE_NAME]) {
//                   seriesItem[card.MACHINE_NAME].x.push(cDate);
//                   seriesItem[card.MACHINE_NAME].y.push(card[param]);
//                 } else {
//                   var date = new Date(card.TIME_STAMP);
//                   var cDate: any = moment(date).format(format);

                  

//                   seriesItem[card.MACHINE_NAME] = {
//                     name: card.MACHINE_NAME,
//                     x: [cDate],
//                     y: [card[param]],
//                   };
//                 }
//               }
//             });
//             // console.log("serires",ser);
            
//             Object.keys(seriesItem).forEach((k) => {
//               series.paramData.push(seriesItem[k]);
//             });
//             graphdata.push(series);
//           });
//           return graphdata;
//         } else {
//           let graphdata = [];
//           return graphdata;
//         }
//       };

//       const fetchedGraphData = await fetchingGraphData(
//         graphRequired,
//         tableData
//       );

//       formKeyValue("graphData", fetchedGraphData, resultElement);
//       let countOfRecords: any = await getDocumentCount(
//         collectionName,
//         output,
//         (err, response) => {
//           if (err) {
//             return 0;
//           } else {
//             return response;
//           }
//         }
//       );

//       formKeyValue("count", countOfRecords, resultElement);

//       result = resultElement;
//       console.log("finalResult",result);
      

//       resolve(result);
//       tableData = [];

//       logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
//     } catch (err) {
//       // console.log("catching error");

//       reject(err);
//     }
//   });
// };

/////same above code i copy in below//////
export const searchDataForGraph = (collectionName: any, condition: JSON) => {
  // options= { sort: { TIME_STAMP: 1 } };
  return new Promise(async (resolve, reject) => {
    try {
      let conditionId: string,
        date: any,
        parameters: any,
        projection: any,
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      // // console.log("condition",JSON.stringify(condition));

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      // conditionId = getConditionAttribute(condition, "conditionId");
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");
      graphRequired = getConditionAttribute(condition, "graphs");

      // returnObj = checkConditions(date);
      // if (!returnObj.value) {
      //   reject(returnObj.data);
      // }

      output = await prepareQuery(date, parameters, output);

      // console.log("graph output", output);

      logger.debug(
        logger.DEFAULT_MODULE,
        null,
        "FIND QUERY => " + JSON.stringify(output)
      );

      // console.log("grapgh final query to db", output);
      // console.log("final projection to db", projection);
      // console.log("grapgh final options to db", options);

      var tableData = await find(
        collectionName,
        output,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            data = [];
            return data;
          } else {
            console.log("Result Data inside aggr",data);
            
            return data;
          }
        }
      );
    
      var machineList= await  DynamicModels.find("MACHINE_LIST",{},{MACHINE_ID:1,MACHINE_DISPLAY:1},{},(err:any,result:any)=>{
          if(err || !result){
            result = []
            return result;
          }else{
            let modifiedName :any = {}
            // console.log("machineStatus length",result.length); 
            result.forEach(item=>{      
              // console.log("iiiii",item);
                    
              modifiedName[item.MACHINE_ID] = item.MACHINE_DISPLAY
            })
            // console.log("modifiedName",modifiedName);
            return modifiedName;
          };
        }
      )  

      const modifiedMachineObj:any = await getMachineObject(machineList)
  
      function getMachineObject(machineList){
        let modifiedName :any = {}
        machineList.forEach(item=>{  
          item = JSON.parse(JSON.stringify(item))    
              console.log("item",item.MACHINE_ID);
              
              modifiedName[item.MACHINE_ID] = item.MACHINE_DISPLAY

            })
            return modifiedName;
      }
    
      console.log("modified object",modifiedMachineObj);

 

      const fetchingGraphData = (graphRequired: any, filteredData: any) => {
        // console.log("params", graphRequired);
        // // console.log("filteredData", filteredData);
        // const sensors = ['EMS001', 'EMS002']
        if (graphRequired && graphRequired.length) {
          const graphdata: any = [];
          graphRequired.forEach((param: any) => {
            
            let series: any = { parameter: param, paramData: [] };
            

            let seriesItem: any = {};
            filteredData.forEach((card: any) => {
           
              // console.log("card",card);
              
              card = JSON.parse(JSON.stringify(card));
              //   const checkValue = card[param] === "0.00" ? false : true;
              const checkValue = parseFloat(card[param]);
              const format = "YYYY-MM-DD HH:mm:ss";
              if (checkValue) {
                var date = new Date(card.TIME_STAMP);
                var cDate: any = moment(date).format(format);
                if (seriesItem[card.MACHINE_NAME]) {
                  seriesItem[card.MACHINE_NAME].x.push(cDate);
                  seriesItem[card.MACHINE_NAME].y.push(card[param]);
                } 
                else {
                  var date = new Date(card.TIME_STAMP);
                  var cDate: any = moment(date).format(format);

                //   let finalResult :any = []
 
                  seriesItem[card.MACHINE_NAME] = {
                    name:modifiedMachineObj[card.MACHINE_NAME],
                    // name: card.MACHINE_NAME,
                    x: [cDate],
                    y: [card[param]],
                  };
                }
              }
            });
        
     
            
            // console.log("serires",ser);
            
            Object.keys(seriesItem).forEach((k) => {
              series.paramData.push(seriesItem[k]);
            });
            graphdata.push(series);
          });
          return graphdata;
        } else {
          let graphdata = [];
          return graphdata;
        }
      };

      const fetchedGraphData = await fetchingGraphData(
        graphRequired,
        tableData
      );

      formKeyValue("graphData", fetchedGraphData, resultElement);
      let countOfRecords: any = await getDocumentCount(
        collectionName,
        output,
        (err, response) => {
          if (err) {
            return 0;
          } else {
            return response;
          }
        }
      );

      formKeyValue("count", countOfRecords, resultElement);

      result = resultElement;
      

      resolve(result);
      tableData = [];

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      // console.log("catching error");

      reject(err);
    }
  });
};
/////////////////////////////////////////////////////////////////////

export const searchDataForStackedGraph = (
  collectionName: any,
  condition: JSON
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any, graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");
      graphRequired = getConditionAttribute(condition, "graphs");

      returnObj = checkConditions(date);
      if (!returnObj.value) {
        reject(returnObj.data);
      }

      output = await prepareQuery(date, parameters, output);

      logger.debug(
        logger.DEFAULT_MODULE,
        null,
        "FIND QUERY => " + JSON.stringify(output)
      );

      //// console.log("find start => ",new Date());
      const dbData: any = await stackedGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          // console.log("dataaaaaaaaaaaaaaaaaaaaaa",data);
          
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return data;
          }
        }
      );

      const sortGraph1Data = (graph1: any) => {
        if (graph1.length > 0) {
          var series: any = [];
          var pieSeries: any = [];

          graph1.forEach((card: any) => {
            var seriesItem: any = { name: card._id, x: [], y: [], type: "bar" };
            var seriesItem2: any = { name: card._id, data: [] };
            var pieObj: any = {
              values: [],
              labels: [],
              type: "pie",
              hole: 0.4,
              textinfo: "none",
              insidetextorientation: "radial",
            };

            var sortedObjs = _.sortBy(card.data, "reason"); // sorting array of objects

            sortedObjs.forEach((item: any) => {
              //sorting for stacked graph
              seriesItem.x.push(item.reason);
              seriesItem.y.push(item.duration);

              //sorting for pie chart

              if (item.duration > 0) {
                pieObj.values.push(item.duration);
                pieObj.labels.push(item.reason);
              }
            });

            if (
              pieObj.values &&
              pieObj.values.length &&
              pieObj.labels &&
              pieObj.labels.length
            ) {
              seriesItem2.data.push(pieObj);
              // console.log("pieObj", pieObj);
              pieSeries.push(seriesItem2);
            }

            series.push(seriesItem);
            seriesItem = {};
            seriesItem2 = {};
            pieObj = {};
          });
        } else {
          series = [];
          pieSeries = [];
        }

        return { series, pieSeries };
      };
      // console.log("aggregate dataaaaaaaaaaaaa",dbData[0].MachineName);
      
      const { series, pieSeries } = await sortGraph1Data(dbData);

      const graphData = {
        stackGraph: series,
        pieChart: pieSeries,
        // name:dbData[0]
      };

      formKeyValue("graphData", graphData, resultElement);

      // let countOfRecords: any = await getDocumentCount(
      //   collectionName,
      //   output,
      //   (err, response) => {
      //     if (err) {
      //       return 0;
      //     } else {

      //       return response;
      //     }
      //   }
      // );

      // formKeyValue("count", countOfRecords, resultElement);

      result = resultElement;
      // result.push(dbData[0])

      // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      // console.log("catching error");

      reject(err);
    }
  });
};

export const searchGraphForplannedAnalysis = (
  collectionName: any,
  condition: JSON
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any, graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");
      graphRequired = getConditionAttribute(condition, "graphs");

      returnObj = checkConditions(date);
      if (!returnObj.value) {
        reject(returnObj.data);
      }

      output = await prepareQuery(date, parameters, output);

      logger.debug(
        logger.DEFAULT_MODULE,
        null,
        "FIND QUERY => " + JSON.stringify(output)
      );

      const dbData: any = await stackedGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return data;
          }
        }
      );

      const sortGraph1Data = (graph1: any) => {
        if (graph1.length > 0) {
          var series: any = [];
          var pieSeries: any = [];
          var reasonArray: any = [];

          graph1.forEach((card: any) => {
            var seriesItem: any = { name: card._id, x: [], y: [], type: "bar" };
            var seriesItem2: any = { name: card._id, data: [] };
            var pieObj: any = {
              values: [],
              labels: [],
              type: "pie",
              hole: 0.4,
              textinfo: "none",
              insidetextorientation: "radial",
            };

            var sortedObjs = _.sortBy(card.data, "reason"); // sorting array of objects

            // // console.log("sortedObjs", sortedObjs);
            sortedObjs.forEach((item: any) => {
              //sorting for stacked graph

              seriesItem.x.push(item.reason);
              seriesItem.y.push(item.duration);

              //sorting for pie chart

              if (item.duration > 0) {
                pieObj.values.push(item.duration);
                pieObj.labels.push(item.reason);
              }
            });

            if (
              pieObj.values &&
              pieObj.values.length &&
              pieObj.labels &&
              pieObj.labels.length
            ) {
              seriesItem2.data.push(pieObj);
              // // console.log("pieObj", pieObj);
              pieSeries.push(seriesItem2);
            }

            series.push(seriesItem);
            // // console.log("seriesItem", seriesItem);

            seriesItem = {};
            seriesItem2 = {};
            pieObj = {};
          });
        } else {
          series = [];
          pieSeries = [];
        }

        // // console.log("final series", series);

        return { series, pieSeries };
      };

      // // console.log("db data", data);

      const { series, pieSeries } = await sortGraph1Data(dbData);

      const graphData = {
        stackGraph: series,
        pieChart: pieSeries,
      };

      formKeyValue("graphData", graphData, resultElement);

      result = resultElement;

      // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      // console.log("catch error");
      reject(err);
    }
  });
};

export const searchGraphForRejectionAnalysis = (
  collectionName: any,
  condition: JSON
) => {
  return new Promise(async (resolve, reject) => {
    try {
      // console.log("inside rejection");

      let date: any,
        parameters: any,
        projection: any = { _id: "$MACHINE_ID" },
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      graphRequired = getConditionAttribute(condition, "graphs");

      //TODO: Add sort and limit

      // console.log("========= Search method logs=========");
      // // console.log("date =>", date);
      // // console.log("parameters =>", parameters);
      // // console.log("projection =>", projection);

      returnObj = checkConditions(date);
      if (!returnObj.value) {
        reject(returnObj.data);
      }

      output = await prepareQuery(date, parameters, output);

      //============= prepare projection =========

      graphRequired.forEach((r) => {
        // console.log(r, "868")
        // projection[r] = {
        //   $sum: { $toInt: "$" + r },
        // };
        projection[r] = {
          $sum: {
            $convert: {
              input: "$" + r,
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        };
      });

      console.log("final query to dbd", output);
      console.log("final projection to dbd", projection);
      // console.log("final options to db", options);

      const dbData: any = await rejectionGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return data;
          }
        }
      );

      const sortGraph1Data = (graphRequired: any, dbData: any) => {
        // // console.log("filteredData", filteredData);
        if (graphRequired && graphRequired.length) {
          var series: any = [];
          var pieSeries: any = [];
          dbData.forEach((card: any) => {
            let seriesItem: any = {
              name: card._id,
              x: [],
              y: [],
              type: "bar",
            };

            var seriesItem2: any = { name: card._id, data: [] };
            var pieObj: any = {
              values: [],
              labels: [],
              type: "pie",
              hole: 0.4,
              textinfo: "none",
              insidetextorientation: "radial",
            };

            graphRequired.forEach((reason: any) => {
              if (card[reason] && card[reason] > 0) {
                //sorting for stacked graph
                seriesItem.x.push(reason);
                seriesItem.y.push(card[reason]);

                //sorting for pie chart
                pieObj.values.push(card[reason]);
                pieObj.labels.push(reason);
              }
            });
            // console.log("seriesItem", seriesItem);

            if (
              seriesItem.x &&
              seriesItem.x.length &&
              seriesItem.y &&
              seriesItem.y.length
            ) {
              // console.log("seriesItem", seriesItem);
              series.push(seriesItem);
            }

            if (
              pieObj.values &&
              pieObj.values.length &&
              pieObj.labels &&
              pieObj.labels.length
            ) {
              seriesItem2.data.push(pieObj);
              // console.log("pieObj", pieObj);
              pieSeries.push(seriesItem2);
            }
          });

          return { series, pieSeries };
        } else {
          series = [];
          pieSeries = [];
          return { series, pieSeries };
        }
      };
      // console.log("dbData", dbData);

      const { series, pieSeries } = await sortGraph1Data(graphRequired, dbData);

      const graphData = {
        stackGraph: series,
        pieChart: pieSeries,
      };

      formKeyValue("graphData", graphData, resultElement);

      result = resultElement;

      // // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      // console.log("catch error");
      reject(err);
    }
  });
};

export const searchGraphForCounterChange = (
  collectionName: any,
  condition: JSON,
  // req:Request | any,
  // res:Response,
  // next:NextFunction
) => {
  return new Promise(async (resolve, reject) => {
    try {
      // console.log("inside mould");

      let date: any,
        parameters: any,
        projection: any = { _id: "$MACHINE_ID" },
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
      let finalResult:any={};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      // graphRequired = getConditionAttribute(condition, "graphs");

      returnObj = checkConditions(date);
      if (!returnObj.value) {
        reject(returnObj.data);
      }

      // This is for Machine Calculation function
      const {machineCount,machineArray}: any = await getMachineAttribute(parameters);

      output = await prepareQuery(date, parameters, output);
      // console.log("output",output);
  
      
      //============= prepare projection =========

      // console.log("final query to db here", output);
      // console.log("final projection to db", projection);
      // console.log("final options to db", options);
      const dbData: any = await mouldGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            // display = data
            return data;
            
            
          }
        }
      );
      // console.log("dataaaaaaaaa 1200",display);


      const convertTimeStamp = (dbData: any) => {
        const filter: any = [];      
        dbData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          if (card && card.data && card.data.length) {
            const cardData: any = [];
            card.data.forEach((item: any, index: any) => {
              // if (index === 4) {
              //   console.log("item", JSON.stringify(item));
              // }
              if (item && item.TIME_STAMP) {
                item.TIME_STAMP = new Date(item.TIME_STAMP).toLocaleString();
              }
              if (item && item.FROM_TIME) {
                // console.log("form time", typeof item.FROM_TIME);
                if (typeof item.FROM_TIME === "string") {
                  item.FROM_TIME = item.FROM_TIME;
                } else {
                  item.FROM_TIME = new Date(item.FROM_TIME).toLocaleString();
                }

                // if (index == 4) {
                //   console.log("item.FROM_TIME", item.FROM_TIME);
                // }
              }
              if (item && item.TO_TIME) {
                // console.log("item.TO_TIME", item.TO_TIME);
                if (typeof item.TO_TIME === "string") {
                  item.TO_TIME = item.FROM_TIME;
                } else {
                  item.TO_TIME = new Date(item.TO_TIME).toLocaleString();
                }
              }
              cardData.push(item);
            });
            card.data = cardData;
            
          }
          filter.push(card);
        });
        return filter;
      };

      if (dbData && dbData.length) {
        var filterData = await convertTimeStamp(dbData);
        // console.log("tab data", filterData.length);
      } else {
        filterData = [];
      }
      let final: any ={};
      let dur = 0;
      final["durationSum"] = 0;
      final["count"] = 0;
      // final["machineWiseData"]
      // console.log("filter data line 1256",filterData[0].data);
      
      formKeyValue("flowData", filterData, resultElement);
    
      result = resultElement;
      // console.log("result db data",result);

      //******************************************** */
      
      if(result && result["flowData"]){
        result["flowData"].forEach((res)=>{
          res["data"].forEach((data)=>{
            dur =
              data && data["DURATION"] && parseInt(data["DURATION"])
              ? parseInt(data["DURATION"])
              : 0;
              final["count"] = final["count"] + 1;
              final["durationSum"] = final["durationSum"] + dur;
              dur = 0
              // console.log("FINAL COUNT", final["count"]);
              // console.log("FINAL DURATION",final["durationSum"]);

          })
        })
        if(final["count"]==0){
          final["avgDuration"] = 0;

        }else{
          final["avgDuration"] = final["durationSum"] / final["count"];
          final["avgDuration"] = final["avgDuration"].toFixed(2);
        }
        // console.log("Final count Result",final);
        
      //********************************** */
        const getMachineWiseData = async(filterData:any,machineArray:any) =>{
        console.log("filterData",filterData);
        
        let mouldResult:any=[];

         filterData.flowData.forEach((b)=>{
        // console.log("foreachbbbbbbbbbbbbbbbb",b.data[0].machineName[0]);
        let machineId = b._id
        let display = b.data[0].machineName[0]

        let count = b.data.length;
        let duration =0;
         b.data.forEach((e)=>{
          duration+=parseInt(e.DURATION);
          
         })
         let avg = duration/count
        //  console.log('duration',duration);
        //  console.log("dbData",dbData[0].data[0].machineName[0]);
      

         let mouldObj = {
           machineId:machineId,
           count:count,
           duration:duration,
           average: avg.toFixed(2),
           display:display
         }


         

        //  console.log("toDigit",mouldObj.average);
         
         mouldResult.push(mouldObj)           
        })
    
        return mouldResult;
     
      }
       
       if (machineCount > 1) {
        var machineWiseData: any = await getMachineWiseData(result, machineArray);
        // console.log('counters',countersData);
        final["machineWiseData"] = machineWiseData
      } else {
        console.log('not Showing');
        
      }
      // console.log("final over result",final);
      }
    
      resolve({
        "countersData":final
      });

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      // console.log("catch error");
      reject(err);
    }
  });
};

export const searchGraphForMouldChange = (
  collectionName: any,
  condition: JSON,
) => {
  return new Promise(async (resolve, reject) => {
    try {
      // console.log("inside mould");

      let date: any,
        parameters: any,
        projection: any = { _id: "$MACHINE_ID" },
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
   

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      // graphRequired = getConditionAttribute(condition, "graphs");

      returnObj = checkConditions(date);
      if (!returnObj.value) {
        reject(returnObj.data);
      }

      output = await prepareQuery(date, parameters, output);
      // console.log("output",output);
      
      //============= prepare projection =========

      // console.log("final query to db here", output);
      // console.log("final projection to db", projection);
      // console.log("final options to db", options);

      const dbData: any = await mouldGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            
            return data;
            
            
          }
        }
      );

      const convertTimeStamp = (dbData: any) => {
        const filter: any = [];      
        dbData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          if (card && card.data && card.data.length) {
            const cardData: any = [];
            card.data.forEach((item: any, index: any) => {
              // if (index === 4) {
              //   console.log("item", JSON.stringify(item));
              // }
              if (item && item.TIME_STAMP) {
                item.TIME_STAMP = new Date(item.TIME_STAMP).toLocaleString();
              }
              if (item && item.FROM_TIME) {
                // console.log("form time", typeof item.FROM_TIME);
                if (typeof item.FROM_TIME === "string") {
                  item.FROM_TIME = item.FROM_TIME;
                } else {
                  item.FROM_TIME = new Date(item.FROM_TIME).toLocaleString();
                }

                // if (index == 4) {
                //   console.log("item.FROM_TIME", item.FROM_TIME);
                // }
              }
              if (item && item.TO_TIME) {
                // console.log("item.TO_TIME", item.TO_TIME);
                if (typeof item.TO_TIME === "string") {
                  item.TO_TIME = item.FROM_TIME;
                } else {
                  item.TO_TIME = new Date(item.TO_TIME).toLocaleString();
                }
              }
              cardData.push(item);
            });
            card.data = cardData;
            
          }
          filter.push(card);
        });
        return filter;
      };

      if (dbData && dbData.length) {
        var filterData = await convertTimeStamp(dbData);
        // console.log("tab data", filterData.length);
      } else {
        filterData = [];
      }
      let final: any ={};
      let dur = 0;
      final["durationSum"] = 0;
      final["count"] = 0;
      formKeyValue("flowData", filterData, resultElement);
    
      result = resultElement;
      if(result && result["flowData"]){
        result["flowData"].forEach((res)=>{
          res["data"].forEach((data)=>{
            // console.log("FinalResponse Data",data);

            dur =
              data && data["DURATION"] && parseInt(data["DURATION"])
              ? parseInt(data["DURATION"])
              : 0;
              final["count"] = final["count"] + 1;
              final["durationSum"] = final["durationSum"] + dur;
              dur = 0
              // console.log("FINAL COUNT", final["count"]);
              // console.log("FINAL DURATION",final["durationSum"]);

          })
        })
        if(final["count"]==0){
          final["avgDuration"] = 0;

        }else{
          final["avgDuration"] = final["durationSum"] / final["count"];
          final["avgDuration"] = final["avgDuration"].toFixed(2);
        }
        // console.log("Final Result",final);
        
        // console.log("COUNT",final);
        
        
        // if(final["count"]==0){
        //   final["avgDuration"] = 0;

        // }else{
        //   final["avgDuration"] = final["durationSum"] / final["count"];
        //   final["avgDuration"] = final["avgDuration"].toFixed(2);
        // }
        // console.log("COUNT",final.count);
      }

      resolve(result);
      // console.log("finalResult",result["flowData"]);
      // console.log("finalResult",result.flowData[0]);
      

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      // console.log("catch error");
      reject(err);
    }
  });
};

export const countersOEEOld = (collectionName: any, condition: JSON) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
      let machineCount: any;

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");

      const taotalMachines: any = await countMachine(parameters);

      output = await prepareQuery(date, parameters, output);

      // console.log("final quey to db===>", output);
      // console.log("final projection to db===>", projection);
      // console.log("final options to db===>", options);

      const filterData: any = await find(
        collectionName,
        output,
        // query,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("Error:", err);
            return [];
          } else {
            return data;
          }
        }
      );

      const singleMachineData = (filterData: any) => {
        let cycleTime: any = [];
        let OEE: any = [];
        let performance: any = [];
        let totalProdCount: number = 0;
        let productionCount: any = [];
        let productionObj = {};
        let totalShotCount: number = 0;
        let shotCount: any = [];
        let shotCountObj = {};
        let productivity: any = [
          { name: "Production count ", x: [], y: [], type: "scatter" },
          { name: "Planned count ", x: [], y: [], type: "scatter" },
        ];

        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          cycleTime.push(parseFloat(card.ACTUAL_CYCLE_TIME));
          OEE.push(parseFloat(card.OEE));
          performance.push(parseFloat(card.PERFORMANCE));

          //production count logic
          if (productionObj[card.MATERIAL_DESCRIPTION]) {
            productionObj[card.MATERIAL_DESCRIPTION].array.push(
              parseFloat(card.RAW_PRODUCTION_COUNT)
            );
          } else {
            productionObj[card.MATERIAL_DESCRIPTION] = {
              name: card.MATERIAL_DESCRIPTION,
              array: [parseFloat(card.RAW_PRODUCTION_COUNT)],
            };
          }

          //shot count logic
          if (shotCountObj[card.MATERIAL_DESCRIPTION]) {
            shotCountObj[card.MATERIAL_DESCRIPTION].array.push(
              parseFloat(card.RAW_SHOT_COUNT)
            );
          } else {
            shotCountObj[card.MATERIAL_DESCRIPTION] = {
              name: card.MATERIAL_DESCRIPTION,
              array: [parseFloat(card.RAW_SHOT_COUNT)],
            };
          }

          // productivity graph
          productivity[0].x.push(card.TIME_STAMP);
          productivity[1].x.push(card.TIME_STAMP);
          productivity[0].y.push(card.RAW_PRODUCTION_COUNT);
          productivity[1].y.push(card.PLANNED_COUNT);
        });

        Object.keys(productionObj).forEach((k) => {
          // // console.log("productionObj[k]", productionObj[k].array);

          const min = Math.min(...productionObj[k].array);
          const max = Math.max(...productionObj[k].array);

          productionCount.push({
            name: productionObj[k].name,
            pCount: min == max ? min : parseFloat((max - min).toFixed(2)),
          });

          totalProdCount =
            totalProdCount +
            (min == max ? min : parseFloat((max - min).toFixed(2)));
        });

        Object.keys(shotCountObj).forEach((k) => {
          // // console.log("shotCountObj[k]", shotCountObj[k].array);

          const min = Math.min(...shotCountObj[k].array);
          const max = Math.max(...shotCountObj[k].array);

          shotCount.push({
            name: shotCountObj[k].name,
            sCount: min == max ? min : parseFloat((max - min).toFixed(2)),
          });

          totalShotCount =
            totalShotCount +
            (min == max ? min : parseFloat((max - min).toFixed(2)));
        });

        // // console.log("productionObj", productionCount);

        const avgCycleTime: number =
          cycleTime.reduce((a, b) => a + b, 0) / cycleTime.length;
        const avgOEE: number = OEE.reduce((a, b) => a + b, 0) / OEE.length;
        const avgperformance: number =
          performance.reduce((a, b) => a + b, 0) / performance.length;

        const data = {
          avgCycleTime: avgCycleTime.toFixed(2),
          avgOEE: avgOEE.toFixed(2),
          avgPerformance: avgperformance.toFixed(2),
          totalProdCount: totalProdCount,
          productionCount: productionCount,
          totalShotCount: totalShotCount,
          shotCount: shotCount,
          productivityGraph: productivity,
        };
        return data;
      };

      const allMachineData = (filterData: any) => {
        let totalProdCount: number = 0;
        let moldWiseProdCount: any = [];
        let machineWiseProdCount: any = [];
        let moldProdObj = {};
        let machineProdObj = {};
        let totalShotCount: number = 0;
        let moldWiseShotCount: any = [];
        let machineWiseShotCount: any = [];
        let moldShotCountObj = {};
        let machineShotCountObj = {};

        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          //production count logic
          if (moldProdObj[card.MATERIAL_DESCRIPTION]) {
            moldProdObj[card.MATERIAL_DESCRIPTION].array.push(
              parseFloat(card.RAW_PRODUCTION_COUNT)
            );
          } else {
            moldProdObj[card.MATERIAL_DESCRIPTION] = {
              name: card.MATERIAL_DESCRIPTION,
              array: [parseFloat(card.RAW_PRODUCTION_COUNT)],
            };
          }

          if (machineProdObj[card.MACHINE_NAME]) {
            machineProdObj[card.MACHINE_NAME].array.push(
              parseFloat(card.RAW_PRODUCTION_COUNT)
            );
          } else {
            machineProdObj[card.MACHINE_NAME] = {
              name: card.MACHINE_NAME,
              array: [parseFloat(card.RAW_PRODUCTION_COUNT)],
            };
          }

          //shot count logic
          if (moldShotCountObj[card.MATERIAL_DESCRIPTION]) {
            moldShotCountObj[card.MATERIAL_DESCRIPTION].array.push(
              parseFloat(card.RAW_SHOT_COUNT)
            );
          } else {
            moldShotCountObj[card.MATERIAL_DESCRIPTION] = {
              name: card.MATERIAL_DESCRIPTION,
              array: [parseFloat(card.RAW_SHOT_COUNT)],
            };
          }

          if (machineShotCountObj[card.MACHINE_NAME]) {
            machineShotCountObj[card.MACHINE_NAME].array.push(
              parseFloat(card.RAW_SHOT_COUNT)
            );
          } else {
            machineShotCountObj[card.MACHINE_NAME] = {
              name: card.MACHINE_NAME,
              array: [parseFloat(card.RAW_SHOT_COUNT)],
            };
          }
        });

        //mold wise prod count
        Object.keys(moldProdObj).forEach((k) => {
          // // console.log("moldProdObj[k]", moldProdObj[k].array);

          const min = Math.min(...moldProdObj[k].array);
          const max = Math.max(...moldProdObj[k].array);

          moldWiseProdCount.push({
            name: moldProdObj[k].name,
            pCount: min == max ? min : parseFloat((max - min).toFixed(2)),
          });

          // totalProdCount = totalProdCount + ((min == max) ? min : parseFloat((max-min).toFixed(2)))
        });

        // machine wise prod count
        Object.keys(machineProdObj).forEach((k) => {
          // // console.log("machineProdObj[k]", machineProdObj[k].array);

          const min = Math.min(...machineProdObj[k].array);
          const max = Math.max(...machineProdObj[k].array);

          machineWiseProdCount.push({
            name: machineProdObj[k].name,
            pCount: min == max ? min : parseFloat((max - min).toFixed(2)),
          });

          totalProdCount =
            totalProdCount +
            (min == max ? min : parseFloat((max - min).toFixed(2)));
        });

        // mold wise shot count
        Object.keys(moldShotCountObj).forEach((k) => {
          // // console.log("moldShotCountObj[k]", moldShotCountObj[k].array);

          const min = Math.min(...moldShotCountObj[k].array);
          const max = Math.max(...moldShotCountObj[k].array);

          moldWiseShotCount.push({
            name: moldShotCountObj[k].name,
            sCount: min == max ? min : parseFloat((max - min).toFixed(2)),
          });

          // totalShotCount = totalShotCount + ((min == max) ? min : parseFloat((max-min).toFixed(2)))
        });

        // machine wise shot count
        Object.keys(machineShotCountObj).forEach((k) => {
          // // console.log("machineShotCountObj[k]", machineShotCountObj[k].array);

          const min = Math.min(...machineShotCountObj[k].array);
          const max = Math.max(...machineShotCountObj[k].array);

          machineWiseShotCount.push({
            name: machineShotCountObj[k].name,
            sCount: min == max ? min : parseFloat((max - min).toFixed(2)),
          });

          totalShotCount =
            totalShotCount +
            (min == max ? min : parseFloat((max - min).toFixed(2)));
        });

        const data = {
          totalProdCount: totalProdCount,
          totalShotCount: totalShotCount,
          machineWiseProdCount: machineWiseProdCount,
          machineWiseShotCount: machineWiseShotCount,
          moldWiseProdCount: moldWiseProdCount,
          moldWiseShotCount: moldWiseShotCount,
        };
        return data;
      };

      if (taotalMachines > 1) {
        // const countersData = await getCountersData(filterData)
        var countersData: any = await allMachineData(filterData);
      } else {
        var countersData: any = await singleMachineData(filterData);
      }

      formKeyValue("countersData", countersData, resultElement);

      let countOfRecords: any = await getDocumentCount(
        collectionName,
        output,
        // query,
        (err, response) => {
          if (err) {
            return 0;
          } else {
            return response;
          }
        }
      );

      formKeyValue("count", countOfRecords, resultElement);

      result = resultElement;

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

export const countersOEE = (collectionName: any, condition: JSON) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
      // let machineCount: any;

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );

      const { materialCount, materialArray }: any = await getMaterialAttribute(
        parameters
      );

      output = await prepareQuery(date, parameters, output);

      // console.log("final quey to db===>", output);
      // console.log("final projection to db===>", projection);
      // console.log("final options to db===>", options);

      const filterData: any = await find(
        collectionName,
        output,
        // query,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("Error:", err);
            return [];
          } else {
            return data;
          }
        }
      );

      const multiMachineData: any = await counterOeeQuery(
        collectionName,
        output,
        // query,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("Error:", err);
            return [];
          } else {
            return data;
          }
        }
      );

      const singleMachineData = (filterData: any, multiMachineData: any) => {
        let cycleTime: any = [];
        let OEE: any = [];
        let performance: any = [];

        let productivity: any = [
          { name: "Production count ", x: [], y: [], type: "scatter" },
          { name: "Planned count ", x: [], y: [], type: "scatter" },
        ];

        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          const format = "YYYY-MM-DD HH:mm:ss";

          cycleTime.push(parseFloat(card.ACTUAL_CYCLE_TIME));
          OEE.push(parseFloat(card.OEE));
          performance.push(parseFloat(card.PERFORMANCE));
          // productivity graph
          var date = new Date(card.TIME_STAMP);
          var cDate: any = moment(date).format(format);
          productivity[0].x.push(cDate);
          productivity[1].x.push(cDate);
          productivity[0].y.push(card.RAW_PRODUCTION_COUNT);
          productivity[1].y.push(card.PLANNED_COUNT_INSTANT);
        });

        //production count and shot count logic

        // let machineWiseData: any = [];
        let moldWiseData: any = [];
        let totalProdCount: number = 0;
        let totalShotCount: number = 0;

        if (materialArray && materialArray.length) {
          materialArray.forEach((materail: any) => {
            let moldWiseObj: any = {
              name: materail,
              moldPCount: 0,
              moldSCount: 0,
            };

            let pCount: number = 0;
            let sCount: number = 0;

            multiMachineData.forEach((card: any) => {
              card = JSON.parse(JSON.stringify(card));

              if (materail === card._id.material) {
                let maxPCount = Math.max(...card.RAW_PRODUCTION_COUNT);
                let minPCount = Math.min(...card.RAW_PRODUCTION_COUNT);

                let maxSCount = Math.max(...card.RAW_SHOT_COUNT);
                let minSCount = Math.min(...card.RAW_SHOT_COUNT);

                if (maxPCount != minPCount) {
                  pCount = maxPCount - minPCount;
                } else {
                  pCount = maxPCount;
                }

                if (maxSCount != minSCount) {
                  sCount = maxSCount - minSCount;
                } else {
                  sCount = maxSCount;
                }

                moldWiseObj.moldPCount = moldWiseObj.moldPCount + pCount;
                moldWiseObj.moldSCount = moldWiseObj.moldSCount + sCount;

                totalProdCount = totalProdCount + pCount;
                totalShotCount = totalShotCount + sCount;
              }
            });
            if (moldWiseObj.moldPCount || moldWiseObj.moldSCount) {
              moldWiseData.push(moldWiseObj);
            }
          });
        }

        const avgCycleTime: number =
          cycleTime.reduce((a, b) => a + b, 0) / cycleTime.length;
        const avgOEE: number = OEE.reduce((a, b) => a + b, 0) / OEE.length;
        const avgperformance: number =
          performance.reduce((a, b) => a + b, 0) / performance.length;

        const data = {
          avgCycleTime: avgCycleTime.toFixed(2),
          avgOEE: avgOEE.toFixed(2),
          avgPerformance: avgperformance.toFixed(2),
          totalProdCount: totalProdCount,
          // productionCount: productionCount,
          totalShotCount: totalShotCount,
          // shotCount: shotCount,
          // machineWiseData: machineWiseData,
          moldWiseData: moldWiseData,
          productivityGraph: productivity,
        };
        return data;
      };

      // // console.log("filterData", multiMachineData);

      const allMachineData = (filterData: any) => {
        let totalProdCount: number = 0;
        let totalShotCount: number = 0;
        let machineWiseData: any = [];
        let moldWiseData: any = [];
        let moldWiseProdCount: any = [];
        let moldWiseShotCount: any = [];

        // let pCount:number = 0;
        // let sCount:number = 0;

        if (machineArray && machineArray.length) {
          machineArray.forEach((machine: any) => {
            let machineWiseObj: any = {
              name: machine,
              mold: [],
              machinePCount: 0,
              machineSCount: 0,
            };

            let moldObj: any = {};
            let pCount: number = 0;
            let sCount: number = 0;

            filterData.forEach((card: any) => {
              card = JSON.parse(JSON.stringify(card));

              if (machine === card._id.mid) {
                let maxPCount = Math.max(...card.RAW_PRODUCTION_COUNT);
                let minPCount = Math.min(...card.RAW_PRODUCTION_COUNT);

                let maxSCount = Math.max(...card.RAW_SHOT_COUNT);
                let minSCount = Math.min(...card.RAW_SHOT_COUNT);

                if (maxPCount != minPCount) {
                  pCount = maxPCount - minPCount;
                } else {
                  pCount = maxPCount;
                }

                if (maxSCount != minSCount) {
                  sCount = maxSCount - minSCount;
                } else {
                  sCount = maxSCount;
                }

                totalProdCount = totalProdCount + pCount;
                totalShotCount = totalShotCount + sCount;

                machineWiseObj.machinePCount =
                  machineWiseObj.machinePCount + pCount;
                machineWiseObj.machineSCount =
                  machineWiseObj.machineSCount + sCount;

                if (moldObj[card._id.material]) {
                  moldObj[card._id.material].pCount =
                    moldObj[card._id.material].pCount + pCount;
                  moldObj[card._id.material].sCount =
                    moldObj[card._id.material].sCount + sCount;
                } else {
                  moldObj[card._id.material] = {
                    mold: card._id.material,
                    pCount: pCount,
                    sCount: sCount,
                  };
                }
              }
            });

            Object.keys(moldObj).forEach((k) => {
              if (moldObj[k].pCount || moldObj[k].sCount) {
                machineWiseObj.mold.push({
                  name: moldObj[k].mold,
                  pCount: moldObj[k].pCount,
                  sCount: moldObj[k].sCount,
                });
              }
            });

            if (machineWiseObj.mold.length) {
              machineWiseData.push(machineWiseObj);
            }
          });
        }

        if (materialArray && materialArray.length) {
          materialArray.forEach((materail: any) => {
            let moldWiseObj: any = {
              name: materail,
              moldPCount: 0,
              moldSCount: 0,
            };

            let pCount: number = 0;
            let sCount: number = 0;

            filterData.forEach((card: any) => {
              card = JSON.parse(JSON.stringify(card));

              if (materail === card._id.material) {
                let maxPCount = Math.max(...card.RAW_PRODUCTION_COUNT);
                let minPCount = Math.min(...card.RAW_PRODUCTION_COUNT);

                let maxSCount = Math.max(...card.RAW_SHOT_COUNT);
                let minSCount = Math.min(...card.RAW_SHOT_COUNT);

                if (maxPCount != minPCount) {
                  pCount = maxPCount - minPCount;
                } else {
                  pCount = maxPCount;
                }

                if (maxSCount != minSCount) {
                  sCount = maxSCount - minSCount;
                } else {
                  sCount = maxSCount;
                }

                moldWiseObj.moldPCount = moldWiseObj.moldPCount + pCount;
                moldWiseObj.moldSCount = moldWiseObj.moldSCount + sCount;
              }
            });
            if (moldWiseObj.moldPCount || moldWiseObj.moldSCount) {
              moldWiseData.push(moldWiseObj);
            }
          });
        }

        const data = {
          totalProdCount: totalProdCount,
          totalShotCount: totalShotCount,
          machineWiseData: machineWiseData,
          moldWiseData: moldWiseData,
          // moldWiseProdCount: moldWiseProdCount,
          // moldWiseShotCount: moldWiseShotCount,
        };
        return data;
      };

      if (machineCount > 0) {
        // const countersData = await getCountersData(filterData)
        var countersData: any = await allMachineData(multiMachineData);
      } else {
        var countersData: any = await singleMachineData(
          filterData,
          multiMachineData
        );
      }

      formKeyValue("countersData", countersData, resultElement);

      result = resultElement;

      // // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

export const countersBreakdown = (collectionName: any, condition: JSON) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
      // let machineCount: any;

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );
      // const machineArray :any = await getMachineArray( parameters)

      output = await prepareQuery(date, parameters, output);

      // console.log("final quey to db===>", output);
      // console.log("final projection to db===>", projection);
      // console.log("final options to db===>", options);

      const filterData: any = await find(
        collectionName,
        output,
        // query,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("Error:", err);
            return [];
          } else {
            // // console.log("dat from db", data);

            return data;
          }
        }
      );

      const singleMachineData = (filterData: any) => {
        let breakdownDuration: number = 0;
        let totalReasons: number = 0;
        let machineWiseBreakdown: any = [];
        let reasonWiseObj = {};

        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          if (reasonWiseObj[card.REASON]) {
            reasonWiseObj[card.REASON].array.push(parseFloat(card.DURATION));
            reasonWiseObj[card.REASON].count =
              reasonWiseObj[card.REASON].count + 1;
          } else {
            reasonWiseObj[card.REASON] = {
              name: card.REASON,
              array: [parseFloat(card.DURATION)],
              count: 1,
            };
          }
        });

        Object.keys(reasonWiseObj).forEach((k) => {
          // // console.log("reasonWiseObj[k]", reasonWiseObj[k].array);

          const arraySum: any = reasonWiseObj[k].array.reduce(
            (a, b) => a + b,
            0
          );

          machineWiseBreakdown.push({
            name: reasonWiseObj[k].name,
            duration: arraySum,
            count: reasonWiseObj[k].count,
          });

          breakdownDuration = breakdownDuration + arraySum;
          totalReasons = totalReasons + reasonWiseObj[k].count;
        });

        // const sortedObj = _.sortBy(machineWiseBreakdown, "duration");
        const countObj = _.sortBy(machineWiseBreakdown, "count");

        // const lastObj =
        //   sortedObj && sortedObj.length
        //     ? sortedObj[sortedObj.length - 1]
        //     : undefined;

        // if (lastObj) {
        //   var mostOccuredReasons: any = [];
        //   sortedObj.forEach((obj: any) => {
        //     if (lastObj.duration == obj.duration) {
        //       mostOccuredReasons.push(obj);
        //     }
        //   });
        // } else {
        //   mostOccuredReasons = [];
        // }

        const lastCountObj =
          countObj && countObj.length
            ? countObj[countObj.length - 1]
            : undefined;

        if (lastCountObj) {
          var mostOccuredBreakdown: any = [];
          countObj.forEach((obj: any) => {
            if (lastCountObj.count == obj.count) {
              mostOccuredBreakdown.push(obj);
            }
          });
        } else {
          mostOccuredBreakdown = [];
        }

        const data = {
          machineName: machineArray[0],
          breakdownDuration: breakdownDuration,
          // mostOccuredBreakdown: mostOccuredReasons,
          mostOccuredBreakdown: mostOccuredBreakdown,
          totalReasons: totalReasons,
        };

        const machineWiseData = {
          machineWiseData: [data],
        };
        return machineWiseData;
      };

      const allMachineData = (filterData: any, machineArray: any) => {
        let totalDuration: any = 0;
        let totalReasons: any = 0;
        let mostOccuredArray: any = [];
        let machineWiseData: any = [];

        machineArray.forEach((machine: any) => {
          let series: any = {
            machineName: machine,
            breakdownDuration: 0,
            mostOccuredBreakdown: [],
          };
          let breakdown: number = 0;
          let reasonCount: number = 0;
          let reasonWiseBreakdown: any = [];
          let reasonWiseObj: any = {};

          filterData.forEach((card: any) => {
            card = JSON.parse(JSON.stringify(card));
            if (card.MACHINE_ID == machine) {
              if (reasonWiseObj[card.REASON]) {
                reasonWiseObj[card.REASON].array.push(
                  parseFloat(card.DURATION)
                );
                reasonWiseObj[card.REASON].count =
                  reasonWiseObj[card.REASON].count + 1;
              } else {
                reasonWiseObj[card.REASON] = {
                  name: card.REASON,
                  array: [parseFloat(card.DURATION)],
                  count: 1,
                };
              }
            }
          });

          Object.keys(reasonWiseObj).forEach((k) => {
            // // console.log("reasonWiseObj[k]", reasonWiseObj[k].array);

            const arraySum: any = reasonWiseObj[k].array.reduce(
              (a, b) => a + b,
              0
            );

            reasonWiseBreakdown.push({
              name: reasonWiseObj[k].name,
              duration: arraySum,
              count: reasonWiseObj[k].count,
            });

            breakdown = breakdown + arraySum;
            reasonCount = reasonCount + reasonWiseObj[k].count;
          });

          const countObj = _.sortBy(reasonWiseBreakdown, "count");

          // console.log("countobj", countObj);

          const lastCountObj =
            countObj && countObj.length
              ? countObj[countObj.length - 1]
              : undefined;

          if (lastCountObj) {
            var mostOccuredReasons: any = [];
            countObj.forEach((obj: any) => {
              if (lastCountObj.count == obj.count) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }

          series.breakdownDuration = breakdown;
          series.mostOccuredBreakdown = [...mostOccuredReasons];
          if (series.breakdownDuration > 0) {
            machineWiseData.push(series);
          }
          // console.log("machineWiseDataaaaaaaaaaaaaaaaaa",machineWiseData);
          
          mostOccuredArray = [...mostOccuredArray, ...mostOccuredReasons];
          totalDuration = totalDuration + breakdown;
          totalReasons = totalReasons + reasonCount;
        }); // end of machine loop

        // add up duplicate reasons in mostOccuredArray

        // // console.log("mostOccuredArray", mostOccuredArray);

        // mostOccuredArray.push({ name: 'RIB STICKING',duration:10, count: 3 })//ex:

        // const array = Array.from(
        //   mostOccuredArray.reduce(
        //     (m, { name, count }) => m.set(name, (m.get(name) || 0) + count),
        //     new Map()
        //   ),
        //   ([name, count]) => ({ name, count })
        // );
        // // console.log("array", array);

        var array = Object.values(
          mostOccuredArray.reduce((acc, { count, duration, ...r }) => {
            var key = Object.entries(r).join("-");
            acc[key] = acc[key] || { ...r, duration: 0, count: 0 };
            return (
              (acc[key].duration += duration), (acc[key].count += count), acc
            );
          }, {})
        );

        // const overAllSortedObj = _.sortBy(array, "duration"); // sort by duration
        const overAllSortedObj = _.sortBy(array, "count"); // sort by duration

        const overAllLastObj: any =
          overAllSortedObj && overAllSortedObj.length
            ? overAllSortedObj[overAllSortedObj.length - 1]
            : undefined;

        if (overAllLastObj) {
          var overAllMostOccuredReason: any = [];
          overAllSortedObj.forEach((obj: any) => {
            if (overAllLastObj.count == obj.count) {
              overAllMostOccuredReason.push(obj);
            }
          });
        } else {
          overAllMostOccuredReason = [];
        }

        const data = {
          machineWiseData: machineWiseData,
          totalDuration: totalDuration,
          totalReasons: totalReasons,
          overAllMostOccuredReason: overAllMostOccuredReason,
        };

        return data;
      };

      if (machineCount > 1) {
        var countersData: any = await allMachineData(filterData, machineArray);
      } else {
        var countersData: any = await singleMachineData(filterData);
      }

      ///////////////here i have to map machine List collection/////////////

      formKeyValue("countersData", countersData, resultElement);

      // let countOfRecords: any = await getDocumentCount(
      //   collectionName,
      //   output,
      //   // query,
      //   (err, response) => {
      //     if (err) {
      //       return 0;
      //     } else {
      //       return response;
      //     }
      //   }
      // );

      // formKeyValue("count", countOfRecords, resultElement);

      result = resultElement;

      // // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

export const countersPlannedAnalysis = (
  collectionName: any,
  condition: JSON
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
      // let machineCount: any;

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );
      // const machineArray :any = await getMachineArray( parameters)

      output = await prepareQuery(date, parameters, output);

      // console.log("final quey to db===>", output);
      // console.log("final projection to db===>", projection);
      // console.log("final options to db===>", options);

      const filterData: any = await find(
        collectionName,
        output,
        // query,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("Error :", err);
            return [];
          } else {
            // // console.log("dat from db", data);

            return data;
          }
        }
      );

      const singleMachineData = (filterData: any) => {
        // let toatalDowntime: number = 0;
        // let machineWiseDowntime: any = [];
        // let machineWiseObj = {};

        let downtimeDuration: number = 0;
        let totalReasons: number = 0;
        let machineWiseDowntime: any = [];
        let reasonWiseObj = {};

        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));

          if (reasonWiseObj[card.REASON]) {
            reasonWiseObj[card.REASON].array.push(parseFloat(card.DURATION));
            reasonWiseObj[card.REASON].count =
              reasonWiseObj[card.REASON].count + 1;
          } else {
            reasonWiseObj[card.REASON] = {
              name: card.REASON,
              array: [parseFloat(card.DURATION)],
              count: 1,
            };
          }
        });

        Object.keys(reasonWiseObj).forEach((k) => {
          // // console.log("reasonWiseObj[k]", reasonWiseObj[k].array);

          const arraySum: any = reasonWiseObj[k].array.reduce(
            (a, b) => a + b,
            0
          );

          machineWiseDowntime.push({
            name: reasonWiseObj[k].name,
            duration: arraySum,
            count: reasonWiseObj[k].count,
          });

          downtimeDuration = downtimeDuration + arraySum;
          totalReasons = totalReasons + reasonWiseObj[k].count;
        });

        const countObj = _.sortBy(machineWiseDowntime, "count");

        const lastCountObj =
          countObj && countObj.length
            ? countObj[countObj.length - 1]
            : undefined;

        if (lastCountObj) {
          var mostOccuredDowntime: any = [];
          countObj.forEach((obj: any) => {
            if (lastCountObj.count == obj.count) {
              mostOccuredDowntime.push(obj);
            }
          });
        } else {
          mostOccuredDowntime = [];
        }

        const data = {
          machineName: machineArray[0],
          downtimeDuration: downtimeDuration,
          mostOccuredDowntime: mostOccuredDowntime,
          totalReasons: totalReasons,
        };
        const machineWiseData = {
          machineWiseData: [data],
        };
        return machineWiseData;
      };

      const allMachineData = (filterData: any, machineArray: any) => {
        let totalDuration: any = 0;
        let totalReasons: any = 0;
        let mostOccuredArray: any = [];
        let machineWiseData: any = [];

        machineArray.forEach((machine: any) => {
          let series: any = {
            machineName: machine,
            downtimeDuration: 0,
            mostOccuredDowntime: [],
          };
          let downtime: number = 0;
          let reasonCount: number = 0;
          let reasonWiseDowntime: any = [];
          let reasonWiseObj: any = {};

          filterData.forEach((card: any) => {
            card = JSON.parse(JSON.stringify(card));
            if (card.MACHINE_ID == machine) {
              if (reasonWiseObj[card.REASON]) {
                reasonWiseObj[card.REASON].array.push(
                  parseFloat(card.DURATION)
                );
                reasonWiseObj[card.REASON].count =
                  reasonWiseObj[card.REASON].count + 1;
              } else {
                reasonWiseObj[card.REASON] = {
                  name: card.REASON,
                  array: [parseFloat(card.DURATION)],
                  count: 1,
                };
              }
            }
          });

          Object.keys(reasonWiseObj).forEach((k) => {
            const arraySum: any = reasonWiseObj[k].array.reduce(
              (a, b) => a + b,
              0
            );

            reasonWiseDowntime.push({
              name: reasonWiseObj[k].name,
              duration: arraySum,
              count: reasonWiseObj[k].count,
            });

            downtime = downtime + arraySum;
            reasonCount = reasonCount + reasonWiseObj[k].count;
          });

          const countObj = _.sortBy(reasonWiseDowntime, "count");

          const lastCountObj =
            countObj && countObj.length
              ? countObj[countObj.length - 1]
              : undefined;

          if (lastCountObj) {
            var mostOccuredReasons: any = [];
            countObj.forEach((obj: any) => {
              if (lastCountObj.count == obj.count) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }

          series.downtimeDuration = downtime;
          series.mostOccuredDowntime = [...mostOccuredReasons];
          if (series.downtimeDuration > 0) {
            machineWiseData.push(series);
          }
          mostOccuredArray = [...mostOccuredArray, ...mostOccuredReasons];
          totalDuration = totalDuration + downtime;
          totalReasons = totalReasons + reasonCount;
        }); // end of machine loop

        // add up duplicate reasons in mostOccuredArray

        // const array = Array.from(
        //   mostOccuredArray.reduce(
        //     (m, { name, count }) => m.set(name, (m.get(name) || 0) + count),
        //     new Map()
        //   ),
        //   ([name, count]) => ({ name, count })
        // );

        var array = Object.values(
          mostOccuredArray.reduce((acc, { count, duration, ...r }) => {
            var key = Object.entries(r).join("-");
            acc[key] = acc[key] || { ...r, duration: 0, count: 0 };
            return (
              (acc[key].duration += duration), (acc[key].count += count), acc
            );
          }, {})
        );

        const overAllSortedObj = _.sortBy(array, "count"); // sort by duration

        const overAllLastObj: any =
          overAllSortedObj && overAllSortedObj.length
            ? overAllSortedObj[overAllSortedObj.length - 1]
            : undefined;

        if (overAllLastObj) {
          var overAllMostOccuredReason: any = [];
          overAllSortedObj.forEach((obj: any) => {
            if (overAllLastObj.count == obj.count) {
              overAllMostOccuredReason.push(obj);
            }
          });
        } else {
          overAllMostOccuredReason = [];
        }

        const data = {
          machineWiseData: machineWiseData,
          totalDuration: totalDuration,
          totalReasons: totalReasons,
          overAllMostOccuredReason: overAllMostOccuredReason,
        };

        return data;
      };

      if (machineCount > 1) {
        var countersData: any = await allMachineData(filterData, machineArray);
      } else {
        var countersData: any = await singleMachineData(filterData);
      }

      formKeyValue("countersData", countersData, resultElement);

      result = resultElement;

      // // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

export const countersEnergy = (collectionName: any, condition: JSON) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any, parameters: any, projection: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};
      // let machineCount: any;

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      projection = getConditionAttribute(condition, "projection");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );
      // const machineArray :any = await getMachineArray( parameters)

      // // console.log("totalMachines", machineCount);

      output = await prepareQuery(date, parameters, output);

      // console.log("l3007final quey to db===>", output);
      // console.log("final projection to db===>", projection);
      // console.log("final options to db===>", options);

      const filterData: any = await getEnergyCounter(
        collectionName,
        output,
        // query,
        projection,
        options,
        (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("Failed to find energy counters");
            return [];
          } else {
            // // console.log("dat from db", data);

            return data;
          }
        }
      );

      // // console.log("filterData", filterData);

      const singleMachineData = (filterData: any) => {
        let totalEnergy: number = 0;
        let totalPowerArray: any = [];
        let totalavgPower: number = 0;
        let energyPerPart: number = 0;

        // console.log("inside single machine data",filterData);
        
        filterData.forEach((card: any) => {
          // console.log("CardData",card);
          
          card = JSON.parse(JSON.stringify(card));

          //totalEnergy WH count logic
          if (card.WH && card.WH.length) {
            let newWh: any = card.WH.filter((e) => {
              return e > 10;
            });
            // console.log(newWh, "2401");
            let min = newWh.length > 0 ? Math.min(...newWh) : 0;
            let max = newWh.length > 0 ? Math.max(...newWh) : 0;
            // if (max! == min) {
              // console.log("totalEnergy, max - min", max , min);
            totalEnergy = totalEnergy + max - min;

            
            // } else {
            //   totalEnergy = max;
            // }
            min = 0;
            max = 0;
          }

          //totalEnergy WATTS_TOTAL logic
          totalPowerArray = [...totalPowerArray, ...card.WATTS_TOTAL];
        });

        energyPerPart = totalEnergy / machineCount;

        if (totalPowerArray && totalPowerArray.length) {
          totalavgPower =
            totalPowerArray.reduce((a, b) => a + b, 0) / totalPowerArray.length;
            // console.log("before single",totalavgPower);

            totalavgPower=totalavgPower/1000;

            // console.log("after single",totalavgPower);
            
        }
        // console.log(energyPerPart, "2479");

        const data = {
          totalEnergy: Number(totalEnergy).toFixed(2) || totalEnergy,
          // totalEnergy: totalEnergy,
          totalavgPower: Number(totalavgPower).toFixed(2) || totalavgPower,
          energyPerPart: Number(energyPerPart).toFixed(2) || energyPerPart,
        };
        return data;
      };

      const allMachineData = (filterData: any, machineArray: any) => {
        let totalEnergy: number = 0;
        let totalavgPower: number = 0;
        let machineWiseData: any = [];
        let energyPerPart: number = 0;    
        
        // console.log("inside all machine data",machineArray);
        // console.log("filterData...",filterData);
        
        

        machineArray.forEach((machine: any) => {
          
          let series: any = {
            machineName: machine,
            energy: 0,
            avgpower: 0,
          };

          let powerArray: any = [];
          filterData.forEach((card: any) => {
            // console.log("cardData..........",card);
            
            card = JSON.parse(JSON.stringify(card));
            if (card._id.mid == machine) {
              //totalEnergy WH count logic

              if (card.WH && card.WH.length) {
                let newWh: any = card.WH.filter((e) => {               
                  return e != 0;
                });   
                  
                                   
                //condition for infinity
                if(newWh.length==0){          
                series.energy = series.energy + 0;       
                }
                else if(newWh.length>=0){                            
                  let min = newWh.length > 0 ? Math.min(...newWh) : 0;
                  let max = newWh.length > 0 ? Math.max(...newWh) : 0;
                  // console.log("min",min);
                  // console.log("max",max);
              
                  // if (max!= min) {
                  series.energy = series.energy + (max - min);
                  // } else {
                  //   console.log("series energy",max,min);
                    
                  //   series.energy = series.energy + max;
                  // }
                  min = 0;
                  max = 0;
                }
                else{
                  console.log("No Data");                 
                }            
              }
              powerArray = [...powerArray, ...card.WATTS_TOTAL];
            }
            if (powerArray && powerArray.length) {
              // console.log("powerArray",powerArray);
              
              let avg: number =
                powerArray.reduce((a, b) => a + b, 0) / powerArray.length;

              let localAvgPower = (parseFloat(Number(avg).toFixed(2)))/1000 || avg/1000;
              series.avgpower = Number(localAvgPower).toFixed(2) || localAvgPower;
            }
          });
          series.energy = Number(series.energy).toFixed(2) || series.energy;
          machineWiseData.push(series);
          totalEnergy = Number(totalEnergy) + Number(series.energy);
         

          totalavgPower = Number(totalavgPower) + Number(series.avgpower);
          // console.log("before multi",totalavgPower);

          // totalavgPower=totalavgPower/1000;
          // console.log("after multi",totalavgPower);


        }); // end of machine loop
        energyPerPart = totalEnergy / machineCount;

        // console.log(energyPerPart, "2906");

        // console.log("totalEnergy", totalEnergy);
// totalavgPower=totalavgPower;
// console.log("after multi",totalavgPower);

        const data = {
          machineWiseData: machineWiseData,
          totalEnergy: Number(totalEnergy).toFixed(2) || totalEnergy,
          energyPerPart: Number(energyPerPart).toFixed(2) || energyPerPart,
          totalavgPower: Number(totalavgPower).toFixed(2) || totalavgPower,
        };
        // console.log("dataInside all machine",data);
        

        return data;
      };

      if (machineCount > 0) {
        var countersData: any = await allMachineData(filterData, machineArray);
      } else {
        var countersData: any = await singleMachineData(filterData);
      }

      formKeyValue("countersData", countersData, resultElement);

      result = resultElement;

      // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};










export const countersRejectionOld = (collectionName: any, condition: JSON) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any,
        parameters: any,
        projection: any = {
          _id: "$MACHINE_ID",
          TOTAL: { $sum: { $toInt: "$" + "TOTAL" } },
        },
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      graphRequired = getConditionAttribute(condition, "graphs");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );

      // returnObj = checkConditions(date);
      // if (!returnObj.value) {
      //   reject(returnObj.data);
      // }

      output = await prepareQuery(date, parameters, output);

      //============= prepare projection =========

      graphRequired.forEach((r) => {
        projection[r] = {
          $sum: { $toInt: "$" + r },
        };
      });

      // console.log("final query to db", output);
      // console.log("final projection to db", projection);
      // console.log("final options to db", options);

      const filterData: any = await rejectionGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return data;
          }
        }
      );

      // // console.log("filterData", filterData);

      const singleMachineData = (filterData, graphRequired) => {
        let totalRejctions: any = 0;
        let mostOccuredRejection: any = [];
        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));
          totalRejctions = totalRejctions + card.TOTAL;
          let reasonsArray: any = [];
          graphRequired.forEach((reason: any) => {
            // // console.log("card[reason]", card[reason]);
            if (card[reason] !== 0) {
              reasonsArray.push({ name: reason, qty: card[reason] });
            }
          });

          const sortedArray = _.sortBy(reasonsArray, "qty");

          const lastObj =
            sortedArray && sortedArray.length
              ? sortedArray[sortedArray.length - 1]
              : undefined;

          if (lastObj) {
            var mostOccuredReasons: any = [];
            sortedArray.forEach((obj: any) => {
              if (lastObj.qty == obj.qty) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }
          mostOccuredRejection = [...mostOccuredReasons];
        });

        const data = {
          totalRejctions: totalRejctions,
          mostOccuredRejection: mostOccuredRejection,
        };

        return data;
      };

      const allMachineData = (filterData, machineArray, graphRequired) => {
        let totalRejctions: any = 0;
        let machineWiseData: any = [];
        let allRejctions: any = [];
        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));
          const series: any = { name: card._id, rejectionCount: card.TOTAL };
          totalRejctions = totalRejctions + card.TOTAL;
          let reasonsArray: any = [];
          graphRequired.forEach((reason: any) => {
            // // console.log("card[reason]", card[reason]);
            if (card[reason] !== 0) {
              reasonsArray.push({ name: reason, qty: card[reason] });
            }
          });

          const sortedArray = _.sortBy(reasonsArray, "qty");

          const lastObj =
            sortedArray && sortedArray.length
              ? sortedArray[sortedArray.length - 1]
              : undefined;

          if (lastObj) {
            var mostOccuredReasons: any = [];
            sortedArray.forEach((obj: any) => {
              if (lastObj.qty == obj.qty) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }
          series.mostOccuredRejections = mostOccuredReasons;
          machineWiseData.push(series);
          allRejctions = [...allRejctions, ...sortedArray];
        });

        // add up duplicate reasons in mostOccuredArray
        const array = Array.from(
          allRejctions.reduce(
            (m, { name, qty }) => m.set(name, (m.get(name) || 0) + qty),
            new Map()
          ),
          ([name, qty]) => ({ name, qty })
        );

        const overAllSortedArray = _.sortBy(array, "qty");

        const overAllLastObj =
          overAllSortedArray && overAllSortedArray.length
            ? overAllSortedArray[overAllSortedArray.length - 1]
            : undefined;

        if (overAllLastObj) {
          var overAllMostOccuredReasons: any = [];
          overAllSortedArray.forEach((obj: any) => {
            if (overAllLastObj.qty == obj.qty) {
              overAllMostOccuredReasons.push(obj);
            }
          });
        } else {
          overAllMostOccuredReasons = [];
        }

        const data = {
          totalRejctions: totalRejctions,
          machineWiseData: machineWiseData,
          overAllmostOccuredRejection: overAllMostOccuredReasons,
        };

        return data;
      };

      if (machineCount > 1) {
        var countersData: any = await allMachineData(
          filterData,
          machineArray,
          graphRequired
        );
      } else {
        var countersData: any = await singleMachineData(
          filterData,
          graphRequired
        );
      }

      formKeyValue("countersData", countersData, resultElement);

      result = resultElement;

      // // console.log("result", result);

      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

export const countersRejection = (collectionName: any, condition: JSON) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any,
        parameters: any,
        projection: any = {
          _id: "$MACHINE_ID",
          TOTAL: {
            $sum: {
              $convert: {
                input: "$" + "TOTAL",
                to: "int",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      graphRequired = getConditionAttribute(condition, "graphs");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );

      // returnObj = checkConditions(date);
      // if (!returnObj.value) {
      //   reject(returnObj.data);
      // }

      output = await prepareQuery(date, parameters, output);

      //============= prepare projection =========

      graphRequired.forEach((r) => {
        projection[r] = {
          $sum: {
            $convert: {
              input: "$" + r,
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        };

        projection[r + "_count"] = {
          $sum: {
            $cond: {
              if: { $ne: ["$" + r, "0"] },
              then: 1,
              else: 0,
            },
          },
        };
      });

      // console.log("final query to db", output);
      console.log("final projection to db", projection);
      // console.log("final options to db", options);

      const filterData: any = await rejectionGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return data;
          }
        }
      );

      const singleMachineData = (filterData, graphRequired) => {
        let totalRejctions: any = 0;
        let mostOccuredRejection: any = [];
        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));
          totalRejctions = totalRejctions + card.TOTAL;
          let reasonsArray: any = [];
          graphRequired.forEach((reason: any) => {
            // // console.log("card[reason]", card[reason + "_count"]);
            if (card[reason] !== 0) {
              reasonsArray.push({
                name: reason,
                qty: card[reason],
                count: card[reason + "_count"],
              });
            }
          });

          const sortedArray = _.sortBy(reasonsArray, "count");

          const lastObj =
            sortedArray && sortedArray.length
              ? sortedArray[sortedArray.length - 1]
              : undefined;

          if (lastObj) {
            var mostOccuredReasons: any = [];
            sortedArray.forEach((obj: any) => {
              if (lastObj.count == obj.count) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }

          mostOccuredRejection = [...mostOccuredReasons];
        });
        const data = {
          machineName: machineArray[0],
          rejectionCount: totalRejctions,
          mostOccuredRejection: mostOccuredRejection,
        };

        const machineWiseData = {
          totalRejctions: data.rejectionCount ? data.rejectionCount : null,
          machineWiseData: [data],
        };

        return machineWiseData;
      };

      const allMachineData = (filterData, machineArray, graphRequired) => {
        let totalRejctions: any = 0;
        let machineWiseData: any = [];
        let allRejctions: any = [];
        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));
          const series: any = {
            machineName: card._id,
            rejectionCount: card.TOTAL,
          };
          totalRejctions = totalRejctions + card.TOTAL;
          let reasonsArray: any = [];
          graphRequired.forEach((reason: any) => {
            // // console.log("card[reason]", card[reason]);
            if (card[reason] !== 0) {
              reasonsArray.push({
                name: reason,
                qty: card[reason],
                count: card[reason + "_count"],
              });
            }
          });

          const sortedArray = _.sortBy(reasonsArray, "count");

          const lastObj =
            sortedArray && sortedArray.length
              ? sortedArray[sortedArray.length - 1]
              : undefined;

          if (lastObj) {
            var mostOccuredReasons: any = [];
            sortedArray.forEach((obj: any) => {
              if (lastObj.count == obj.count) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }
          series.mostOccuredRejections = mostOccuredReasons;
          machineWiseData.push(series);
          allRejctions = [...allRejctions, ...sortedArray];
        });
        // add up duplicate reasons in mostOccuredArray
        const array = Array.from(
          allRejctions.reduce(
            (m, { name, count }) => m.set(name, (m.get(name) || 0) + count),
            new Map()
          ),
          ([name, count]) => ({ name, count })
        );

        const overAllSortedArray = _.sortBy(array, "count");

        const overAllLastObj =
          overAllSortedArray && overAllSortedArray.length
            ? overAllSortedArray[overAllSortedArray.length - 1]
            : undefined;

        if (overAllLastObj) {
          var overAllMostOccuredReasons: any = [];
          overAllSortedArray.forEach((obj: any) => {
            if (overAllLastObj.count == obj.count) {
              overAllMostOccuredReasons.push(obj);
            }
          });
        } else {
          overAllMostOccuredReasons = [];
        }

        const data = {
          totalRejctions: totalRejctions,
          machineWiseData: machineWiseData,
          overAllmostOccuredRejection: overAllMostOccuredReasons,
        };

        return data;
      };

      if (machineCount > 1) {
        var countersData: any = await allMachineData(
          filterData,
          machineArray,
          graphRequired
        );
      } else {
        var countersData: any = await singleMachineData(
          filterData,
          graphRequired
        );
      }

      formKeyValue("machineCounters", countersData, resultElement);

      result = resultElement;

      // // console.log("result", result);
      // console.log("qqqqqq", result)
      resolve(result);

      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

export const countersRejectionMoldlWise = (
  collectionName: any,
  condition: JSON
) => {
  return new Promise(async (resolve, reject) => {
    try {
      let date: any,
        parameters: any,
        projection: any = {
          _id: "$MOULD",
          TOTAL: {
            $sum: {
              $convert: {
                input: "$" + "TOTAL",
                to: "int",
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
        graphRequired: any;
      let resultElement: any = {};
      let returnObj: any = {};
      let result: any = {},
        output = {};

      logger.debug(
        logger.DEFAULT_MODULE,
        "",
        "DEBUG:2 - CONDITION SEGREGATION"
      );
      date = getConditionAttribute(condition, "date");
      parameters = getConditionAttribute(condition, "parameters");
      graphRequired = getConditionAttribute(condition, "graphs");

      const { machineCount, machineArray }: any = await getMachineAttribute(
        parameters
      );

      // returnObj = checkConditions(date);
      // if (!returnObj.value) {
      //   reject(returnObj.data);
      // }

      output = await prepareQuery(date, parameters, output);

      //============= prepare projection =========

      graphRequired.forEach((r) => {
        projection[r] = {
          $sum: {
            $convert: {
              input: "$" + r,
              to: "int",
              onError: 0,
              onNull: 0,
            },
          },
        };

        projection[r + "_count"] = {
          $sum: {
            $cond: {
              if: { $ne: ["$" + r, "0"] },
              then: 1,
              else: 0,
            },
          },
        };
      });

      // console.log("final query to db", output);
      // console.log("final projection to db", projection);
      // console.log("final options to db", options);

      const filterData: any = await rejectionGraphData(
        collectionName,
        output,
        projection,
        options,
        async (err: any, data: any, responseTime: any) => {
          if (err) {
            // console.log("error while finding");
            return [];
          } else {
            return data;
          }
        }
      );

      const sortMouldData = (filterData, machineArray, graphRequired) => {
        let totalRejctions: any = 0;
        let mouldWiseData: any = [];
        let allRejctions: any = [];
        filterData.forEach((card: any) => {
          card = JSON.parse(JSON.stringify(card));
          const series: any = {
            mouldName: card._id,
            rejectionCount: card.TOTAL,
          };
          totalRejctions = totalRejctions + card.TOTAL;
          let reasonsArray: any = [];
          graphRequired.forEach((reason: any) => {
            // // console.log("card[reason]", card[reason]);
            if (card[reason] !== 0) {
              reasonsArray.push({
                name: reason,
                qty: card[reason],
                count: card[reason + "_count"],
              });
            }
          });

          const sortedArray = _.sortBy(reasonsArray, "count");

          const lastObj =
            sortedArray && sortedArray.length
              ? sortedArray[sortedArray.length - 1]
              : undefined;

          if (lastObj) {
            var mostOccuredReasons: any = [];
            sortedArray.forEach((obj: any) => {
              if (lastObj.count == obj.count) {
                mostOccuredReasons.push(obj);
              }
            });
          } else {
            mostOccuredReasons = [];
          }
          series.mostOccuredRejections = mostOccuredReasons;
          mouldWiseData.push(series);
          allRejctions = [...allRejctions, ...sortedArray];
        });

        // add up duplicate reasons in mostOccuredArray
        const array = Array.from(
          allRejctions.reduce(
            (m, { name, count }) => m.set(name, (m.get(name) || 0) + count),
            new Map()
          ),
          ([name, count]) => ({ name, count })
        );

        const overAllSortedArray = _.sortBy(array, "count");

        const overAllLastObj =
          overAllSortedArray && overAllSortedArray.length
            ? overAllSortedArray[overAllSortedArray.length - 1]
            : undefined;

        if (overAllLastObj) {
          var overAllMostOccuredReasons: any = [];
          overAllSortedArray.forEach((obj: any) => {
            if (overAllLastObj.count == obj.count) {
              overAllMostOccuredReasons.push(obj);
            }
          });
        } else {
          overAllMostOccuredReasons = [];
        }

        const data = {
          totalRejctions: totalRejctions,
          mouldWiseData: mouldWiseData,
          overAllmostOccuredRejection: overAllMostOccuredReasons,
        };

        return data;
      };

      var countersData: any = await sortMouldData(
        filterData,
        machineArray,
        graphRequired
      );

      formKeyValue("mouldCounters", countersData, resultElement);

      result = resultElement;

      resolve(result);
      logger.debug(logger.DEFAULT_MODULE, "", "DEBUG: 7 END OF EXECUTION");
    } catch (err) {
      reject(err);
    }
  });
};

