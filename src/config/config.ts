require("dotenv").config();

export let config = {
  serviceName: process.env.SERVICE_NAME || "BK_SERVICE",
  // mongodbURI: process.env.MONGO_DB_URI || "mongodb://10.10.25.24:27017/maindb",
  mongodbURI: process.env.MONGO_DB_URI || "mongodb://localhost:27017/datact",
  // mongodbURI:  process.env.MONGO_DB_URI || "mongodb://192.168.34.211:27017/maindb",
  // mongodbURI:  process.env.MONGO_DB_URI || "mongodb://192.168.0.192:27017/datact",
  url: process.env.URL || "http://localhost:9600",
  localUrl: process.env.LOCAL_URL || "http://localhost:9600",
  port: process.env.PORT || 9600,
  dashboard_machine_limit: 2,
  dynamicModels: new Array(),
  recordLimit: process.env.RECORD_LIMIT || 10000,
};
