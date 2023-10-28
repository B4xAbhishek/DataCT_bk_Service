import { Document, Schema, Model, model, Mongoose } from "mongoose";
import bcrypt from "bcryptjs";
import { findJsonInJsonArray, addJson } from "../utils/helper";
import { config } from "../config/config";

const saltRounds = 13;

export enum ROLE {
  ADMIN = "ADMIN",
  USER = "USER",
  DISPLAY = "DISPLAY"
}

export interface IUser {
  name: string;
  userId: string;
  phone: string;
  password: string;
  role: string;
  createdAt?: Date;
  lastUpdatedAt: Date;
}

export interface IUserModel extends IUser, Document { }

export const UserSchema: Schema = new Schema(
  {
    name: String,
    phone: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: String,
      lowercase: true,
      index: true,
      required: true,
      unique: true
    },
    role: {
      type: String,
      enum: [ROLE.ADMIN, ROLE.USER, ROLE.DISPLAY],
      default: ROLE.USER
    },
    password: String,
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    lastUpdatedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    usePushEach: true,
    bufferCommands: false,
    versionKey: false
  }
);

UserSchema.set("toObject", { virtuals: true });
UserSchema.set("toJSON", { virtuals: true });

export const UserModel: Model<IUserModel> = model<IUserModel>(
  "users",
  UserSchema
);

var outcome = findJsonInJsonArray(config.dynamicModels, "users", "name");
if (!outcome) {
  let obj: any = {};
  addJson(obj, "name", "users");
  addJson(obj, "model", UserModel)
  config.dynamicModels.push(obj);
}

// Return a salted password the same way that is done for the database.
export var createSaltedPassword = function (
  password: string,
  callback: Function
) {
  if (password) {
    bcrypt.genSalt(saltRounds, function (err, salt) {
      bcrypt.hash(password, salt, function (err1, hash) {
        callback(err1, hash);
      });
    });
  }
};

export var compareSaltedPassword = function (
  password: string,
  hash: string,
  callback: Function
) {
  bcrypt.compare(password, hash, function (err, isMatch) {
    callback(err, isMatch);
  });
};

export var findByUserId = function (userId: string, cb: Function) {
  UserModel.findOne({ userId }, function (err, User) {
    cb(err, User);
  });
};

export var findById = function (id: Schema.Types.ObjectId, cb: Function) {
  UserModel.findById(id).exec(function (err, User) {
    cb(err, User);
  });
};

export var createUser = function (UserObj: any, cb: Function) {
  createSaltedPassword(UserObj.password, function (err, hashedPassword) {
    if (err) {
      console.log(err);
      return;
    }
    UserObj.password = hashedPassword;
    UserModel.insertMany([UserObj], {}, function (err, User) {
      cb(err, User);
    });
  });
};

export var updateUserById = async function (id: any, data: any, cb: Function) {
  if (data.password) {
  const password = await new Promise(function (resolve, reject) {
      createSaltedPassword(data.password, function (err, hashedPassword) {
        if (err) {
          reject(undefined);
        }
        resolve(hashedPassword);
      });
    });
    data.password = password;
  }

  data.lastUpdatedAt = Date.now();

  UserModel.updateOne(
    { _id: id },
    { $set: data },
    { upsert: false },
    function (err, User) {
      cb(err);
    }
  );
};

export var deleteUser = (UserId: string, cb: Function) => {
  UserModel.deleteOne({ userId: UserId }, (err) => {
    cb(err);
  });
};

export var find = (query: any, projection: any, options: any,cb: Function) => {
  UserModel.find(query, projection, options, (err, data) => {
    cb(err, data);
  });
};