import * as RejectionReasons from "../models/rejectionReasons";

let reasonObjs: any = [
  { REJ_REASON: "A - SHORT MOLDING" },
  { REJ_REASON: "B- SILVER" },
  { REJ_REASON: "C - AIR BUBBLE" },
  { REJ_REASON: "D - BLACK MARK" },
  { REJ_REASON: "E - FLOW MARK" },
  { REJ_REASON: "F - PIN MARK" },
  { REJ_REASON: "G - WHITE MARK" },
  { REJ_REASON: "H - COLOUR VARIATION" },
  { REJ_REASON: "I - HEAVY FLASH" },
  { REJ_REASON: "J - SCRATCH" },
  { REJ_REASON: "K - SHRINKAGE" },
  { REJ_REASON: "L - RIB DAMAGE" },
  { REJ_REASON: "M - DEEP CUT/ CUT MARK" },
  { REJ_REASON: "N - WATER MARK" },
  { REJ_REASON: "O - BOARD UPP FLASH" },
  { REJ_REASON: "P - BURN MARK" },
  { REJ_REASON: "Q - DENT" },
  { REJ_REASON: "R - WELDING MARK" },
  { REJ_REASON: "S - BEND" },
  { REJ_REASON: "T - LOCK BROKEN" },
  { REJ_REASON: "U - PAINT NG" },
  { REJ_REASON: "V - THINNER APPLY AFTER PAINT" },
  { REJ_REASON: "W - BLACK MARK" },
  { REJ_REASON: "X - SHINING/ SHINE PATCH" },
  { REJ_REASON: "Y - OTHERS" },
];

export function init() {
  reasonObjs.forEach((reason) => {
    try {
      RejectionReasons.createRejReason(
        [reason],
        (err: any, responseList: any) => {
          if (err) {
            console.log("Failed to add rejection reasons for", reason);
          }
        }
      );
    } catch (error) {
      //   failedObjs.push(reason);
    }
  });
}