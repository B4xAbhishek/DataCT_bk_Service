import cron from "node-cron";
import * as Dynamicmodel from "../models/dynamicmodel";
import { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "../models/models";

var fetchLatestOeeData = cron.schedule("*/10 * * * * *", function () {
  console.log(" start point:", Date.now());
  const startPoint = new Date(Date.now()).getTime();

  Dynamicmodel.distinct(
    "machineInfo",
    "machineCode",
    async (err: any, machineList: any) => {
      if (err) {
        console.log("Error in finding machine names");
      }

      if (machineList && machineList.length) {

        machineList.forEach((machine: any) => {
        Dynamicmodel.findLatestOEEBYMachineName(
            "OEE_MOLD_OUT",
            machine,
            (err, oeeData) => {
              if (err) {
                console.log("No data found for OEE -" + machine);
              }
              if (oeeData) {
                //update latest_OEE collection
    
                Dynamicmodel.upsertOne(
                  "latest_OEE",
                  oeeData._id,
                  oeeData,
                  (err, result) => {
                    if (err) {
                      console.log("failed to update -" + machine + "data");
                    }
                    console.log("Updated: " + machine + "-data", "End point: " + (new Date(Date.now()).getTime() - startPoint));
                   
                  }
                );                
              }
            }
          );
        });

        // Promise.all(promises)
        //   .then((response: any) => {
        //       console.log(response, "resp");
              
        //     console.log(
        //       "End point:",
        //       new Date(Date.now()).getTime() - startPoint
        //     );
        //     return
        //   })
        //   .catch((error) => {return});
      } else {
        console.log("no machine found in machineInfo collection");
      }
    }
  );
});

const latestOEEData = (machine: any) => {
  return new Promise(async (resolve, reject) => {
    try {
      
    } catch (error) {
        console.log("Error:", error);
        reject(error);
    } 
  });
};

// fetchLatestOeeData.start();
