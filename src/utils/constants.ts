export let CONSTANTS = {
  MACHINE_COLLECTION: "machine",
  DATA_TYPE: {
    array: "Array",
    object: "Object",
    value: "value",
  },
  FILTER_PARAMS: {
    MACHINE_ID: "MACHINE_NAME",
  },
};

export enum MACHINE_STATUS {
  RUNNING = "RUNNING",
  IDLE = "IDLE",
  STOPPED = "STOPPED",
  DISCONNECTED = "DISCONNECTED",
}

export const collectionFields = {
  BREAKDOWN_REASONS: ["REASON", "REASON_DISPLAY", "SAP_CODE", "TIME_STAMP"],
  MBD_REASONS: ["REASON", "REASON_DISPLAY", "SAP_CODE", "TIME_STAMP"],
  REJECTION_REASONS: ["REASON", "REASON_DISPLAY", "SAP_CODE", "TIME_STAMP"],
  TAB_MATERIAL: [
    "MATERIAL",
    "MATERIAL_DESCRIPTION",
    "CAVITY_COUNT",
    "MOULD_SAP",
    "SAP_CODES",
    "STD_CYCLE_TIME",
    "MEASURING_POINT",
    "MOULD_ID",
    "MATERIAL_ORIGINAL",
    "DRAWING",
    "TIME_STAMP",
    "EJECTOR",
  ],
  PLANNED_REASONS: ["REASON", "REASON_DISPLAY", "SAP_CODE", "TIME_STAMP"],
  SHIFT_MAINTAINANCE: [
    "TIME_STAMP",
    "MACHINE_NAME",
    "SHIFT_1_START_TIME",
    "SHIFT_1_END_TIME",
    "SHIFT_1_BREAK_TIME",
    "SHIFT_2_START_TIME",
    "SHIFT_2_END_TIME",
    "SHIFT_2_BREAK_TIME",
    "SHIFT_1_LUNCH_START_TIME",
    "SHIFT_1_LUNCH_END_TIME",
    "SHIFT_2_LUNCH_START_TIME",
    "SHIFT_2_LUNCH_END_TIME",
    "SHIFT_1_TEA1_START_TIME",
    "SHIFT_1_TEA1_END_TIME",
    "SHIFT_2_TEA1_START_TIME",
    "SHIFT_2_TEA1_END_TIME",
    "SHIFT_1_TEA2_START_TIME",
    "SHIFT_1_TEA2_END_TIME",
    "SHIFT_2_TEA2_START_TIME",
    "SHIFT_2_TEA2_END_TIME",
    "createdAt",
  ],
  OPERATOR_ANALYSIS :[
    "SHIFT",
    "MACHINE_NAME",
    "OPERATOR"
  ]
};
