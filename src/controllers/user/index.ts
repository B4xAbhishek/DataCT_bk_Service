import * as Users from "../../models/users";
import { Request, Response, NextFunction } from "express";
import { ErrorCodes } from "../../models/models";

export function addUser(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  req.checkBody("name", "name is required").notEmpty();
  req.checkBody("userId", "userId is required").notEmpty();
  req.checkBody("password", "password is required").notEmpty();
  req.checkBody("role", "role is required").notEmpty();
  req.checkBody("phone", "phone is required").notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  let userObj: Users.IUserModel = new Users.UserModel(
    req.body
  );

  Users.createUser(userObj, (err: any, responseList: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true,
      data: responseList,
    };

    next();
  });
}

export async function updateUser(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let id = req.params.id;
  let data: any = req.body;

  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  Users.updateUserById(id, data, (err: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true
    };

    next();
  });
}

export function deleteUser(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  req.checkBody("userId", "userId is required").notEmpty();

  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  let userId = req.body.userId;

  Users.deleteUser(userId, (err: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1003],
        data: err,
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true
    };

    next();
  });
}

export function findAllUsers(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }

  Users.find({},{},{},(err: any, result: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: err
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true,
      data: result
    };

    next();
  });
}

export function findOneUser(
  req: Request | any,
  res: Response,
  next: NextFunction
) {
  let id = req.params.id;
  var errors = req.validationErrors();

  if (errors) {
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1001],
      data: errors,
    };
    next();
    return;
  }
  
  Users.findById(id,(err: any, result: any) => {
    if (err) {
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1002],
        data: err
      };
      next();
      return;
    }

    req.apiStatus = {
      isSuccess: true,
      data: result
    };

    next();
  });
}