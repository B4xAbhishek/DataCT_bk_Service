import * as logger from "../../models/logs";
import { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "../../models/models";
import { find } from "../../models/dynamicmodel";
import { CONSTANTS, MACHINE_STATUS } from "../../utils/constants";
import * as DynamicModels from "../../models/dynamicmodel";
import { getDocumentCount, distinct } from "../../models/dynamicmodel";
import ExcelJs from "exceljs";
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
  searchGraphForCounterChange,
  searchGraphForMouldChange,
  searchGraphForplannedAnalysis,
  searchGraphForRejectionAnalysis,
} from "../operations/search";
import { config } from "../../config/config";
var html_to_pdf = require("html-pdf-node");
let path = require("path");
let fs = require("fs");
let ejs = require("ejs");
require("dotenv").config();

let reportType: any = {
  OVERALL_PDF: "overallPdf",
  OVERALL_EXCEL: "overallExcel",
};

export async function breakDown(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  console.log("inside breakdown");

  var request: JSON = req.body;
  let collectionName = "BREAKDOWN_ANALYSIS";
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;
  let type = req.params.type ? req.params.type : reportType["OVERALL_PDF"];

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: any = request["conditions"];
  let indicator: any = request["indicator"] ? request["indicator"] : {};
  let infoData = conditionArray && conditionArray[0] ? conditionArray[0] : {};

  if (!conditionArray) {
    console.log("inside if condition");

    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: "Insert condition objects.",
    };
    next();
    return;
  }

  ///////////////////
  // const getMachine = (machine: any) => {
  let result: any = [];
  let result2: any = {};

  result = await DynamicModels.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }
  // console.log("result2", result2);

  // const [MACHINE_ID,MACHINE_NAME] = result
  // console.log("machineID and MachineName",MACHINE_ID,MACHINE_NAME);
  //   return result2
  // };
  // })
  //   };
  // const result2 = await getMachine("IMM-01")
  // console.log("getMachine List",result2);

  ///////////////////////////

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersBreakdown(collectionName, element));
    promises.push(searchDataForStackedGraph(collectionName, element));
    // promises.push(
    //   search(
    //     collectionName,
    //     element,
    //     page,
    //     limit,
    //     sort,
    //     direction,
    //     searchString
    //   )
    // );
    Promise.all(promises)
      .then((response: any) => {
        logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:8");
        let counterData: any = {};
        let graphData: any = {};
        let tableData: any = {};
        let totalReports: any;
        let flowData: any = {};
        let reportValues: any = [];
        let showHeaders: any = [];
        console.log("response data", response);

        for (var r in response) {
          if (response[r]["countersData"]) {
            counterData = response[r]["countersData"];
          } else if (response[r]["graphData"]) {
            graphData = response[r]["graphData"];
          } else if (response[r]["tableData"]) {
            reportValues = response[r]["tableData"];
            totalReports = response[r]["count"];
            let newHeaders: any = [];
            if (reportValues && reportValues[0]) {
              for (var e in reportValues) {
                showHeaders = [...showHeaders, ...Object.keys(reportValues[e])];
              }
              var temp = new Set(showHeaders);
              showHeaders = [...temp];
              for (var e in showHeaders) {
                if (showHeaders[e] != "_id") {
                  newHeaders.push({
                    text: showHeaders[e],
                    value: showHeaders[e],
                  });
                }
              }
            }

            tableData = {
              reportValues: reportValues,
              totalReports: totalReports,
              showHeaders: newHeaders,
            };
            // console.log("124line", tableData.showHeaders);
          }
        }

        counterData.machineWiseData.forEach(async (item, i) => {
          item.machineName = result2[item.machineName];
          if (i == counterData.machineWiseData.length - 1)
            console.log("item", counterData.machineWiseData);
        });
        ///////////////////////////////////////////////////////////////////////

        let excelTable: any = {};
        excelTable["column"] = [];
        excelTable["row"] = [];
        let tempExcelTable: any = [];
        reportValues.forEach((element) => {
          let temp = {};
          temp["FROM DATE"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[0]
              ? element["FROM_TIME"].split(", ")[0]
              : "";
          temp["FROM TIME"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[1]
              ? element["FROM_TIME"].split(", ")[1]
              : "";
          temp["TO DATE"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[0]
              ? element["TO_TIME"].split(", ")[0]
              : "";
          temp["TO TIME"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[1]
              ? element["TO_TIME"].split(", ")[1]
              : "";
          temp["RECORDED DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["RECORDED TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          // temp["MACHINE NAME"] = element["MACHINE_ID"]
          //   ? element["MACHINE_ID"]
          //   : "";
          temp["SHIFT"] = element["SHIFT"] ? element["SHIFT"] : "";
          temp["BREAKDOWN DURATION"] =
            element["DURATION"] && parseFloat(element["DURATION"])
              ? parseFloat(element["DURATION"])
              : 0;
          temp["BREAKDOWN REASON"] = element["REASON"] ? element["REASON"] : "";
          temp["OPERATOR"] = element["OPERATOR"] ? element["OPERATOR"] : "";
          temp["SUPERVISOR"] = element["SUPERVISOR"];
          // temp["Reported By"] = element["Reported By"]
          //   ? element["SUPERVISOR"]
          //   : "";
          tempExcelTable.push(temp);
        });
        for (var e in tempExcelTable) {
          excelTable["column"] = [
            ...excelTable["column"],
            ...Object.keys(tempExcelTable[e]),
          ];
        }
        var temp = new Set(excelTable["column"]);
        excelTable["column"] = [...temp];
        for (var e in excelTable["column"]) {
          excelTable["column"][e] = { name: excelTable["column"][e] };
        }
        for (var m in tempExcelTable) {
          let temp1: any = [];
          for (var n in excelTable["column"]) {
            temp1.push(tempExcelTable[m][excelTable["column"][n]["name"]]);
          }
          excelTable["row"].push(temp1);
        }

        let pdfTable: any = {};
        // pdfTable["column"] = [];
        // pdfTable["row"] = [];
        // excelTable["column"].forEach((element) => {
        //   pdfTable["column"].push({ text: element.name, value: element.name });
        // });

        // excelTable["row"].forEach((row) => {
        //   let temp: any = {};
        //   for (var x in excelTable["column"]) {
        //     temp[excelTable["column"][x]["name"]] = row[x];
        //   }
        //   pdfTable["row"].push(temp);
        // });

        let counterText: any = {};
        let counterTempText: any = {};
        let counterExcelTable: any = {};
        let counterPdfTable: any = {};
        let counterTempTable: any = {};
        let keys = Object.keys(counterData);
        keys.forEach((e) => {
          if (typeof counterData[e] == "string") {
            counterTempText[e] = counterData[e];
          } else if (typeof counterData[e] == "number") {
            counterTempText[e] = counterData[e];
          } else if (counterData[e] instanceof Array && counterData[e].length) {
            counterTempTable[e] = [];
            counterData[e].forEach((g) => {
              let temp: any = [];
              let key3: any = Object.keys(g);
              key3.forEach((ele) => {
                if (typeof g[ele] == "string") {
                  temp[ele] = g[ele];
                }
                if (typeof g[ele] == "number") {
                  temp[ele] = g[ele];
                }
                if (g[ele] instanceof Array && g[ele].length) {
                  let key5 = Object.keys(g[ele][0]);
                  key5.forEach((er) => {
                    temp[er] = g[ele][0][er];
                  });
                }
              });
              counterTempTable[e].push(temp);
              // console.log("temp",temp);
            });
          }
        });

        if (counterTempText) {
          if (counterTempText["totalDuration"]) {
            counterText["TOTAL DURATION (mins)"] =
              counterTempText["totalDuration"] &&
              parseFloat(counterTempText["totalDuration"])
                ? parseFloat(counterTempText["totalDuration"])
                : 0;
          }
          if (counterTempText["totalReasons"]) {
            counterText["TOTAL REASONS"] =
              counterTempText["totalReasons"] &&
              parseFloat(counterTempText["totalReasons"])
                ? parseFloat(counterTempText["totalReasons"])
                : 0;
          }
        }

        if (counterTempTable && counterTempTable["machineWiseData"]) {
          counterExcelTable["MACHINE WISE DATA"] = {};
          counterExcelTable["MACHINE WISE DATA"]["column"] = [];
          counterExcelTable["MACHINE WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["machineWiseData"].forEach((element) => {
            let temp = {};
            temp["MACHINE NAME"] = element["machineName"]
              ? element["machineName"]
              : "";
            temp["BREAKDOWN DURATION (mins)"] =
              element["breakdownDuration"] &&
              parseFloat(element["breakdownDuration"])
                ? parseFloat(element["breakdownDuration"])
                : 0;
            temp["MOST OCCURED BREAKDOWN REASON"] = element["name"]
              ? element["name"]
              : "";
            temp["MOST OCCURED BREAKDOWN DURATION (mins)"] =
              element["duration"] && parseFloat(element["duration"])
                ? parseFloat(element["duration"])
                : 0;
            temp["MOST OCCURED BREAKDOWN COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            temp["Reported By"] = "";

            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MACHINE WISE DATA"]["column"] = [
              ...counterExcelTable["MACHINE WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MACHINE WISE DATA"]["column"]);
          counterExcelTable["MACHINE WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MACHINE WISE DATA"]["column"]) {
            counterExcelTable["MACHINE WISE DATA"]["column"][e] = {
              name: counterExcelTable["MACHINE WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MACHINE WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MACHINE WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MACHINE WISE DATA"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["overAllMostOccuredReason"]) {
          counterExcelTable["OVERALL MOST OCCURED REASON"] = {};
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [];
          counterExcelTable["OVERALL MOST OCCURED REASON"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["overAllMostOccuredReason"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["DURATION (mins)"] = element["duration"] ? element["duration"] : "";
            temp["COUNT"] = element["count"] ? element["count"] : "";
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
              ...counterExcelTable["OVERALL MOST OCCURED REASON"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"]
          );
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
            ...temp,
          ];
          for (var e in counterExcelTable["OVERALL MOST OCCURED REASON"][
            "column"
          ]) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][e] = {
              name: counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][
                e
              ],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["OVERALL MOST OCCURED REASON"][
              "column"
            ]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][n][
                    "name"
                  ]
                ]
              );
            }
            counterExcelTable["OVERALL MOST OCCURED REASON"]["row"].push(temp1);
          }
        }

        let dkey = Object.keys(counterExcelTable);
        dkey.forEach((rr) => {
          counterPdfTable[rr] = {};
          counterPdfTable[rr]["column"] = [];
          counterPdfTable[rr]["row"] = [];
          counterExcelTable[rr]["column"].forEach((element) => {
            counterPdfTable[rr]["column"].push({
              text: element.name,
              value: element.name,
            });
          });

          counterExcelTable[rr]["row"].forEach((row) => {
            let temp: any = {};
            for (var x in counterExcelTable[rr]["column"]) {
              temp[counterExcelTable[rr]["column"][x]["name"]] = row[x];
            }
            counterPdfTable[rr]["row"].push(temp);
          });
        });

        infoData["parameters"].forEach((e) => {
          if (
            (e["name"] == "MACHINE_ID" || e["name"] == "MACHINE_NAME") &&
            indicator["allMachines"] &&
            indicator["allMachines"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "SHIFT" &&
            indicator["allShifts"] &&
            indicator["allShifts"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "REASON" &&
            indicator["allReasons"] &&
            indicator["allReasons"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            (e["name"] == "MATERIAL" || e["name"] == "MATERIAL_DESCRIPTION") &&
            indicator["allMaterials"] &&
            indicator["allMaterials"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
        });

        graphData.stackGraph.forEach((g) => {
          g.name = result2[g.name];
        });

        graphData.pieChart.forEach((g) => {
          g.name = result2[g.name];
        });
        let final = infoData.parameters[1].value;
        console.log("ffff", final);

        if (final[0] === "ALL SELECTED") {
          final[0] = final[0];
          console.log("in ifs");
        } else {
          final.forEach((e, i) => {
            final[i] = result2[e];
          });
          console.log("in else");
        }
        let finalData = {
          infoData: infoData,
          tableData: tableData,
          graphData: graphData,
          counterData: counterData,
          flowData: flowData,
          excelTable: excelTable,
          pdfTable: pdfTable,
          counterPdfTable: counterPdfTable,
          counterExcelTable: counterExcelTable,
          counterText: counterText,
        };

        if (type == reportType["OVERALL_PDF"]) {
          createPdf("breakdown", finalData, (err, data) => {
            if (err) {
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: "Something went wrong!",
              };
              next();
              return;
            }
            req.apiStatus = {
              isSuccess: true,
              data: data,
            };
            next();
          });
        } else if (type == reportType["OVERALL_EXCEL"]) {
          createExcel(
            "Breakdown-Analysis-Report",
            conditionArray[0],
            finalData,
            (err, data) => {
              console.log(data);

              if (err) {
                req.apiStatus = {
                  isSuccess: false,
                  error: ErrorCodes[1002],
                  data: "Something went wrong!",
                };
                next();
                return;
              }
              req.apiStatus = {
                isSuccess: true,
                data: data,
              };
              next();
            }
          );
        } else {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1002],
            data: "Report type invalid",
          };
          next();
          return;
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
  });
}

export async function planned(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "PLANNED_ANALYSIS";
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;
  let type = req.params.type ? req.params.type : reportType["OVERALL_PDF"];

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];

  let infoData: any =
    conditionArray && conditionArray[0] ? conditionArray[0] : {};
  let indicator: any = request["indicator"] ? request["indicator"] : {};

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

  result = await DynamicModels.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersPlannedAnalysis(collectionName, element));
    promises.push(searchDataForStackedGraph(collectionName, element));
    // promises.push(
    //   search(
    //     collectionName,
    //     element,
    //     page,
    //     limit,
    //     sort,
    //     direction,
    //     searchString
    //   )
    // );
    Promise.all(promises)
      .then((response: any) => {
        logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
        let counterData: any = {};
        let graphData: any = {};
        let tableData: any = {};
        let flowData: any = {};
        let totalReports: any;
        let reportValues: any = [];
        let showHeaders: any = [];

        for (var r in response) {
          if (response[r]["countersData"]) {
            counterData = response[r]["countersData"];
          } else if (response[r]["graphData"]) {
            graphData = response[r]["graphData"];
          } else if (response[r]["tableData"]) {
            reportValues = response[r]["tableData"];
            totalReports = response[r]["count"];
            let newHeaders: any = [];
            if (reportValues && reportValues[0]) {
              for (var e in reportValues) {
                showHeaders = [...showHeaders, ...Object.keys(reportValues[e])];
              }
              var temp = new Set(showHeaders);
              showHeaders = [...temp];
              for (var e in showHeaders) {
                if (showHeaders[e] != "_id") {
                  newHeaders.push({
                    text: showHeaders[e],
                    value: showHeaders[e],
                  });
                }
              }
            }
            tableData = {
              reportValues: reportValues,
              totalReports: totalReports,
              showHeaders: newHeaders,
            };
          }
        }

        // console.log("ccc in planned", counterData.machineWiseData);

        counterData.machineWiseData.forEach(async (item, i) => {
          item.machineName = result2[item.machineName];
          if (i == counterData.machineWiseData.length - 1)
            console.log("item", counterData.machineWiseData);
        });

        let excelTable: any = {};
        excelTable["column"] = [];
        excelTable["row"] = [];
        let tempExcelTable: any = [];
        reportValues.forEach((element) => {
          let temp = {};
          temp["FROM DATE"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[0]
              ? element["FROM_TIME"].split(", ")[0]
              : "";
          temp["FROM TIME"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[1]
              ? element["FROM_TIME"].split(", ")[1]
              : "";
          temp["TO DATE"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[0]
              ? element["TO_TIME"].split(", ")[0]
              : "";
          temp["TO TIME"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[1]
              ? element["TO_TIME"].split(", ")[1]
              : "";
          temp["RECORDED DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["RECORDED TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          temp["MACHINE NAME"] = element["MACHINE_ID"]
            ? element["MACHINE_ID"]
            : "";
          temp["SHIFT"] = element["SHIFT"] ? element["SHIFT"] : "";
          temp["PLANNED DURATION"] = element["DURATION"]
            ? element["DURATION"]
            : "";
          temp["PLANNED REASON"] = element["REASON"] ? element["REASON"] : "";
          temp["OPERATOR"] = element["OPERATOR"] ? element["OPERATOR"] : "";
          temp["SUPERVISOR"] = element["SUPERVISOR"];
          temp["Reported By"] = element["Reported By"]
            ? element["SUPERVISOR"]
            : "";

          tempExcelTable.push(temp);
        });
        for (var e in tempExcelTable) {
          excelTable["column"] = [
            ...excelTable["column"],
            ...Object.keys(tempExcelTable[e]),
          ];
        }
        var temp = new Set(excelTable["column"]);
        excelTable["column"] = [...temp];
        for (var e in excelTable["column"]) {
          excelTable["column"][e] = { name: excelTable["column"][e] };
        }
        for (var m in tempExcelTable) {
          let temp1: any = [];
          for (var n in excelTable["column"]) {
            temp1.push(tempExcelTable[m][excelTable["column"][n]["name"]]);
          }
          excelTable["row"].push(temp1);
        }

        let pdfTable: any = {};
        // pdfTable["column"] = [];
        // pdfTable["row"] = [];
        // excelTable["column"].forEach((element) => {
        //   pdfTable["column"].push({ text: element.name, value: element.name });
        // });

        // excelTable["row"].forEach((row) => {
        //   let temp: any = {};
        //   for (var x in excelTable["column"]) {
        //     temp[excelTable["column"][x]["name"]] = row[x];
        //   }
        //   pdfTable["row"].push(temp);
        // });

        let counterText: any = {};
        let counterTempText: any = {};
        let counterExcelTable: any = {};
        let counterPdfTable: any = {};
        let counterTempTable: any = {};
        let keys = Object.keys(counterData);
        keys.forEach((e) => {
          if (typeof counterData[e] == "string") {
            counterTempText[e] = counterData[e];
          } else if (typeof counterData[e] == "number") {
            counterTempText[e] = counterData[e];
          } else if (counterData[e] instanceof Array && counterData[e].length) {
            counterTempTable[e] = [];
            counterData[e].forEach((g) => {
              let temp: any = [];
              let key3: any = Object.keys(g);
              key3.forEach((ele) => {
                if (typeof g[ele] == "string") {
                  temp[ele] = g[ele];
                }
                if (typeof g[ele] == "number") {
                  temp[ele] = g[ele];
                }
                if (g[ele] instanceof Array && g[ele].length) {
                  let key5 = Object.keys(g[ele][0]);
                  key5.forEach((er) => {
                    temp[er] = g[ele][0][er];
                  });
                }
              });
              counterTempTable[e].push(temp);
            });
          }
        });

        if (counterTempText) {
          if (counterTempText["totalDuration"]) {
            counterText["TOTAL DURATION (mins)"] =
              counterTempText["totalDuration"] &&
              parseFloat(counterTempText["totalDuration"])
                ? parseFloat(counterTempText["totalDuration"])
                : 0;
          }
          if (counterTempText["totalReasons"]) {
            counterText["TOTAL REASONS"] =
              counterTempText["totalReasons"] &&
              parseFloat(counterTempText["totalReasons"])
                ? parseFloat(counterTempText["totalReasons"])
                : 0;
          }
        }

        if (counterTempTable && counterTempTable["machineWiseData"]) {
          counterExcelTable["MACHINE WISE DATA"] = {};
          counterExcelTable["MACHINE WISE DATA"]["column"] = [];
          counterExcelTable["MACHINE WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["machineWiseData"].forEach((element) => {
            let temp = {};
            temp["MACHINE NAME"] = element["machineName"]
              ? element["machineName"]
              : "";
            temp["DOWNTIME DURATION (mins)"] =
              element["downtimeDuration"] &&
              parseFloat(element["downtimeDuration"])
                ? parseFloat(element["downtimeDuration"])
                : 0;
            temp["MOST OCCURED BREAKDOWN REASON"] = element["name"]
              ? element["name"]
              : "";
            temp["MOST OCCURED BREAKDOWN DURATION (mins)"] =
              element["duration"] && parseFloat(element["duration"])
                ? parseFloat(element["duration"])
                : 0;
            temp["MOST OCCURED BREAKDOWN COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            temp["Reported By"] = "";

            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MACHINE WISE DATA"]["column"] = [
              ...counterExcelTable["MACHINE WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MACHINE WISE DATA"]["column"]);
          counterExcelTable["MACHINE WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MACHINE WISE DATA"]["column"]) {
            counterExcelTable["MACHINE WISE DATA"]["column"][e] = {
              name: counterExcelTable["MACHINE WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MACHINE WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MACHINE WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MACHINE WISE DATA"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["overAllMostOccuredReason"]) {
          counterExcelTable["OVERALL MOST OCCURED REASON"] = {};
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [];
          counterExcelTable["OVERALL MOST OCCURED REASON"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["overAllMostOccuredReason"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["DURATION (mins)"] =
              element["duration"] && parseFloat(element["duration"])
                ? parseFloat(element["duration"])
                : 0;
            temp["COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
              ...counterExcelTable["OVERALL MOST OCCURED REASON"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"]
          );
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
            ...temp,
          ];
          for (var e in counterExcelTable["OVERALL MOST OCCURED REASON"][
            "column"
          ]) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][e] = {
              name: counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][
                e
              ],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["OVERALL MOST OCCURED REASON"][
              "column"
            ]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][n][
                    "name"
                  ]
                ]
              );
            }
            counterExcelTable["OVERALL MOST OCCURED REASON"]["row"].push(temp1);
          }
        }

        let dkey = Object.keys(counterExcelTable);
        dkey.forEach((rr) => {
          counterPdfTable[rr] = {};
          counterPdfTable[rr]["column"] = [];
          counterPdfTable[rr]["row"] = [];
          counterExcelTable[rr]["column"].forEach((element) => {
            counterPdfTable[rr]["column"].push({
              text: element.name,
              value: element.name,
            });
          });

          counterExcelTable[rr]["row"].forEach((row) => {
            let temp: any = {};
            for (var x in counterExcelTable[rr]["column"]) {
              temp[counterExcelTable[rr]["column"][x]["name"]] = row[x];
            }
            counterPdfTable[rr]["row"].push(temp);
          });
        });

        infoData["parameters"].forEach((e) => {
          if (
            (e["name"] == "MACHINE_ID" || e["name"] == "MACHINE_NAME") &&
            indicator["allMachines"] &&
            indicator["allMachines"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "SHIFT" &&
            indicator["allShifts"] &&
            indicator["allShifts"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "REASON" &&
            indicator["allReasons"] &&
            indicator["allReasons"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            (e["name"] == "MATERIAL" || e["name"] == "MATERIAL_DESCRIPTION") &&
            indicator["allMaterials"] &&
            indicator["allMaterials"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
        });
        console.log(infoData, "jjjjj");

        graphData.stackGraph.forEach((g) => {
          g.name = result2[g.name];
        });

        graphData.pieChart.forEach((g) => {
          g.name = result2[g.name];
        });
        let final = infoData.parameters[1].value;
        console.log("ffff", final);

        if (final[0] === "ALL SELECTED") {
          final[0] = final[0];
          console.log("in ifs");
        } else {
          final.forEach((e, i) => {
            final[i] = result2[e];
          });
          console.log("in else");
        }
        let finalData = {
          infoData: infoData,
          tableData: tableData,
          graphData: graphData,
          counterData: counterData,
          flowData: flowData,
          excelTable: excelTable,
          pdfTable: pdfTable,
          counterPdfTable: counterPdfTable,
          counterExcelTable: counterExcelTable,
          counterText: counterText,
        };

        if (type == reportType["OVERALL_PDF"]) {
          createPdf("planned", finalData, (err, data) => {
            if (err) {
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: "Something went wrong!",
              };
              next();
              return;
            }
            req.apiStatus = {
              isSuccess: true,
              data: data,
            };
            next();
          });
        } else if (type == reportType["OVERALL_EXCEL"]) {
          createExcel(
            "Planned-Analysis-Report",
            conditionArray[0],
            finalData,
            (err, data) => {
              if (err) {
                req.apiStatus = {
                  isSuccess: false,
                  error: ErrorCodes[1002],
                  data: "Something went wrong!",
                };
                next();
                return;
              }
              req.apiStatus = {
                isSuccess: true,
                data: data,
              };
              next();
            }
          );
        } else {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1002],
            data: "Report type invalid",
          };
          next();
          return;
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
  });
}

export async function rejection(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "REJECTION_ANALYSIS";
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;
  let type = req.params.type ? req.params.type : reportType["OVERALL_PDF"];

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: any = request["conditions"];
  let infoData: any =
    conditionArray && conditionArray[0] ? conditionArray[0] : {};
  let indicator: any = request["indicator"] ? request["indicator"] : {};

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

  result = await DynamicModels.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersRejection(collectionName, element));
    promises.push(countersRejectionMoldlWise(collectionName, element));
    promises.push(searchGraphForRejectionAnalysis(collectionName, element));
    // promises.push(
    //   search(
    //     collectionName,
    //     element,
    //     page,
    //     limit,
    //     sort,
    //     direction,
    //     searchString
    //   )
    // );
    Promise.all(promises)
      .then((response: any) => {
        logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
        let counterData: any = {};
        let graphData: any = {};
        let tableData: any = {};
        let flowData: any = {};
        let totalReports: any;
        let reportValues: any = [];
        let showHeaders: any = [];

        for (var r in response) {
          if (response[r]["countersData"]) {
            counterData = response[r]["countersData"];
          } else if (response[r]["machineCounters"]) {
            counterData["machineCounters"] = response[r]["machineCounters"];
          } else if (response[r]["mouldCounters"]) {
            counterData["mouldCounters"] = response[r]["mouldCounters"];
          } else if (response[r]["graphData"]) {
            graphData = response[r]["graphData"];
          } else if (response[r]["tableData"]) {
            reportValues = response[r]["tableData"];
            totalReports = response[r]["count"];
            let newHeaders: any = [];
            if (reportValues && reportValues[0]) {
              for (var e in reportValues) {
                showHeaders = [...showHeaders, ...Object.keys(reportValues[e])];
              }
              var temp = new Set(showHeaders);
              showHeaders = [...temp];
              for (var e in showHeaders) {
                if (showHeaders[e] != "_id") {
                  newHeaders.push({
                    text: showHeaders[e],
                    value: showHeaders[e],
                  });
                }
              }
            }
            tableData = {
              reportValues: reportValues,
              totalReports: totalReports,
              showHeaders: newHeaders,
            };
          }
        }

        // console.log("ccc in rejection", counterData.machineCounters.machineWiseData);

        counterData.machineCounters.machineWiseData.forEach(async (item, i) => {
         try {
          item.machineName = result2[item.machineName];
          if (i == counterData.machineWiseData.length - 1)
            console.log("item", counterData.machineWiseData);
         } catch (error) {
           console.log(error);          
         }           
        });
      

        let excelTable: any = {};
        excelTable["column"] = [];
        excelTable["row"] = [];
        let tempExcelTable: any = [];
        // console.log(reportValues);

        reportValues.forEach((element) => {
          let temp = {};
          temp["FROM DATE"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[0]
              ? element["FROM_TIME"].split(", ")[0]
              : "";
          temp["FROM TIME"] =
            element["FROM_TIME"] &&
            element["FROM_TIME"].split(", ") &&
            element["FROM_TIME"].split(", ")[1]
              ? element["FROM_TIME"].split(", ")[1]
              : "";
          temp["TO DATE"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[0]
              ? element["TO_TIME"].split(", ")[0]
              : "";
          temp["TO TIME"] =
            element["TO_TIME"] &&
            element["TO_TIME"].split(", ") &&
            element["TO_TIME"].split(", ")[1]
              ? element["TO_TIME"].split(", ")[1]
              : "";
          temp["RECORDED DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["RECORDED TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          temp["MACHINE NAME"] = element["MACHINE_ID"]
            ? element["MACHINE_ID"]
            : "";
          temp["TOTAL"] =
            element["TOTAL"] && parseFloat(element["TOTAL"])
              ? parseFloat(element["TOTAL"])
              : 0;
          temp["MOULD"] = element["MOULD"] ? element["MOULD"] : "";
          temp["SHIFT"] = element["SHIFT"] ? element["SHIFT"] : "";
          temp["OPERATOR"] = element["OPERATOR"] ? element["OPERATOR"] : "";
          temp["SUPERVISOR"] = element["SUPERVISOR"];
          temp["Reported By"] = element["Reported By"]
            ? element["SUPERVISOR"]
            : "";
          tempExcelTable.push(temp);
        });
        for (var e in tempExcelTable) {
          excelTable["column"] = [
            ...excelTable["column"],
            ...Object.keys(tempExcelTable[e]),
          ];
        }
        var temp = new Set(excelTable["column"]);
        excelTable["column"] = [...temp];
        for (var e in excelTable["column"]) {
          excelTable["column"][e] = { name: excelTable["column"][e] };
        }
        for (var m in tempExcelTable) {
          let temp1: any = [];
          for (var n in excelTable["column"]) {
            temp1.push(tempExcelTable[m][excelTable["column"][n]["name"]]);
          }
          excelTable["row"].push(temp1);
        }

        let pdfTable: any = {};
        // pdfTable["column"] = [];
        // pdfTable["row"] = [];
        // excelTable["column"].forEach((element) => {
        //   pdfTable["column"].push({ text: element.name, value: element.name });
        // });

        // excelTable["row"].forEach((row) => {
        //   let temp: any = {};
        //   for (var x in excelTable["column"]) {
        //     temp[excelTable["column"][x]["name"]] = row[x];
        //   }
        //   pdfTable["row"].push(temp);
        // });

        let newCounterData: any = {
          overAllmostOccuredRejection:
            counterData["machineCounters"]["overAllmostOccuredRejection"],
          totalRejctions: counterData["machineCounters"]["totalRejctions"],
          machineWiseData: counterData["machineCounters"]["machineWiseData"],
          mouldWiseData: counterData["mouldCounters"]["mouldWiseData"],
        };

        let counterText: any = {};
        let counterTempText: any = {};
        let counterExcelTable: any = {};
        let counterPdfTable: any = {};
        let counterTempTable: any = {};
        let keys = Object.keys(newCounterData);
        keys.forEach((e) => {
          if (typeof newCounterData[e] == "string") {
            counterTempText[e] = newCounterData[e];
          } else if (typeof newCounterData[e] == "number") {
            counterTempText[e] = newCounterData[e];
          } else if (
            newCounterData[e] instanceof Array &&
            newCounterData[e].length
          ) {
            counterTempTable[e] = [];
            newCounterData[e].forEach((g) => {
              let temp: any = [];
              let key3: any = Object.keys(g);
              key3.forEach((ele) => {
                if (typeof g[ele] == "string") {
                  temp[ele] = g[ele];
                }
                if (typeof g[ele] == "number") {
                  temp[ele] = g[ele];
                }
                if (g[ele] instanceof Array && g[ele].length) {
                  let key5 = Object.keys(g[ele][0]);
                  key5.forEach((er) => {
                    temp[er] = g[ele][0][er];
                  });
                }
              });
              counterTempTable[e].push(temp);
            });
          }
        });

        if (counterTempText) {
          if (counterTempText["totalRejctions"]) {
            counterText["TOTAL REJECTIONS"] =
              counterTempText["totalRejctions"] &&
              parseFloat(counterTempText["totalRejctions"])
                ? parseFloat(counterTempText["totalRejctions"])
                : 0;
          }
        }

        if (counterTempTable && counterTempTable["machineWiseData"]) {
          counterExcelTable["MACHINE WISE DATA"] = {};
          counterExcelTable["MACHINE WISE DATA"]["column"] = [];
          counterExcelTable["MACHINE WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["machineWiseData"].forEach((element) => {
            let temp = {};
            temp["MACHINE NAME"] = element["machineName"]
              ? element["machineName"]
              : "";
            temp["REJECTION COUNT"] =
              element["rejectionCount"] && parseFloat(element["rejectionCount"])
                ? parseFloat(element["rejectionCount"])
                : 0;
            temp["MOST OCCURED REJECTION NAME"] = element["name"]
              ? element["name"]
              : "";
            temp["MOST OCCURED REJECTION QUANTITY"] =
              element["qty"] && parseFloat(element["qty"])
                ? parseFloat(element["qty"])
                : 0;
            temp["MOST OCCURED REJECTION COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            temp["Reported By"] = "";

            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MACHINE WISE DATA"]["column"] = [
              ...counterExcelTable["MACHINE WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MACHINE WISE DATA"]["column"]);
          counterExcelTable["MACHINE WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MACHINE WISE DATA"]["column"]) {
            counterExcelTable["MACHINE WISE DATA"]["column"][e] = {
              name: counterExcelTable["MACHINE WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MACHINE WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MACHINE WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MACHINE WISE DATA"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["mouldWiseData"]) {
          counterExcelTable["MOLD WISE DATA"] = {};
          counterExcelTable["MOLD WISE DATA"]["column"] = [];
          counterExcelTable["MOLD WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["mouldWiseData"].forEach((element) => {
            let temp = {};
            temp["MOULD NAME"] = element["mouldName"]
              ? element["mouldName"]
              : "";
            temp["REJECTION COUNT"] =
              element["rejectionCount"] && parseFloat(element["rejectionCount"])
                ? parseFloat(element["rejectionCount"])
                : 0;
            temp["MOST OCCURED REJECTION NAME"] = element["name"]
              ? element["name"]
              : "";
            temp["MOST OCCURED REJECTION QUANTITY"] =
              element["qty"] && parseFloat(element["qty"])
                ? parseFloat(element["qty"])
                : 0;
            temp["MOST OCCURED REJECTION COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            temp["Reported By"] = "";

            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MOLD WISE DATA"]["column"] = [
              ...counterExcelTable["MOLD WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MOLD WISE DATA"]["column"]);
          counterExcelTable["MOLD WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MOLD WISE DATA"]["column"]) {
            counterExcelTable["MOLD WISE DATA"]["column"][e] = {
              name: counterExcelTable["MOLD WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MOLD WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MOLD WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MOLD WISE DATA"]["row"].push(temp1);
          }
        }

        if (
          counterTempTable &&
          counterTempTable["overAllmostOccuredRejection"]
        ) {
          counterExcelTable["OVERALL MOST OCCURED REJECTION"] = {};
          counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"] = [];
          counterExcelTable["OVERALL MOST OCCURED REJECTION"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["overAllmostOccuredRejection"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"] = [
              ...counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(
            counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"]
          );
          counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"] = [
            ...temp,
          ];
          for (var e in counterExcelTable["OVERALL MOST OCCURED REJECTION"][
            "column"
          ]) {
            counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"][e] = {
              name: counterExcelTable["OVERALL MOST OCCURED REJECTION"][
                "column"
              ][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["OVERALL MOST OCCURED REJECTION"][
              "column"
            ]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["OVERALL MOST OCCURED REJECTION"]["column"][
                    n
                  ]["name"]
                ]
              );
            }
            counterExcelTable["OVERALL MOST OCCURED REJECTION"]["row"].push(
              temp1
            );
          }
        }

        let dkey = Object.keys(counterExcelTable);
        dkey.forEach((rr) => {
          counterPdfTable[rr] = {};
          counterPdfTable[rr]["column"] = [];
          counterPdfTable[rr]["row"] = [];
          counterExcelTable[rr]["column"].forEach((element) => {
            counterPdfTable[rr]["column"].push({
              text: element.name,
              value: element.name,
            });
          });

          counterExcelTable[rr]["row"].forEach((row) => {
            let temp: any = {};
            for (var x in counterExcelTable[rr]["column"]) {
              temp[counterExcelTable[rr]["column"][x]["name"]] = row[x];
            }
            counterPdfTable[rr]["row"].push(temp);
          });
        });

        infoData["parameters"].forEach((e) => {
          if (
            (e["name"] == "MACHINE_ID" || e["name"] == "MACHINE_NAME") &&
            indicator["allMachines"] &&
            indicator["allMachines"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "SHIFT" &&
            indicator["allShifts"] &&
            indicator["allShifts"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "REASON" &&
            indicator["allReasons"] &&
            indicator["allReasons"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            (e["name"] == "MATERIAL" ||
              e["name"] == "MATERIAL_DESCRIPTION" ||
              e["name"] == "MOULD") &&
            indicator["allMaterials"] &&
            indicator["allMaterials"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
        });

        console.log(infoData, "jjjjj");

        graphData.stackGraph.forEach((g) => {
          g.name = result2[g.name];
        });

        graphData.pieChart.forEach((g) => {
          g.name = result2[g.name];
        });
        let final = infoData.parameters[1].value;
        // console.log("ffff", final);

        if (final[0] === "ALL SELECTED") {
          final[0] = final[0];
          console.log("in ifs");
        } else {
          final.forEach((e, i) => {
            final[i] = result2[e];
          });
          console.log("in else");
        }
        let finalData = {
          infoData: infoData,
          tableData: tableData,
          graphData: graphData,
          counterData: counterData,
          flowData: flowData,
          excelTable: excelTable,
          pdfTable: pdfTable,
          counterPdfTable: counterPdfTable,
          counterExcelTable: counterExcelTable,
          counterText: counterText,
        };

        if (type == reportType["OVERALL_PDF"]) {
          createPdf("rejection", finalData, (err, data) => {
            if (err) {
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: "Something went wrong!",
              };
              next();
              return;
            }
            req.apiStatus = {
              isSuccess: true,
              data: data,
            };
            next();
          });
        } else if (type == reportType["OVERALL_EXCEL"]) {
          // let excelData = {};
          // if (
          //   finalData.counterData["machineCounters"] &&
          //   finalData.counterData["machineCounters"]["totalRejctions"]
          // )
          //   excelData["totalRejctions"] =
          //     finalData.counterData["machineCounters"]["totalRejctions"];
          // if (
          //   finalData.counterData["machineCounters"] &&
          //   finalData.counterData["machineCounters"]["machineWiseData"]
          // )
          //   excelData["machineWiseData"] =
          //     finalData.counterData["machineCounters"]["machineWiseData"];
          // if (
          //   finalData.counterData["machineCounters"] &&
          //   finalData.counterData["machineCounters"][
          //     "overAllmostOccuredRejection"
          //   ]
          // )
          //   excelData["overAllmostOccuredRejection"] =
          //     finalData.counterData["machineCounters"][
          //       "overAllmostOccuredRejection"
          //     ];
          // if (
          //   finalData.counterData["mouldCounters"] &&
          //   finalData.counterData["mouldCounters"]["mouldWiseData"]
          // )
          //   excelData["mouldWiseData"] =
          //     finalData.counterData["mouldCounters"]["mouldWiseData"];
          // if (finalData["excelTable"])
          //   excelData["excelTable"] = finalData["excelTable"];

          createExcel(
            "Rejection-Analysis-Report",
            conditionArray[0],
            finalData,
            (err, data) => {
              console.log(data);

              if (err) {
                req.apiStatus = {
                  isSuccess: false,
                  error: ErrorCodes[1002],
                  data: "Something went wrong!",
                };
                next();
                return;
              }
              req.apiStatus = {
                isSuccess: true,
                data: data,
              };
              next();
            }
          );
        } else {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1002],
            data: "Report type invalid",
          };
          next();
          return;
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
  });
}

export async function oee(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "OEE_MOLD_OUT";
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;
  let type = req.params.type ? req.params.type : reportType["OVERALL_PDF"];

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];
  let infoData: any =
    conditionArray && conditionArray[0] ? conditionArray[0] : {};
  let indicator: any = request["indicator"] ? request["indicator"] : {};

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

  result = await DynamicModels.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }

  let count: number = await getDocumentCount(
    collectionName,
    {},
    (err, response) => {
      if (err) {
        return 0;
      } else {
        return response;
      }
    }
  );

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersOEE(collectionName, element));
    promises.push(searchDataForGraph(collectionName, element));
    // promises.push(
    //   search(
    //     collectionName,
    //     element,
    //     page,
    //     limit,
    //     sort,
    //     direction,
    //     searchString
    //   )
    // );
    Promise.all(promises)
      .then((response: any) => {
        logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
        let counterData: any = {};
        let graphData: any = {};
        let tableData: any = {};
        let flowData: any = {};
        let totalReports: any;
        let reportValues: any = [];
        let showHeaders: any = [];

        for (var r in response) {
          if (response[r]["countersData"]) {
            counterData = response[r]["countersData"];
          } else if (response[r]["graphData"]) {
            graphData = response[r]["graphData"];
          } else if (response[r]["tableData"]) {
            reportValues = response[r]["tableData"];
            totalReports = response[r]["count"];
            let newHeaders: any = [];
            if (reportValues && reportValues[0]) {
              for (var e in reportValues) {
                showHeaders = [...showHeaders, ...Object.keys(reportValues[e])];
              }
              var temp = new Set(showHeaders);
              showHeaders = [...temp];
              for (var e in showHeaders) {
                if (showHeaders[e] != "_id") {
                  newHeaders.push({
                    text: showHeaders[e],
                    value: showHeaders[e],
                  });
                }
              }
            }
            tableData = {
              reportValues: reportValues,
              totalReports: totalReports,
              showHeaders: newHeaders,
            };
          }
        }
        // console.log("ccc in planned", counterData);

        counterData.machineWiseData.forEach(async (item, i) => {
          item.name = result2[item.name];
          if (i == counterData.machineWiseData.length - 1)
            console.log("item", counterData.machineWiseData);
        });

        let excelTable: any = {};
        excelTable["column"] = [];
        excelTable["row"] = [];
        let tempExcelTable: any = [];
        // console.log(reportValues);

        reportValues.forEach((element) => {
          let temp = {};
          // console.log(element, "ggggggg");
          temp["DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          temp["MACHINE NAME"] = element["MACHINE_NAME"]
            ? element["MACHINE_NAME"]
            : "";

          temp["RAW SHOT COUNT"] =
            element["RAW_SHOT_COUNT"] && parseFloat(element["RAW_SHOT_COUNT"])
              ? parseFloat(element["RAW_SHOT_COUNT"])
              : 0;
          temp["RAW PRODUCTION COUNT"] =
            element["RAW_PRODUCTION_COUNT"] &&
            parseFloat(element["RAW_PRODUCTION_COUNT"])
              ? parseFloat(element["RAW_PRODUCTION_COUNT"])
              : 0;
          temp["RAW CAVITY"] =
            element["RAW_CAVITY"] && parseFloat(element["RAW_CAVITY"])
              ? parseFloat(element["RAW_CAVITY"])
              : 0;
          temp["OEE"] =
            element["OEE"] && parseFloat(element["OEE"])
              ? parseFloat(element["OEE"])
              : 0;
          temp["PERFORMANCE"] =
            element["PERFORMANCE"] && parseFloat(element["PERFORMANCE"])
              ? parseFloat(element["PERFORMANCE"])
              : 0;
          temp["QUALITY"] =
            element["QUALITY"] && parseFloat(element["QUALITY"])
              ? parseFloat(element["QUALITY"])
              : 0;
          temp["SHIFT"] = element["SHIFT"] ? element["SHIFT"] : "";
          temp["OPERATOR"] = element["OPERATOR"] ? element["OPERATOR"] : "";
          temp["SUPERVISOR"] = element["SUPERVISOR"]
            ? element["SUPERVISOR"]
            : "";

          tempExcelTable.push(temp);
        });
        for (var e in tempExcelTable) {
          excelTable["column"] = [
            ...excelTable["column"],
            ...Object.keys(tempExcelTable[e]),
          ];
        }
        var temp = new Set(excelTable["column"]);
        excelTable["column"] = [...temp];
        for (var e in excelTable["column"]) {
          excelTable["column"][e] = { name: excelTable["column"][e] };
        }
        for (var m in tempExcelTable) {
          let temp1: any = [];
          for (var n in excelTable["column"]) {
            temp1.push(tempExcelTable[m][excelTable["column"][n]["name"]]);
          }
          excelTable["row"].push(temp1);
        }

        let pdfTable: any = {};
        // pdfTable["column"] = [];
        // pdfTable["row"] = [];
        // excelTable["column"].forEach((element) => {
        //   pdfTable["column"].push({ text: element.name, value: element.name });
        // });

        // excelTable["row"].forEach((row) => {
        //   let temp: any = {};
        //   for (var x in excelTable["column"]) {
        //     temp[excelTable["column"][x]["name"]] = row[x];
        //   }
        //   pdfTable["row"].push(temp);
        // });

        let counterText: any = {};
        let counterTempText: any = {};
        let counterExcelTable: any = {};
        let counterPdfTable: any = {};
        let counterTempTable: any = {};
        let keys = Object.keys(counterData);
        keys.forEach((e) => {
          if (typeof counterData[e] == "string") {
            counterTempText[e] = counterData[e];
          } else if (typeof counterData[e] == "number") {
            counterTempText[e] = counterData[e];
          } else if (counterData[e] instanceof Array && counterData[e].length) {
            counterTempTable[e] = [];
            counterData[e].forEach((g) => {
              let temp: any = [];
              let key3: any = Object.keys(g);
              key3.forEach((ele) => {
                if (typeof g[ele] == "string") {
                  temp[ele] = g[ele];
                }
                if (typeof g[ele] == "number") {
                  temp[ele] = g[ele];
                }
                if (g[ele] instanceof Array && g[ele].length) {
                  let key5 = Object.keys(g[ele][0]);
                  key5.forEach((er) => {
                    if (temp[er]) {
                      temp[er + "1"] = g[ele][0][er];
                    } else {
                      temp[er] = g[ele][0][er];
                    }
                  });
                }
              });
              counterTempTable[e].push(temp);
            });
          }
        });

        if (counterTempText) {
          if (counterTempText["totalProdCount"]) {
            counterText["TOTAL PRODUCTION COUNT"] =
              counterTempText["totalProdCount"] &&
              parseFloat(counterTempText["totalProdCount"])
                ? parseFloat(counterTempText["totalProdCount"])
                : 0;
          }
          if (counterTempText["totalShotCount"]) {
            counterText["TOTAL SHOT COUNT"] =
              counterTempText["totalShotCount"] &&
              parseFloat(counterTempText["totalShotCount"])
                ? parseFloat(counterTempText["totalShotCount"])
                : 0;
          }
        }

        if (counterTempTable && counterTempTable["machineWiseData"]) {
          counterExcelTable["MACHINE WISE DATA"] = {};
          counterExcelTable["MACHINE WISE DATA"]["column"] = [];
          counterExcelTable["MACHINE WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["machineWiseData"].forEach((element) => {
            let temp = {};
            temp["MACHINE NAME"] = element["name"] ? element["name"] : "";
            temp["MACHINE P COUNT"] =
              element["machinePCount"] && parseFloat(element["machinePCount"])
                ? parseFloat(element["machinePCount"])
                : 0;
            temp["MACHINE S COUNT"] =
              element["machineSCount"] && parseFloat(element["machineSCount"])
                ? parseFloat(element["machineSCount"])
                : 0;
            temp["MOULD NAME"] = element["name1"] ? element["name1"] : "";
            temp["MOLD P COUNT"] =
              element["pCount"] && parseFloat(element["pCount"])
                ? parseFloat(element["pCount"])
                : 0;
            temp["MOLD S COUNT"] =
              element["sCount"] && parseFloat(element["sCount"])
                ? parseFloat(element["sCount"])
                : 0;
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MACHINE WISE DATA"]["column"] = [
              ...counterExcelTable["MACHINE WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MACHINE WISE DATA"]["column"]);
          counterExcelTable["MACHINE WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MACHINE WISE DATA"]["column"]) {
            counterExcelTable["MACHINE WISE DATA"]["column"][e] = {
              name: counterExcelTable["MACHINE WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MACHINE WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MACHINE WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MACHINE WISE DATA"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["overAllMostOccuredReason"]) {
          counterExcelTable["OVERALL MOST OCCURED REASON"] = {};
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [];
          counterExcelTable["OVERALL MOST OCCURED REASON"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["overAllMostOccuredReason"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["DURATION"] =
              element["duration"] && parseFloat(element["duration"])
                ? parseFloat(element["duration"])
                : 0;
            temp["COUNT"] =
              element["count"] && parseFloat(element["count"])
                ? parseFloat(element["count"])
                : 0;
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
              ...counterExcelTable["OVERALL MOST OCCURED REASON"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"]
          );
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
            ...temp,
          ];
          for (var e in counterExcelTable["OVERALL MOST OCCURED REASON"][
            "column"
          ]) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][e] = {
              name: counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][
                e
              ],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["OVERALL MOST OCCURED REASON"][
              "column"
            ]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][n][
                    "name"
                  ]
                ]
              );
            }
            counterExcelTable["OVERALL MOST OCCURED REASON"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["moldWiseData"]) {
          counterExcelTable["MOLD WISE DATA"] = {};
          counterExcelTable["MOLD WISE DATA"]["column"] = [];
          counterExcelTable["MOLD WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["moldWiseData"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["MOLD P COUNT"] = element["moldPCount"]
              ? element["moldPCount"]
              : "";
            temp["MOLD S COUNT"] = element["moldSCount"]
              ? element["moldSCount"]
              : "";
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MOLD WISE DATA"]["column"] = [
              ...counterExcelTable["MOLD WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MOLD WISE DATA"]["column"]);
          counterExcelTable["MOLD WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MOLD WISE DATA"]["column"]) {
            counterExcelTable["MOLD WISE DATA"]["column"][e] = {
              name: counterExcelTable["MOLD WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MOLD WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MOLD WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MOLD WISE DATA"]["row"].push(temp1);
          }
        }

        let dkey = Object.keys(counterExcelTable);
        dkey.forEach((rr) => {
          counterPdfTable[rr] = {};
          counterPdfTable[rr]["column"] = [];
          counterPdfTable[rr]["row"] = [];
          counterExcelTable[rr]["column"].forEach((element) => {
            counterPdfTable[rr]["column"].push({
              text: element.name,
              value: element.name,
            });
          });

          counterExcelTable[rr]["row"].forEach((row) => {
            let temp: any = {};
            for (var x in counterExcelTable[rr]["column"]) {
              temp[counterExcelTable[rr]["column"][x]["name"]] = row[x];
            }
            counterPdfTable[rr]["row"].push(temp);
          });
        });

        infoData["parameters"].forEach((e) => {
          if (
            (e["name"] == "MACHINE_ID" || e["name"] == "MACHINE_NAME") &&
            indicator["allMachines"] &&
            indicator["allMachines"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "SHIFT" &&
            indicator["allShifts"] &&
            indicator["allShifts"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "REASON" &&
            indicator["allReasons"] &&
            indicator["allReasons"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "MOULD" ||
            (e["name"] == "MATERIAL_DESCRIPTION" &&
              indicator["allMaterials"] &&
              indicator["allMaterials"] == true)
          ) {
            e["value"] = ["ALL SELECTED"];
          }
        });

        // console.log("conditionArray", conditionArray[0]["parameters"]);

        let final = infoData.parameters[1].value;
        console.log("ffff", final);

        if (final[0] === "ALL SELECTED") {
          final[0] = final[0];
          console.log("in ifs");
        } else {
          final.forEach((e, i) => {
            final[i] = result2[e];
          });
          console.log("in else");
        }
        let finalData = {
          infoData: infoData,
          tableData: tableData,
          graphData: graphData,
          counterData: counterData,
          flowData: flowData,
          excelTable: excelTable,
          pdfTable: pdfTable,
          counterPdfTable: counterPdfTable,
          counterExcelTable: counterExcelTable,
          counterText: counterText,
        };

        if (type == reportType["OVERALL_PDF"]) {
          createPdf("oee", finalData, (err, data) => {
            if (err) {
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: "Something went wrong!",
              };
              next();
              return;
            }
            req.apiStatus = {
              isSuccess: true,
              data: data,
            };
            next();
          });
        } else if (type == reportType["OVERALL_EXCEL"]) {
          createExcel(
            "OEE-Report",
            conditionArray[0],
            finalData,
            (err, data) => {
              console.log(data);

              if (err) {
                req.apiStatus = {
                  isSuccess: false,
                  error: ErrorCodes[1002],
                  data: "Something went wrong!",
                };
                next();
                return;
              }
              req.apiStatus = {
                isSuccess: true,
                data: data,
              };
              next();
            }
          );
        } else {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1002],
            data: "Report type invalid",
          };
          next();
          return;
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
  });
}

export async function energy(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "ENERGY";
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;
  let type = req.params.type ? req.params.type : reportType["OVERALL_PDF"];

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];
  let infoData: any =
    conditionArray && conditionArray[0] ? conditionArray[0] : {};
  let indicator: any = request["indicator"] ? request["indicator"] : {};

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

  result = await DynamicModels.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }

  let count: number = await getDocumentCount(
    collectionName,
    {},
    (err, response) => {
      if (err) {
        return 0;
      } else {
        return response;
      }
    }
  );

  // var materialList: any = [];

  // distinct(
  //   "OEE_MOLD_OUT",
  //   "MATERIAL_DESCRIPTION",
  //   (err: any, responseList: any) => {
  //     if (err) {
  //       req.apiStatus = {
  //         isSuccess: false,
  //         error: ErrorCodes[1003],
  //         data: err,
  //       };
  //       logger.error(
  //         logger.LogModule.ROUTE,
  //         req.txId,
  //         "Failed to query: queryOeeOutMaterialDesc"
  //       );
  //       next();
  //       return;
  //     }

  //     if (responseList && responseList.length) {
  //       try {
  //         // filter for "", undefined, null
  //         // const uniqueArray:any = responseList.filter(item=> item)

  //         // responseList = [1,2, "", " ", undefined, null,"null","NaN", "success"]

  //         responseList.forEach((item: any) => {
  //           if (
  //             item != null &&
  //             item != "null" &&
  //             item != undefined &&
  //             item != "NaN" &&
  //             item != "" &&
  //             item != " "
  //           ) {
  //             materialList.push(item);
  //           }
  //         });
  //       } catch {
  //         logger.error(
  //           logger.LogModule.ROUTE,
  //           req.txId,
  //           "Failed to filter oee material list"
  //         );
  //         req.apiStatus = {
  //           isSuccess: true,
  //           data: [],
  //         };

  //         next();
  //       }
  //     } else {
  //       logger.error(
  //         logger.LogModule.ROUTE,
  //         req.txId,
  //         "Oee material list not found"
  //       );
  //       req.apiStatus = {
  //         isSuccess: true,
  //         data: [],
  //       };

  //       next();
  //     }
  //   }
  // );

  // if(conditionArray && conditionArray[0] && conditionArray[0]["parameters"]){
  //   conditionArray[0]["parameters"] = [...conditionArray[0]["parameters"] ,{name: "MATERIAL_DESCRIPTION", value: materialList}]
  // }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(countersEnergy(collectionName, element));
    promises.push(searchDataForGraph(collectionName, element));
    // promises.push(
    //   search(
    //     collectionName,
    //     element,
    //     page,
    //     limit,
    //     sort,
    //     direction,
    //     searchString
    //   )
    // );
    Promise.all(promises)
      .then((response: any) => {
        logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
        let counterData: any = {};
        let graphData: any = {};
        let tableData: any = {};
        let flowData: any = {};
        let totalReports: any;
        let reportValues: any = [];
        let showHeaders: any = [];

        for (var r in response) {
          if (response[r]["countersData"]) {
            counterData = response[r]["countersData"];
          } else if (response[r]["graphData"]) {
            graphData = response[r]["graphData"];
          } else if (response[r]["tableData"]) {
            reportValues = response[r]["tableData"];
            totalReports = response[r]["count"];
            let newHeaders: any = [];
            if (reportValues && reportValues[0]) {
              for (var e in reportValues) {
                showHeaders = [...showHeaders, ...Object.keys(reportValues[e])];
              }
              var temp = new Set(showHeaders);
              showHeaders = [...temp];
              for (var e in showHeaders) {
                if (showHeaders[e] != "_id") {
                  newHeaders.push({
                    text: showHeaders[e],
                    value: showHeaders[e],
                  });
                }
              }
            }
            tableData = {
              reportValues: reportValues,
              totalReports: totalReports,
              showHeaders: newHeaders,
            };
          }
        }

        counterData.machineWiseData?.forEach(async (item, i) => {
          item.machineName = result2[item.machineName];
          if (i == counterData.machineWiseData.length - 1)
            console.log("item", counterData.machineWiseData);
        });

        let excelTable: any = {};
        excelTable["column"] = [];
        excelTable["row"] = [];
        let tempExcelTable: any = [];
        // console.log(reportValues);

        reportValues.forEach((element) => {
          let temp = {};
          temp["MACHINE NAME"] = element["MACHINE_NAME"]
            ? element["MACHINE_NAME"]
            : "";
          temp["WATTS TOTAL"] =
            element["WATTS_TOTAL"] && parseFloat(element["WATTS_TOTAL"])
              ? parseFloat(element["WATTS_TOTAL"])
              : 0;
          temp["ENERGY"] =
            element["WH"] && parseFloat(element["WH"])
              ? parseFloat(element["WH"])
              : 0;
          temp["FREQUENCY"] =
            element["FREQUENCY"] && parseFloat(element["FREQUENCY"])
              ? parseFloat(element["FREQUENCY"])
              : 0;
          temp["CURRENT TOTAL"] =
            element["CURRENT_TOTAL"] && parseFloat(element["CURRENT_TOTAL"])
              ? parseFloat(element["CURRENT_TOTAL"])
              : 0;
          temp["SHIFT"] = element["SHIFT"] ? element["SHIFT"] : "";
          temp["RECORDED DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["RECORDED TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          temp["OPERATOR"] = element["OPERATOR"] ? element["OPERATOR"] : "";
          temp["SUPERVISOR"] = element["SUPERVISOR"]
            ? element["SUPERVISOR"]
            : "";
          tempExcelTable.push(temp);
        });
        for (var e in tempExcelTable) {
          excelTable["column"] = [
            ...excelTable["column"],
            ...Object.keys(tempExcelTable[e]),
          ];
        }
        var temp = new Set(excelTable["column"]);
        excelTable["column"] = [...temp];
        for (var e in excelTable["column"]) {
          excelTable["column"][e] = { name: excelTable["column"][e] };
        }
        for (var m in tempExcelTable) {
          let temp1: any = [];
          for (var n in excelTable["column"]) {
            temp1.push(tempExcelTable[m][excelTable["column"][n]["name"]]);
          }
          excelTable["row"].push(temp1);
        }

        let pdfTable: any = {};
        // pdfTable["column"] = [];
        // pdfTable["row"] = [];
        // excelTable["column"].forEach((element) => {
        //   pdfTable["column"].push({
        //     text: element.name,
        //     value: element.name,
        //   });
        // });

        // excelTable["row"].forEach((row) => {
        //   let temp: any = {};
        //   for (var x in excelTable["column"]) {
        //     temp[excelTable["column"][x]["name"]] = row[x];
        //   }
        //   pdfTable["row"].push(temp);
        // });

        // console.log(counterData);

        let counterText: any = {};
        let counterTempText: any = {};
        let counterExcelTable: any = {};
        let counterPdfTable: any = {};
        let counterTempTable: any = {};
        let keys = Object.keys(counterData);
        keys.forEach((e) => {
          if (typeof counterData[e] == "string") {
            counterTempText[e] = counterData[e];
          } else if (typeof counterData[e] == "number") {
            counterTempText[e] = counterData[e];
          } else if (counterData[e] instanceof Array && counterData[e].length) {
            counterTempTable[e] = [];
            counterData[e].forEach((g) => {
              let temp: any = [];
              let key3: any = Object.keys(g);
              key3.forEach((ele) => {
                if (typeof g[ele] == "string") {
                  temp[ele] = g[ele];
                }
                if (typeof g[ele] == "number") {
                  temp[ele] = g[ele];
                }
                if (g[ele] instanceof Array && g[ele].length) {
                  let key5 = Object.keys(g[ele][0]);
                  key5.forEach((er) => {
                    if (temp[er]) {
                      temp[er + "1"] = g[ele][0][er];
                    } else {
                      temp[er] = g[ele][0][er];
                    }
                  });
                }
              });
              counterTempTable[e].push(temp);
            });
          }
        });

        if (counterTempText) {
          if (counterTempText["totalEnergy"]) {
            counterText["TOTAL ENERGY (KWH)"] =
              counterTempText["totalEnergy"] && counterTempText["totalEnergy"]
                ? parseFloat(counterTempText["totalEnergy"])
                : 0;
          }
          if (counterTempText["totalavgPower"]) {
            counterText["TOTAL AVG POWER (KW)"] =
              counterTempText["totalavgPower"] &&
              parseFloat(counterTempText["totalavgPower"])
                ? parseFloat(counterTempText["totalavgPower"])
                : 0;
          }
          // if (counterTempText["totalavgPower"]) {
          //   counterText["ENERGY PER PART (KWH)"] =
          //     counterTempText["energyPerPart"] &&
          //     parseFloat(counterTempText["energyPerPart"])
          //       ? parseFloat(counterTempText["energyPerPart"])
          //       : 0;
          // }
        }

        if (counterTempTable && counterTempTable["machineWiseData"]) {
          counterExcelTable["MACHINE WISE DATA"] = {};
          counterExcelTable["MACHINE WISE DATA"]["column"] = [];
          counterExcelTable["MACHINE WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["machineWiseData"].forEach((element) => {
            let temp = {};
            temp["MACHINE NAME"] = element["machineName"]
              ? element["machineName"]
              : "";
            temp["ENERGY (KWH)"] =
              element["energy"] && parseFloat(element["energy"])
                ? parseFloat(element["energy"])
                : 0;
            temp["AVERAGE POWER (KW)"] =
              element["avgpower"] && parseFloat(element["avgpower"])
                ? parseFloat(element["avgpower"])
                : 0;
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MACHINE WISE DATA"]["column"] = [
              ...counterExcelTable["MACHINE WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MACHINE WISE DATA"]["column"]);
          counterExcelTable["MACHINE WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MACHINE WISE DATA"]["column"]) {
            counterExcelTable["MACHINE WISE DATA"]["column"][e] = {
              name: counterExcelTable["MACHINE WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MACHINE WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MACHINE WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MACHINE WISE DATA"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["overAllMostOccuredReason"]) {
          counterExcelTable["OVERALL MOST OCCURED REASON"] = {};
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [];
          counterExcelTable["OVERALL MOST OCCURED REASON"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["overAllMostOccuredReason"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["DURATION"] = element["duration"] ? element["duration"] : "";
            temp["COUNT"] = element["count"] ? element["count"] : "";
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
              ...counterExcelTable["OVERALL MOST OCCURED REASON"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"]
          );
          counterExcelTable["OVERALL MOST OCCURED REASON"]["column"] = [
            ...temp,
          ];
          for (var e in counterExcelTable["OVERALL MOST OCCURED REASON"][
            "column"
          ]) {
            counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][e] = {
              name: counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][
                e
              ],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["OVERALL MOST OCCURED REASON"][
              "column"
            ]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["OVERALL MOST OCCURED REASON"]["column"][n][
                    "name"
                  ]
                ]
              );
            }
            counterExcelTable["OVERALL MOST OCCURED REASON"]["row"].push(temp1);
          }
        }

        if (counterTempTable && counterTempTable["moldWiseData"]) {
          counterExcelTable["MOLD WISE DATA"] = {};
          counterExcelTable["MOLD WISE DATA"]["column"] = [];
          counterExcelTable["MOLD WISE DATA"]["row"] = [];
          let tempExcelTable: any = [];
          counterTempTable["moldWiseData"].forEach((element) => {
            let temp = {};
            temp["NAME"] = element["name"] ? element["name"] : "";
            temp["MOLD P COUNT"] = element["moldPCount"]
              ? element["moldPCount"]
              : "";
            temp["MOLD S COUNT"] = element["moldSCount"]
              ? element["moldSCount"]
              : "";
            tempExcelTable.push(temp);
          });
          for (var e in tempExcelTable) {
            counterExcelTable["MOLD WISE DATA"]["column"] = [
              ...counterExcelTable["MOLD WISE DATA"]["column"],
              ...Object.keys(tempExcelTable[e]),
            ];
          }
          var temp = new Set(counterExcelTable["MOLD WISE DATA"]["column"]);
          counterExcelTable["MOLD WISE DATA"]["column"] = [...temp];
          for (var e in counterExcelTable["MOLD WISE DATA"]["column"]) {
            counterExcelTable["MOLD WISE DATA"]["column"][e] = {
              name: counterExcelTable["MOLD WISE DATA"]["column"][e],
            };
          }
          for (var m in tempExcelTable) {
            let temp1: any = [];
            for (var n in counterExcelTable["MOLD WISE DATA"]["column"]) {
              temp1.push(
                tempExcelTable[m][
                  counterExcelTable["MOLD WISE DATA"]["column"][n]["name"]
                ]
              );
            }
            counterExcelTable["MOLD WISE DATA"]["row"].push(temp1);
          }
        }

        let dkey = Object.keys(counterExcelTable);
        dkey.forEach((rr) => {
          counterPdfTable[rr] = {};
          counterPdfTable[rr]["column"] = [];
          counterPdfTable[rr]["row"] = [];
          counterExcelTable[rr]["column"].forEach((element) => {
            counterPdfTable[rr]["column"].push({
              text: element.name,
              value: element.name,
            });
          });

          counterExcelTable[rr]["row"].forEach((row) => {
            let temp: any = {};
            for (var x in counterExcelTable[rr]["column"]) {
              temp[counterExcelTable[rr]["column"][x]["name"]] = row[x];
            }
            counterPdfTable[rr]["row"].push(temp);
          });
        });

        console.log(infoData, indicator, "ggg");

        infoData["parameters"].forEach((e) => {
          if (
            (e["name"] == "MACHINE_ID" || e["name"] == "MACHINE_NAME") &&
            indicator["allMachines"] &&
            indicator["allMachines"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "SHIFT" &&
            indicator["allShifts"] &&
            indicator["allShifts"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "REASON" &&
            indicator["allReasons"] &&
            indicator["allReasons"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            (e["name"] == "MATERIAL" || e["name"] == "MATERIAL_DESCRIPTION") &&
            indicator["allMaterials"] &&
            indicator["allMaterials"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
        });
        let final = infoData.parameters[1].value;
        console.log("ffff", final);

        if (final[0] === "ALL SELECTED") {
          final[0] = final[0];
          console.log("in ifs");
        } else {
          final.forEach((e, i) => {
            final[i] = result2[e];
          });
          console.log("in else");
        }
        let finalData = {
          infoData: infoData,
          tableData: tableData,
          graphData: graphData,
          counterData: counterData,
          flowData: flowData,
          excelTable: excelTable,
          pdfTable: pdfTable,
          counterPdfTable: counterPdfTable,
          counterExcelTable: counterExcelTable,
          counterText: counterText,
        };

        if (type == reportType["OVERALL_PDF"]) {
          // console.log("Chetan: ",finalData.pdfTable);
          createPdf("energy", finalData, (err, data) => {
            if (err) {
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: "Something went wrong!",
              };
              next();
              return;
            }
            req.apiStatus = {
              isSuccess: true,
              data: data,
            };
            next();
          });
        } else if (type == reportType["OVERALL_EXCEL"]) {
          createExcel(
            "Energy-Report",
            conditionArray[0],
            finalData,
            (err, data) => {
              // console.log(data);

              if (err) {
                req.apiStatus = {
                  isSuccess: false,
                  error: ErrorCodes[1002],
                  data: "Something went wrong!",
                };
                next();
                return;
              }
              req.apiStatus = {
                isSuccess: true,
                data: data,
              };
              next();
            }
          );
        } else {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1002],
            data: "Report type invalid",
          };
          next();
          return;
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
  });
}

export async function mould(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var request: JSON = req.body;
  let collectionName = "MACHINE_MATERIAL";
  let page = req.query.page ? req.query.page : "0";
  let limit = req.query.limit ? req.query.limit : false;
  let sort = req.query.sortBy ? req.query.sortBy : false;
  let direction = req.query.sortDirection ? req.query.sortDirection : false;
  let searchString = req.query.searchString ? req.query.searchString : false;
  let type = req.params.type ? req.params.type : reportType["OVERALL_PDF"];

  logger.debug(logger.DEFAULT_MODULE, "", "search request");

  let conditionArray: JSON[] = request["conditions"];
  let infoData: any =
    conditionArray && conditionArray[0] ? conditionArray[0] : {};
  let indicator: any = request["indicator"] ? request["indicator"] : {};

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

  result = await DynamicModels.findWithoutCB("MACHINE_LIST", {}, {}, {});
  if (result && result.length) {
    //  console.log("JSON foramt", )
    JSON.parse(JSON.stringify(result)).forEach((val) => {
      // console.log("ii", i);
      result2[val.MACHINE_ID] = val.MACHINE_DISPLAY;
    });
  }

  const promises: any = [];
  conditionArray.map((element) => {
    promises.push(searchGraphForMouldChange(collectionName, element));
    promises.push(searchGraphForCounterChange(collectionName, element));
    // promises.push(
    //   search(
    //     collectionName,
    //     element,
    //     page,
    //     limit,
    //     sort,
    //     direction,
    //     searchString
    //   )
    // );
    Promise.all(promises)
      .then((response: any) => {
        console.log("response Data",response);
        
        logger.debug(logger.DEFAULT_MODULE, "", "DEBUG:7");
        let counterData: any = {};
        let graphData: any = {};
        let tableData: any = {};
        let flowData: any = [];
        let totalReports: any;
        let reportValues: any = [];
        let showHeaders: any = [];

        for (var r in response) {
     
          if (response[r]["countersData"]) {
            counterData = response[r]["countersData"];
          } else if (response[r]["flowData"]) {
            flowData = response[r]["flowData"];
          } else if (response[r]["graphData"]) {
            graphData = response[r]["graphData"];
          } else if (response[r]["tableData"]) {
            reportValues = response[r]["tableData"];
            totalReports = response[r]["count"];
            let newHeaders: any = [];
            if (reportValues && reportValues[0]) {
              for (var e in reportValues) {
                showHeaders = [...showHeaders, ...Object.keys(reportValues[e])];
              }
              var temp = new Set(showHeaders);
              showHeaders = [...temp];
              for (var e in showHeaders) {
                if (showHeaders[e] != "_id") {
                  newHeaders.push({
                    text: showHeaders[e],
                    value: showHeaders[e],
                  });
                }
              }
            }
            tableData = {
              reportValues: reportValues,
              totalReports: totalReports,
              showHeaders: newHeaders,
            };
          }
        }
        // console.log("show headers",response[0]);

                // counterData.machineWiseData.forEach(async (item, i) => {
                //   item.machineName = result2[item.machineName];
                //   if (i == counterData.machineWiseData.length - 1)
                //     console.log("item", counterData.machineWiseData);
                // });

        let counterText: any = {};
        let dur = 0;
        counterText["durationSum"] = 0;
        counterText["count"] = 0;
        if (response && response[0] && response[0]["flowData"]) {
          response[0]["flowData"].forEach((res) => {
            res["data"].forEach((data) => {
              dur =
                data && data["DURATION"] && parseInt(data["DURATION"])
                  ? parseInt(data["DURATION"])
                  : 0;
              counterText["count"] = counterText["count"] + 1;
              counterText["durationSum"] = counterText["durationSum"] + dur;
              dur = 0;
            });
          });
          if (counterText["count"] == 0) {
            counterText["avgDuration"] = 0;
          } else {
            counterText["avgDuration"] =
              counterText["durationSum"] / counterText["count"];
            counterText["avgDuration"] = counterText["avgDuration"].toFixed(2);
          }
        }

        let excelTable: any = {};
        excelTable["column"] = [];
        excelTable["row"] = [];
        let tempExcelTable: any = [];

        reportValues.forEach((element) => {
          let temp = {};
          temp["MACHINE NAME"] = element["MACHINE_ID"]
            ? element["MACHINE_ID"]
            : "";
          temp["MATERIAL"] = element["MATERIAL"] ? element["MATERIAL"] : "";
          temp["FROM TIME"] = element["FROM_TIME"] ? element["FROM_TIME"] : "";
          temp["TO TIME"] = element["TO_TIME"] ? element["TO_TIME"] : "";
          temp["DURATION"] = element["DURATION"] ? element["DURATION"] : "";
          temp["SHIFT"] = element["SHIFT"] ? element["SHIFT"] : "";
          temp["RECORDED DATE"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[0]
              ? element["TIME_STAMP"].split(", ")[0]
              : "";
          temp["RECORDED TIME"] =
            element["TIME_STAMP"] &&
            element["TIME_STAMP"].split(", ") &&
            element["TIME_STAMP"].split(", ")[1]
              ? element["TIME_STAMP"].split(", ")[1]
              : "";
          temp["OPERATOR"] = element["OPERATOR"] ? element["OPERATOR"] : "";
          temp["SUPERVISOR"] = element["SUPERVISOR"];
          temp["Reported By"] = element["Reported By"]
            ? element["SUPERVISOR"]
            : "";
          tempExcelTable.push(temp);
        });
        for (var e in tempExcelTable) {
          excelTable["column"] = [
            ...excelTable["column"],
            ...Object.keys(tempExcelTable[e]),
          ];
        }
        var temp = new Set(excelTable["column"]);
        excelTable["column"] = [...temp];
        for (var e in excelTable["column"]) {
          excelTable["column"][e] = { name: excelTable["column"][e] };
        }
        for (var m in tempExcelTable) {
          let temp1: any = [];
          for (var n in excelTable["column"]) {
            temp1.push(tempExcelTable[m][excelTable["column"][n]["name"]]);
          }
          excelTable["row"].push(temp1);
        }

        let pdfTable: any = {};
        // pdfTable["column"] = [];
        // pdfTable["row"] = [];
        // excelTable["column"].forEach((element) => {
        //   pdfTable["column"].push({ text: element.name, value: element.name });
        // });

        // excelTable["row"].forEach((row) => {
        //   let temp: any = {};
        //   for (var x in excelTable["column"]) {
        //     temp[excelTable["column"][x]["name"]] = row[x];
        //   }
        //   pdfTable["row"].push(temp);
        // });
        // console.log("infoData",infoData);

        infoData["parameters"].forEach((e) => {
          if (
            (e["name"] == "MACHINE_ID" || e["name"] == "MACHINE_NAME") &&
            indicator["allMachines"] &&
            indicator["allMachines"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "SHIFT" &&
            indicator["allShifts"] &&
            indicator["allShifts"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            e["name"] == "REASON" &&
            indicator["allReasons"] &&
            indicator["allReasons"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
          if (
            (e["name"] == "MATERIAL" || e["name"] == "MATERIAL_DESCRIPTION") &&
            indicator["allMaterials"] &&
            indicator["allMaterials"] == true
          ) {
            e["value"] = ["ALL SELECTED"];
          }
        });
        // console.log("flowdata in mould",finalData.flowData[0].data[0]);

        flowData.forEach((m) => {
          m._id = result2[m._id];
        });
        // console.log("ff",finalData.infoData.parameters[1].value);

        let final = infoData.parameters[1].value;
        console.log("ffff", final);

        if (final[0] === "ALL SELECTED") {
          final[0] = final[0];
          console.log("in ifs");
        } else {
          final.forEach((e, i) => {
            final[i] = result2[e];
          });
          console.log("in else");
        }

        let finalData = {
          infoData: infoData,
          tableData: tableData,
          graphData: graphData,
          counterData: counterData,
          flowData: flowData,
          pdfTable: pdfTable,
          counterText: counterText,
        };
        console.log("counterData",finalData.counterData);
        

        if (type == reportType["OVERALL_PDF"]) {
          createPdf("mould", finalData, (err, data) => {
            
            if (err) {
              console.log("error 11");
              
              req.apiStatus = {
                isSuccess: false,
                error: ErrorCodes[1002],
                data: "Something went wrong!",
              };
              next();
              return;
            }
            req.apiStatus = {
              isSuccess: true,
              data: data,
            };
            next();
          });
        } else {
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1002],
            data: "Report type invalid",
          };
          next();
          return;
        }
      })
      .catch((error) => {
        console.log("catch error");
        
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
  });
}

export let createPdf = async function (ejsName: any, data: any, cb: Function) {
  try {
    let reportName = ejsName;
    const url = `${config.url}`;
    const localUrl = `${config.localUrl}`;
    let fileName = Date.now();
    // console.log('1', url)
    var html = await ejs.renderFile(
      path.join(__dirname, "/../../../views/", `${reportName}.ejs`),
      {
        infoData: JSON.stringify(data.infoData),
        tableData: JSON.stringify(data.tableData),
        graphData: JSON.stringify(data.graphData),
        counterData: JSON.stringify(data.counterData),
        flowData: JSON.stringify(data.flowData),
        pdfTable: JSON.stringify(data.pdfTable),
        counterPdfTable: JSON.stringify(data.counterPdfTable),
        counterText: JSON.stringify(data.counterText),
      }
    );
    fs.writeFileSync(
      path.join(
        process.cwd(),
        "/reports/temp/",
        `${reportName}-${fileName}.html`
      ),
      html,
      "utf8"
    );
    let option = {
      args: ["--no-sandbox", "--disable-setuid-sandbox"], //  Additional arguments to pass to the browser instance. The list of Chromium flags can be found https://peter.sh/experiments/chromium-command-line-switches/. This options will overwrite the default arguments. The default arguments are ['--no-sandbox', '--disable-setuid-sandbox'].
      path: path.join(
        process.cwd() + "/reports/pdf/" + `${reportName}-${fileName}` + ".pdf"
      ), // The file path to save the PDF to. If path is a relative path, then it is resolved to current working directory. If no path is provided, the PDF won't be saved anywhere.
      scale: 1, // Scale of the webpage rendering. Defaults to 1. Scale amount must be between 0.1 and 2.
      // displayHeaderFooter: true, // Display header and footer. Defaults to false.
      // headerTemplate: "", // HTML template to print the header. Should be valid HTML markup with following classes used to inject printing values into them:
      /*
      date formatted date
      title document title
      url document location
      pageNumber current page number
      totalPages total pages in the document
      */
      // footerTemplate: "", // HTML template to print the footer. Should use the same format as the headerTemplate.
      printBackground: true, // Print background graphics. Defaults to false.
      landscape: true, // Paper orientation. Defaults to false.
      // pageRanges: "1-5", // Paper ranges to print, e.g., '1-5, 8, 11-13'. Defaults to the empty string, which means print all pages.
      format: "A4", // Paper format. If set, takes priority over width or height options. Defaults to 'Letter'.
      // width: "1080px", //Paper width, accepts values labeled with units.
      // height: "1417.5px", //Paper height, accepts values labeled with units.
      margin: {
        top: "5mm", // Top margin, accepts values labeled with units.
        right: "5mm", // Right margin, accepts values labeled with units.
        bottom: "5mm", // Bottom margin, accepts values labeled with units.
        left: "5mm", // Left margin, accepts values labeled with units.
      },
      preferCSSPageSize: false, // Give any CSS @page size declared in the page priority over what is declared in width and height or format options. Defaults to false, which will scale the content to fit the paper size.
      timeout: 0,
    };
    // console.log('2')
    let file = {
      // content: renderedData,
      //url: `${url}/temp/${reportName}-${fileName}.html`,
      url: `${localUrl}/temp/${reportName}-${fileName}.html`,
    };
    // console.log('3', file)
    await html_to_pdf.generatePdf(file, option).then((pdfBuffer) => {
      // fs.unlinkSync(
      //   path.join(
      //     process.cwd(),
      //     "/reports/temp/",
      //     `${reportName}-${fileName}.html`
      //   )
      // );
      // res.redirect(`http://localhost:${port}/reports/pdf/${fileName}.pdf`);
      cb(null, `${url}/v1/download/pdf/${reportName}-${fileName}.pdf`);
    });
  } catch (err) {
    console.log(err);
    cb(err);
  }
};

// let createExcel = async function (
//   name: any,
//   payload: any,
//   data: any,
//   cb: Function
// ) {
//   try {
//     if (data["counterData"] && data["counterData"]["productivityGraph"])
//       delete data["counterData"]["productivityGraph"];

//     const url = config.url;
//     let fileName = Date.now();
//     const workbook = new ExcelJs.Workbook();

//     workbook.creator = "DataCT";
//     workbook.lastModifiedBy = "DataCT";
//     workbook.created = new Date();
//     workbook.modified = new Date();
//     workbook.lastPrinted = new Date();

//     workbook.views = [
//       {
//         x: 0,
//         y: 0,
//         width: 100,
//         height: 200,
//         firstSheet: 0,
//         activeTab: 1,
//         visibility: "visible",
//       },
//     ];

//     let checkArr = function (col, inp) {
//       let count = 0;
//       for (let i = 0; i < col.length; i++) {
//         if (col && col[i] && col[i]["name"] == inp) {
//           count = count + 1;
//         }
//       }
//       if (count > 0) return true;
//       else return false;
//     };

//     const sheet = workbook.addWorksheet("Report");

//     let ind = 1;
//     let co = 1;
//     sheet.insertRow(ind, [name]);
//     ind = ind + 2;

//     if (payload && payload["date"]) {
//       if (payload["date"]["start"]) {
//         sheet.insertRow(ind, [
//           "Start Date",
//           new Date(payload["date"]["start"]),
//           ,
//           "Start Time",
//           `${new Date(payload["date"]["start"]).getHours()}:${new Date(
//             payload["date"]["start"]
//           ).getMinutes()}:${new Date(payload["date"]["start"]).getSeconds()}`,
//         ]);
//         ind = ind + 1;
//       }
//       if (payload["date"]["end"]) {
//         sheet.insertRow(ind, [
//           "End Date",
//           new Date(payload["date"]["end"]),
//           ,
//           "End Time",
//           `${new Date(payload["date"]["end"]).getHours()}:${new Date(
//             payload["date"]["end"]
//           ).getMinutes()}:${new Date(payload["date"]["end"]).getSeconds()}`,
//         ]);
//         ind = ind + 1;
//       }
//     }

//     if (payload && payload["parameters"]) {
//       payload["parameters"].forEach((e) => {
//         sheet.insertRow(ind, [e["name"], e["value"].toString()]);
//         ind = ind + 1;
//       });
//     }

//     ind = ind + 1;

//     let keys = Object.keys(data["counterData"]);
//     keys.forEach((e) => {
//       if (typeof data["counterData"][e] == "string") {
//         sheet.insertRow(ind, [e, parseInt(data["counterData"][e])]);
//         ind = ind + 1;
//       } else if (typeof data["counterData"][e] == "number") {
//         sheet.insertRow(ind, [e, data["counterData"][e]]);
//         ind = ind + 1;
//       }
//     });

//     ind = ind + 1;

//     keys.forEach((e) => {
//       let column: any = [];
//       let row: any = [];
//       if (
//         data["counterData"][e] instanceof Array &&
//         data["counterData"][e].length
//       ) {
//         data["counterData"][e].map((ele) => {
//           let key2 = Object.keys(ele);
//           key2.forEach((ee) => {
//             if (typeof ele[ee] == "number") {
//               if (!checkArr(column, ee)) {
//                 column.push({ name: ee });
//               }
//             } else if (typeof ele[ee] == "string") {
//               if (!checkArr(column, ee)) {
//                 column.push({ name: ee });
//               }
//             }
//           });
//           key2.forEach((ee) => {
//             if (ele[ee] instanceof Array && ele[ee].length) {
//               let key3 = Object.keys(ele[ee][0]);
//               key3.forEach((ef) => {
//                 if (!checkArr(column, `${ee} ${ef}`)) {
//                   column.push({ name: `${ee} ${ef}` });
//                 }
//               });
//             }
//           });
//         });
//         data["counterData"][e].map((ele) => {
//           let miniRow: any = [];
//           column.forEach((ee) => {
//             if (typeof ele[ee["name"]] == "number") {
//               miniRow.push(ele[ee["name"]]);
//             } else if (typeof ele[ee["name"]] == "string") {
//               miniRow.push(ele[ee["name"]]);
//             }
//           });
//           let tuff: any = [];
//           let flag: any = false;
//           column.forEach((ee) => {
//             let temp: any = ee["name"].split(" ");
//             if (!tuff.includes(temp[0])) {
//               if (
//                 temp[0] &&
//                 temp[1] &&
//                 ele &&
//                 ele[temp[0]] &&
//                 temp.length > 1
//               ) {
//                 tuff.push(temp[0]);
//                 let folder: any = [];
//                 column.forEach((r) => {
//                   if (r["name"].split(" ").length > 1) {
//                     folder.push(r["name"].split(" ")[1]);
//                   }
//                 });
//                 for (let j = 0; j < ele[temp[0]].length; j++) {
//                   let tempRow: any = [];
//                   tempRow.push(...miniRow);
//                   for (let k = 0; k < folder.length; k++) {
//                     tempRow.push(ele[temp[0]][j][folder[k]]);
//                   }
//                   flag = true;
//                   row.push(tempRow);
//                 }
//               }
//             }
//           });
//           if (!flag) row.push(miniRow);
//           flag = false;
//         });

//         sheet.insertRow(ind, [e]);
//         ind = ind + 1;
//         sheet.addTable({
//           name: `${e}`,
//           displayName: `${e}`,
//           ref: `A${ind}`,
//           headerRow: true,
//           totalsRow: false,
//           style: {
//             theme: "TableStyleLight1",
//             showRowStripes: false,
//           },
//           columns: column,
//           rows: row,
//         });
//         if (co < column.length) {
//           co = column.length;
//         }
//         ind = ind + 2 + row.length;
//       }
//     });

//     if (data["excelTable"]["column"].length > 0) {
//       sheet.insertRow(ind, ["Detailed Report"]);
//       ind = ind + 1;
//       sheet.addTable({
//         name: `excelTable`,
//         displayName: `excelTable`,
//         ref: `A${ind}`,
//         headerRow: true,
//         totalsRow: false,
//         style: {
//           theme: "TableStyleLight1",
//           showRowStripes: false,
//         },
//         columns: data["excelTable"]["column"],
//         rows: data["excelTable"]["row"],
//       });
//       if (co < data["excelTable"]["column"].length) {
//         co = data["excelTable"]["column"].length;
//       }
//       ind = ind + 2 + data["excelTable"]["row"].length;
//     }

//     let ch = "A";
//     for (var x = 0; x < co; x++) {
//       for (var y = 0; y < ind; y++) {
//         sheet.getCell(
//           String.fromCharCode(ch.charCodeAt(0) + x) + `${y}`
//         ).alignment = {
//           vertical: "middle",
//           horizontal: "center",
//           wrapText: true,
//         };
//       }
//     }

//     workbook.xlsx.writeFile(
//       path.join(
//         __dirname +
//           "../../../../reports/excel/" +
//           `${name}-${fileName}` +
//           ".xlsx"
//       )
//     );
//     cb(null, `${url}/v1/download/excel/${name}-${fileName}.xlsx`);
//   } catch (err) {
//     cb(err);
//   }
// };

let createExcel = async function (
  name: any,
  payload: any,
  data: any,
  cb: Function
) {
  try {
    const url = `${config.url}`;
    let fileName = Date.now();
    const workbook = new ExcelJs.Workbook();

    workbook.creator = "DataCT";
    workbook.lastModifiedBy = "DataCT";
    workbook.created = new Date();
    workbook.modified = new Date();
    workbook.lastPrinted = new Date();

    workbook.views = [
      {
        x: 0,
        y: 0,
        width: 100,
        height: 200,
        firstSheet: 0,
        activeTab: 1,
        visibility: "visible",
      },
    ];

    let checkArr = function (col, inp) {
      let count = 0;
      for (let i = 0; i < col.length; i++) {
        if (col && col[i] && col[i]["name"] == inp) {
          count = count + 1;
        }
      }
      if (count > 0) return true;
      else return false;
    };

    const sheet = workbook.addWorksheet("Report");
    sheet.properties.defaultColWidth = 21.5;

    let ind = 1;
    let co = 1;
    sheet.insertRow(ind, [name]);
    sheet.getRow(ind).font = { bold: true };
    ind = ind + 2;

    if (payload && payload["date"]) {
      if (payload["date"]["start"]) {
        sheet.insertRow(ind, [
          "Start Date",
          new Date(payload["date"]["start"]),
          ,
          "Start Time",
          `${new Date(payload["date"]["start"]).getHours()}:${new Date(
            payload["date"]["start"]
          ).getMinutes()}:${new Date(payload["date"]["start"]).getSeconds()}`,
        ]);
        sheet.getRow(ind).font = { bold: true };

        ind = ind + 1;
      }
      if (payload["date"]["end"]) {
        sheet.insertRow(ind, [
          "End Date",
          new Date(payload["date"]["end"]),
          ,
          "End Time",
          `${new Date(payload["date"]["end"]).getHours()}:${new Date(
            payload["date"]["end"]
          ).getMinutes()}:${new Date(payload["date"]["end"]).getSeconds()}`,
        ]);
        sheet.getRow(ind).font = { bold: true };

        ind = ind + 1;
      }
    }

    if (payload && payload["parameters"]) {
      payload["parameters"].forEach((e) => {
        sheet.insertRow(ind, [e["name"], e["value"].toString()]);
        sheet.getRow(ind).font = { bold: true };

        ind = ind + 1;
      });
    }

    if (data && data["counterText"]) {
      let c = Object.keys(data["counterText"]);
      c.forEach((r) => {
        sheet.insertRow(ind, [r, data["counterText"][r]]);
        sheet.getRow(ind).font = { bold: true };

        ind = ind + 1;
      });
    }

    ind = ind + 2;
    let ch = "A";

    if (data && data["counterExcelTable"]) {
      let cc = Object.keys(data["counterExcelTable"]);
      let yo = 0;
      cc.forEach((tt) => {
        sheet.insertRow(ind, [tt]);
        sheet.getRow(ind).font = { bold: true };
        ind = ind + 1;
        sheet.addTable({
          name: `tablee${yo}`,
          displayName: `tablee${yo}`,
          ref: `A${ind}`,
          headerRow: true,
          totalsRow: false,
          style: {
            theme: "TableStyleLight1",
            // showRowStripes: true,
          },
          columns: data["counterExcelTable"][tt]["column"],
          rows: data["counterExcelTable"][tt]["row"],
        });
        yo = yo + 1;
        ch = "A";
        for (
          var x = 0;
          x < data["counterExcelTable"][tt]["column"].length;
          x++
        ) {
          for (
            var y = ind;
            y < ind + 1 + data["counterExcelTable"][tt]["row"].length;
            y++
          ) {
            sheet.getCell(
              String.fromCharCode(ch.charCodeAt(0) + x) + `${y}`
            ).border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          }
        }
        if (co < data["counterExcelTable"][tt]["column"].length) {
          co = data["counterExcelTable"][tt]["column"].length;
        }
        ind = ind + 3 + data["counterExcelTable"][tt]["row"].length;
      });
    }

    // if (data["excelTable"]["column"].length > 0) {
    //   // for(let cc=0; cc<data["excelTable"]["column"].length; cc++){
    //   //   for(let ccc=0; ccc<data["excelTable"]["column"][cc].length; ccc++){
    //   //     data["excelTable"]["column"][cc] = parseFloat()
    //   //   }
    //   // }
    //   sheet.insertRow(ind, ["DETAILED REPORT"]);
    //   sheet.getRow(ind).font = { bold: true };
    //   ind = ind + 1;
    //   sheet.addTable({
    //     name: `excelTable`,
    //     displayName: `excelTable`,
    //     ref: `A${ind}`,
    //     headerRow: true,
    //     totalsRow: false,
    //     style: {
    //       theme: "TableStyleLight1",
    //       // showRowStripes: true,
    //     },
    //     columns: data["excelTable"]["column"],
    //     rows: data["excelTable"]["row"],
    //   });

    //   let ch = "A";
    //   for (var x = 0; x < data["excelTable"]["column"].length; x++) {
    //     for (var y = ind; y < ind + 1 + data["excelTable"]["row"].length; y++) {
    //       sheet.getCell(
    //         String.fromCharCode(ch.charCodeAt(0) + x) + `${y}`
    //       ).border = {
    //         top: { style: "thin" },
    //         left: { style: "thin" },
    //         bottom: { style: "thin" },
    //         right: { style: "thin" },
    //       };
    //     }
    //   }
    //   if (co < data["excelTable"]["column"].length) {
    //     co = data["excelTable"]["column"].length;
    //   }
    //   ind = ind + 2 + data["excelTable"]["row"].length;
    // }

    ch = "A";
    for (var x = 0; x < co; x++) {
      for (var y = 0; y < ind; y++) {
        sheet.getCell(
          String.fromCharCode(ch.charCodeAt(0) + x) + `${y}`
        ).alignment = {
          vertical: "middle",
          horizontal: "center",
          wrapText: true,
        };
      }
    }

    // await workbook.xlsx.writeFile(
    //   path.join(
    //     __dirname +
    //       "../../../../reports/excel/" +
    //       `${name}-${fileName}` +
    //       ".xlsx"
    //   )
    // );
    var buff: any = await workbook.xlsx.writeBuffer();
    fs.writeFileSync(
      path.join(
        process.cwd() + "/reports/excel/" + `${name}-${fileName}` + ".xlsx"
      ),
      buff
    );
    cb(null, `${url}/v1/download/excel/${name}-${fileName}.xlsx`);
  } catch (err) {
    cb(err);
  }
};

// let createRejectionExcel = async function (
//   name: any,
//   payload: any,
//   data: any,
//   cb: Function
// ) {
//   try {
//     if (data && data["productivityGraph"]) delete data["productivityGraph"];

//     const url = config.url;
//     let fileName = Date.now();
//     const workbook = new ExcelJs.Workbook();

//     workbook.creator = "DataCT";
//     workbook.lastModifiedBy = "DataCT";
//     workbook.created = new Date();
//     workbook.modified = new Date();
//     workbook.lastPrinted = new Date();

//     workbook.views = [
//       {
//         x: 0,
//         y: 0,
//         width: 100,
//         height: 200,
//         firstSheet: 0,
//         activeTab: 1,
//         visibility: "visible",
//       },
//     ];

//     let checkArr = function (col, inp) {
//       let count = 0;
//       for (let i = 0; i < col.length; i++) {
//         if (col && col[i] && col[i]["name"] == inp) {
//           count = count + 1;
//         }
//       }
//       if (count > 0) return true;
//       else return false;
//     };

//     const sheet = workbook.addWorksheet("Report");

//     let ind = 1;
//     let co = 1;
//     sheet.insertRow(ind, [name]);
//     ind = ind + 2;

//     if (payload && payload["date"]) {
//       if (payload["date"]["start"]) {
//         sheet.insertRow(ind, [
//           "Start Date",
//           new Date(payload["date"]["start"]),
//           ,
//           "Start Time",
//           `${new Date(payload["date"]["start"]).getHours()}:${new Date(
//             payload["date"]["start"]
//           ).getMinutes()}:${new Date(payload["date"]["start"]).getSeconds()}`,
//         ]);
//         ind = ind + 1;
//       }
//       if (payload["date"]["end"]) {
//         sheet.insertRow(ind, [
//           "End Date",
//           new Date(payload["date"]["end"]),
//           ,
//           "End Time",
//           `${new Date(payload["date"]["end"]).getHours()}:${new Date(
//             payload["date"]["end"]
//           ).getMinutes()}:${new Date(payload["date"]["end"]).getSeconds()}`,
//         ]);
//         ind = ind + 1;
//       }
//     }

//     if (payload && payload["parameters"]) {
//       payload["parameters"].forEach((e) => {
//         sheet.insertRow(ind, [e["name"], e["value"].toString()]);
//         ind = ind + 1;
//       });
//     }

//     ind = ind + 1;

//     let keys = Object.keys(data);
//     keys.forEach((e) => {
//       if (typeof data[e] == "string") {
//         sheet.insertRow(ind, [e, parseInt(data[e])]);
//         ind = ind + 1;
//       } else if (typeof data[e] == "number") {
//         sheet.insertRow(ind, [e, data[e]]);
//         ind = ind + 1;
//       }
//     });

//     ind = ind + 1;

//     keys.forEach((e) => {
//       let column: any = [];
//       let row: any = [];
//       if (data[e] instanceof Array && data[e].length) {
//         data[e].map((ele) => {
//           let key2 = Object.keys(ele);
//           key2.forEach((ee) => {
//             if (typeof ele[ee] == "number") {
//               if (!checkArr(column, ee)) {
//                 column.push({ name: ee });
//               }
//             } else if (typeof ele[ee] == "string") {
//               if (!checkArr(column, ee)) {
//                 column.push({ name: ee });
//               }
//             }
//           });
//           key2.forEach((ee) => {
//             if (ele[ee] instanceof Array && ele[ee].length) {
//               let key3 = Object.keys(ele[ee][0]);
//               key3.forEach((ef) => {
//                 if (!checkArr(column, `${ee} ${ef}`)) {
//                   column.push({ name: `${ee} ${ef}` });
//                 }
//               });
//             }
//           });
//         });
//         data[e].map((ele) => {
//           let miniRow: any = [];
//           column.forEach((ee) => {
//             if (typeof ele[ee["name"]] == "number") {
//               miniRow.push(ele[ee["name"]]);
//             } else if (typeof ele[ee["name"]] == "string") {
//               miniRow.push(ele[ee["name"]]);
//             }
//           });
//           let tuff: any = [];
//           let flag: any = false;
//           column.forEach((ee) => {
//             let temp: any = ee["name"].split(" ");
//             if (!tuff.includes(temp[0])) {
//               if (
//                 temp[0] &&
//                 temp[1] &&
//                 ele &&
//                 ele[temp[0]] &&
//                 temp.length > 1
//               ) {
//                 tuff.push(temp[0]);
//                 let folder: any = [];
//                 column.forEach((r) => {
//                   if (r["name"].split(" ").length > 1) {
//                     folder.push(r["name"].split(" ")[1]);
//                   }
//                 });
//                 for (let j = 0; j < ele[temp[0]].length; j++) {
//                   let tempRow: any = [];
//                   tempRow.push(...miniRow);
//                   for (let k = 0; k < folder.length; k++) {
//                     tempRow.push(ele[temp[0]][j][folder[k]]);
//                   }
//                   flag = true;
//                   row.push(tempRow);
//                 }
//               }
//             }
//           });
//           if (!flag) row.push(miniRow);
//           flag = false;
//         });
//         sheet.insertRow(ind, [e]);
//         ind = ind + 1;
//         sheet.addTable({
//           name: `${e}`,
//           displayName: `${e}`,
//           ref: `A${ind}`,
//           headerRow: true,
//           totalsRow: false,
//           style: {
//             theme: "TableStyleLight1",
//             showRowStripes: false,
//           },
//           columns: column,
//           rows: row,
//         });
//         if (co < column.length) {
//           co = column.length;
//         }
//         ind = ind + 2 + row.length;
//       }
//     });

//     if (data["excelTable"]["column"].length > 0) {
//       sheet.insertRow(ind, ["Detailed Report"]);
//       ind = ind + 1;
//       sheet.addTable({
//         name: `excelTable`,
//         displayName: `excelTable`,
//         ref: `A${ind}`,
//         headerRow: true,
//         totalsRow: false,
//         style: {
//           theme: "TableStyleLight1",
//           showRowStripes: false,
//         },
//         columns: data["excelTable"]["column"],
//         rows: data["excelTable"]["row"],
//       });
//       if (co < data["excelTable"]["column"].length) {
//         co = data["excelTable"]["column"].length;
//       }
//       ind = ind + 2 + data["excelTable"]["row"].length;
//     }

//     let ch = "A";
//     for (var x = 0; x < co; x++) {
//       for (var y = 0; y < ind; y++) {
//         sheet.getCell(
//           String.fromCharCode(ch.charCodeAt(0) + x) + `${y}`
//         ).alignment = {
//           vertical: "middle",
//           horizontal: "center",
//           wrapText: true,
//         };
//       }
//     }

//     workbook.xlsx.writeFile(
//       path.join(
//         __dirname +
//           "../../../../reports/excel/" +
//           `${name}-${fileName}` +
//           ".xlsx"
//       )
//     );
//     cb(null, `${url}/v1/download/excel/${name}-${fileName}.xlsx`);
//   } catch (err) {
//     cb(err);
//   }
// };
