import {
  isDateValid,
  typeOfData,
  getObjectIdFromDate,
} from "../../utils/helper";
import { CONSTANTS } from "../../utils/constants";

let subObj: JSON[] = [];
let subJSON: any = {};
let obj: any = {};

export function formData(key: string, value: any, result: JSON) {
  subObj = [];
  subJSON = {};
  let actualValue = value;

  if (typeOfData(value) === CONSTANTS.DATA_TYPE.array) {
    if (value.length > 0) {
      for (let element of value) {
        formArray(key, element, subObj);
      }
    }

    // return subObj

    if (subObj.length > 0) {
        // console.log("subObj-->", subObj);
        
      formKeyValue("$or", subObj, result);
    //   console.log("array => ", JSON.stringify(result));
    }
  } else if (typeOfData(value) === CONSTANTS.DATA_TYPE.object) {
    formKeyValue("$gte", value["start"], subJSON);
    formKeyValue("$lte", value["end"], subJSON);
    formKeyValue(key, subJSON, result);
    // console.log("obj => ", JSON.stringify(result));
  } else if (typeOfData(value) === CONSTANTS.DATA_TYPE.value) {
    formKeyValue(key, actualValue, result);
    console.log("map => ", JSON.stringify(result));
  }
}

export function formDateData(key: string, value: any, result: JSON) {
  subObj = [];
  subJSON = {};
  let actualValue = value;

  if (typeOfData(value) === CONSTANTS.DATA_TYPE.array) {
    if (value.length > 0) {
      for (let element of value) {
        element = getObjectIdFromDate(new Date(element));
        formArray(key, element, subObj);
      }
    }

    if (subObj.length > 0) {
      // formKeyValue("$or", subObj, result);
      console.log("array => ", JSON.stringify(result));
    }
  } else if (typeOfData(value) === CONSTANTS.DATA_TYPE.object) {
    if (!isDateValid(new Date(value["start"])) || !isDateValid(new Date(value["end"]))) {
      formKeyValue("$gte", parseInt(value["start"]), subJSON);
      formKeyValue("$lte", parseInt(value["end"]), subJSON);      
    }else if (
      typeof value["start"] === "number" &&
      typeof value["end"] === "number"
    ) {
      formKeyValue("$gte", value["start"], subJSON);
      formKeyValue("$lte", value["end"], subJSON);
    } 
    else {
      console.log("here");
      
      formKeyValue("$gte", new Date(value["start"]), subJSON);
      formKeyValue("$lte", new Date(value["end"]), subJSON);
      // formKeyValue("$gte", value["start"], subJSON);
      // formKeyValue("$lte", value["end"], subJSON);
    }

    formKeyValue(key, subJSON, result);
    // console.log("obj => ", JSON.stringify(result));
  } else if (typeOfData(value) === CONSTANTS.DATA_TYPE.value) {
    formKeyValue(key, getObjectIdFromDate(new Date(actualValue)), result);
    console.log("map => ", JSON.stringify(result));
  }
}

export function formArray(key: string, value: any, subObj: JSON[]) {
  //console.log("key = ", key, " value = ", JSON.stringify(value));
  obj = {};
  formKeyValue(key, value, obj);
  subObj.push(obj);
}

export function formKeyValue(key: string, value: any, obj: any) {
  // console.log("executing formKeyValue for:", key, value);
  obj[key] = value;
  // console.log("object", obj);
  
}

export function getConditionAttribute(condition: JSON, key: string) {
  return condition[key];
}

export function setError(req: any, errorCode: any, data: any) {
  req.apiStatus = {
    isSuccess: false,
    error: errorCode,
    data: data,
  };
  return;
}

//date formate check and condition check
export function checkConditions(date: any) {
  // if (conditionId == undefined || conditionId.length == 0)
  //     return { "data": "Please insert condition id.", "value": false };
  if (date == undefined || date.length == 0)
    return { data: "Please insert date.", value: false };
  if (typeOfData(date) === CONSTANTS.DATA_TYPE.array) {
    date.map((element) => {
      if (!isDateValid(new Date(element))) {
        return { data: "Incorrect Date Format " + element, value: false };
      }
    });
  } else if (typeOfData(date) === CONSTANTS.DATA_TYPE.object) {
    if (
      !isDateValid(new Date(date["start"])) ||
      !isDateValid(new Date(date["end"]))
    ) {
      return { data: "Incorrect Date Format", value: false };
    }
  } else if (typeOfData(date) === CONSTANTS.DATA_TYPE.value) {
    if (!isDateValid(new Date(date))) {
      return { data: "Incorrect Date Format " + date, value: false };
    }
  }
  return { data: "", value: true };
}

export function countMachine(parameters: []) {
  var machineCount:any = 0
  if(parameters && parameters.length){
    
    parameters.forEach((param:any)=>{
      if(param.name === "MACHINE_NAME" || param.name === "MACHINE_NAME") {
         machineCount = param.value.length
      }
    })
    
    return machineCount
  } else {
    console.log("no machine found to count");
    return 0
  }
}

export function getMachineAttribute(parameters: []) {
  var machineCount:any = 0
  var machineArray:any = []
  if(parameters && parameters.length){
    
    parameters.forEach((param:any)=>{
      
      if(param.name === "MACHINE_NAME" || param.name === "MACHINE_ID") {
         machineCount = param.value.length
         machineArray = param.value
      }
    })
    return {machineCount, machineArray}
  } else {
    console.log("no machine found to count");
    return {machineCount, machineArray}
  }
}

export function getReasonAttribute(parameters: []) {
  var machineCount:any = 0
  var reasonsArray:any = []
  if(parameters && parameters.length){
    
    parameters.forEach((param:any)=>{
      
      if(param.name === "REASON") {
        //  machineCount = param.value.length
         reasonsArray = param.value
      }
    })
    return {reasonsArray}
  } else {
    console.log("no machine found to count");
    return {reasonsArray}
  }
}

export function getMaterialAttribute(parameters: []) {
  var materialCount:any = 0
  var materialArray:any = []
  if(parameters && parameters.length){
    
    parameters.forEach((param:any)=>{
      
      if(param.name === "MATERIAL_DESCRIPTION" ) {
         materialCount = param.value.length
         materialArray = param.value
      }
    })
    return {materialCount, materialArray}
  } else {
    console.log("no material found to count");
    return {materialCount, materialArray}
  }
}
