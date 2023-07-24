import uniqid from "uniqid";
import { CONSTANTS } from "./constants";

export function findJsonInJsonArray(list: any, value: any, keyToSearch: any) {
  list.forEach(element => {
    if (element[keyToSearch] === value) {
      return true;
    }
  });
  return false;
}

export function addJson(obj: any, key: any, value: any) {
  obj[key] = value;
  return obj;
}

export function typeOfData(data) {
  if (typeof (data) === 'object') {
    if (Array.isArray(data)) {
      return CONSTANTS.DATA_TYPE.array;
    } else {
      return CONSTANTS.DATA_TYPE.object;
    }
  } else {
    return CONSTANTS.DATA_TYPE.value;
  }
}

export function generateTransactionId() {
  return uniqid("tx");
}

export function generatePassword() {
  var pass = "";
  var str = "ABCDEFGHIJKLMNOPQRSTUVWXYZ" + "abcdefghijklmnopqrstuvwxyz0123456789@#$";

  for (let i = 1; i <= 10; i++) {
    var char = Math.floor(Math.random() * str.length + 1);

    pass += str.charAt(char);
  }

  return pass;
}

export function getObjectIdFromDate(date) {
  let objectId = Math.floor(date.getTime() / 1000).toString(16) + "0000000000000000";
  return objectId;
};

export function getDateFromObjectId(objectId) {
  return new Date(parseInt(objectId.substring(0, 8), 16) * 1000);
}



export function isCollectionEmpty(collectionName: string) {
  if (!collectionName || collectionName.length == 0) {
    return true;
  }
  return false;
}

export function isDateValid(date) {
  if (date instanceof Date && !isNaN(date.valueOf())) {
    return true;
  }
  return false;
}

