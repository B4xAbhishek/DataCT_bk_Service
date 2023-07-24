import express from "express";
let router = express.Router();
import passport from "passport";
import jwt from "jsonwebtoken";
import moment from "moment";
import { ResponseObj } from "../../models/models";
import * as logger from "../../models/logs";
import * as Users from "../../models/users";
import * as AccessToken from "../../models/accesstoken";
import * as RefreshToken from "../../models/refreshtoken";
const jwtSecret = "J434dgeBPTsd5GsdGORD91C";
const JWT_ALGORITHM = "RS256";

router.post("/login", function (req: any, res: any) {
  if (req.body && req.body.username && req.body.password) {
    var username = req.body.username;
    var password = req.body.password;

    Users.findByUserId(username, function (err: Error, user: any) {
      if (err || !user) {
        logger.warn(
          logger.LogModule.AUTH,
          req.txId,
          "User not found: " + username
        );

        let responseObj = new ResponseObj(400, "Invalid Credentials!", undefined);
        res.status(responseObj.status).json(responseObj);
        return;
      } else {
        Users.compareSaltedPassword(
          password,
          user.password,
          function (pwdErr: Error, isMatch: boolean) {
            if (isMatch) {
              let userJson: any = JSON.stringify(user);
              userJson = JSON.parse(userJson);

              generateAndSaveAccessToken(
                req,
                userJson,
                function (accessToken: string, expiresAt: Date) {
                  if (!accessToken || !expiresAt) {
                    logger.error(
                      logger.LogModule.AUTH,
                      req.txId,
                      "AccessToken generation failure"
                    );
                    let responseObj = new ResponseObj(
                      500,
                      "Internal Error",
                      null
                    );
                    res.status(responseObj.status).json(responseObj);
                    return;
                  }
                  generateAndSaveRefreshToken(
                    req,
                    userJson,
                    function (refreshToken: string, refreshExpiresAt: Date) {
                      if (!refreshToken || !expiresAt) {
                        logger.error(
                          logger.LogModule.AUTH,
                          req.txId,
                          "RefreshToken generation failure"
                        );
                        let responseObj = new ResponseObj(
                          500,
                          "Internal Error",
                          null
                        );
                        res.status(responseObj.status).json(responseObj);
                        return;
                      }
                      delete userJson.password;
                      //delete userJson._id;
                      delete userJson.isEnabled;
                      delete userJson.__v;
                      userJson.access_token = accessToken;
                      userJson.refresh_token = refreshToken;
                      userJson.tokenExpiresAt = expiresAt;

                      let responseObj = new ResponseObj(
                        200,
                        "Success",
                        userJson
                      );
                      res.status(responseObj.status).json(responseObj);
                    }
                  );
                }
              );
            } else {
              logger.error(
                logger.LogModule.AUTH,
                req.txId,
                "Incorrect Password for: + " + username
              );

              let responseObj = new ResponseObj(
                400,
                "Invalid Credentials!",
                undefined
              );
              res.status(responseObj.status).json(responseObj);
            }
          }
        );
      }
    });
  } else {
    logger.warn(logger.LogModule.AUTH, req.txId, "Request body missing");
    let responseObj = new ResponseObj(400, "Missing request body", undefined);
    res.status(responseObj.status).json(responseObj);
  }
});

router.post("/refresh", function (req: any, res: any) {
  let refresh_token = req.body.refresh_token;
  //let refreshingUser = null;

  if (!refresh_token) {
    let responseObj = new ResponseObj(400, "missing refresh token", undefined);
    return res.status(responseObj.status).json(responseObj);
  }

  RefreshToken.findByToken(refresh_token, function (err, tokenFromDb) {
    if (err) {
      let responseObj = new ResponseObj(401, "Unauthorized", null);
      return res.status(responseObj.status).json(responseObj);
    }
    if (!tokenFromDb) {
      let responseObj = new ResponseObj(401, "Unauthorized", null);
      return res.status(responseObj.status).json(responseObj);
    }

    Users.findById(tokenFromDb.userId, function (err, user) {
      if (err) {
        let responseObj = new ResponseObj(401, "Unauthorized", null);
        return res.status(responseObj.status).json(responseObj);
      }
      if (!user) {
        let responseObj = new ResponseObj(401, "Unauthorized", null);
        return res.status(responseObj.status).json(responseObj);
      }
      //refreshingUser = user;

      //const user = refreshingUser;
      //console.log(user);
      let userJson: any = JSON.stringify(user);
      userJson = JSON.parse(userJson);

      generateAndSaveAccessToken(req, userJson, function (token, expiresAt) {
        if (!token || !expiresAt) {
          console.log("Access Token generation failed");
          let responseObj = new ResponseObj(401, "Internal server error", null);
          return res.status(responseObj.status).json(responseObj);
        }
        delete userJson.password;
        delete userJson.password2;
        delete userJson._id;
        delete userJson.id;
        userJson.access_token = token;
        userJson.tokenExpiresAt = expiresAt;

        let responseObj = new ResponseObj(200, "Refresh Success", userJson);
        return res.status(responseObj.status).json(responseObj);
      });
    });
  });
});

router.post(
  "/logout",
  passport.authenticate("bearer", { session: false }),
  function (req: any, res: any) {
    const user = req.user;
    let userJson: any = JSON.stringify(user);
    userJson = JSON.parse(userJson);

    let responseObj = new ResponseObj(200, "Success", null);
    res.status(responseObj.status).json(responseObj);

    deleteAccessToken(req, userJson);
    deleteRefreshToken(req, userJson);
  }
);

router.get(
  "/user",
  passport.authenticate("bearer", { session: false }),
  function (req: any, res: any) {
    const user = req.user;
    let userJson: any = JSON.stringify(user);
    userJson = JSON.parse(userJson);
    delete userJson.password;

    let responseObj = new ResponseObj(200, "Success", userJson);
    res.status(responseObj.status).json(responseObj);
  }
);

/************** Helper Functions ******************/
function generateAndSaveAccessToken(req: any, user: any, cb: Function) {
  let token = jwt.sign({ email: user.email }, privateKey, {
    algorithm: JWT_ALGORITHM,
    expiresIn: AccessToken.TOKEN_EXPIRY * 60
  });

  AccessToken.updateToken(token, user._id, function (err: Error, result: any) {
    if (err || !result) {
      logger.error(
        logger.LogModule.AUTH,
        req.txId,
        "Error saving token: " + err
      );
      cb(null, null);
    } else {
      logger.verbose(
        logger.LogModule.AUTH,
        req.txId,
        "Access Token details: " + result
      );
      let expiresAt = moment(result.createdAt)
        .add(AccessToken.TOKEN_EXPIRY, "m")
        .utc();
      cb(token, expiresAt);
    }
  });
}

function generateAndSaveRefreshToken(req: any, user: any, cb: Function) {
  let token = jwt.sign({ email: user.email }, privateKey, {
    algorithm: JWT_ALGORITHM,
    expiresIn: RefreshToken.TOKEN_EXPIRY * 60
  });

  RefreshToken.updateToken(token, user._id, function (err: Error, result: any) {
    if (err || !result) {
      logger.error(
        logger.LogModule.AUTH,
        req.txId,
        "Error saving token: " + err
      );
      cb(null, null);
    } else {
      logger.verbose(
        logger.LogModule.AUTH,
        req.txId,
        "Refresh Token details: " + result
      );
      let expiresAt = moment(result.createdAt)
        .add(RefreshToken.TOKEN_EXPIRY, "m")
        .utc();
      cb(token, expiresAt);
    }
  });
}

function deleteAccessToken(req: any, user: any) {
  AccessToken.deleteToken(user._id, function (err: Error) {
    if (err) {
      logger.error(
        logger.LogModule.AUTH,
        req.txId,
        "Error deleting token: " + err
      );
    }
  });
}

function deleteRefreshToken(req: any, user: any) {
  RefreshToken.deleteToken(user._id, function (err: Error) {
    if (err) {
      logger.error(
        logger.LogModule.AUTH,
        req.txId,
        "Error deleting token: " + err
      );
    }
  });
}

const privateKey="-----BEGIN PRIVATE KEY-----\n\
MIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAMvgZzOS4rr50Zr1\
moca84/BirC8l9k9I2WCgvt+trWAglqNQ+6Z/fLZwU3OtceHVgJBOvHA7sLoEja3\
9QB54vF+5gYJfygUcxG/0zeGl5e+tzYYq4SwvlyZplmWbmqBvgSBWm66LsvlF0B1\
7WyiplUJtxglDY0CdiuIdBb+3zejAgMBAAECgYAuw/3IRcQ+cXmUGwxkO1ltO08N\
9WS7jxukeEiFWe6dOaotDURs4ePvpeWCbI0kBLZE9COKOuBJ0yQCazYG8u6MX6HC\
ZPFIbnlgWbbTMunRVj3fSDU42hnFOYZny2xShfcY7DxybDKiLgA4CgPV/nqcWLKm\
Yc3fG4a13MyGhPD42QJBAPXCRzqgBsForUhe6qF44HW3D5HK6WxzwpPavsrvRQR+\
0fevKB5anYQw7oJj8/TCionL4LUTRqJgmzDrFKb3CkcCQQDUX1R/9rntXMy8IU0w\
XyrPbPDvQf7ZGVkAB1rNVXW51926BpM/BMsJT8xeyf6xl4UrJcL3ivTd5io55dR1\
cbnFAkEAo76IWwVYuvEV08x6JJA3bfdExm0eTgZrNLxgtzHpGG+vUoo//sl9fiBk\
KjiSyRf92oYe+EcZnwMjI9rd7clX7QJAMW1iiEnPKhxgFiUWBv0PRKmRRc4xVyvc\
F/KeQo3yUWeZVlNzb8ZYzvkAkssmeQTP3KP0RZLUvNR13XXNRexLFQJABQwjYqd+\
CD/Z5zNknnhmFxjaqEn7GRwkwKxiSrAsNwxS6hMO1JnJ6Ubnj6qoXmmBGtnj7xdJ\
Rs2skXW2/TYDBQ==\n\
-----END PRIVATE KEY-----";

module.exports = router;