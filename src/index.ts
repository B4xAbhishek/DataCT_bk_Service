import express from 'express'
import helmet from "helmet";
import { Request, Response, NextFunction } from 'express'
import { config } from './config/config'
import * as http from 'http'
import passport from 'passport'
import BearerStrategy from 'passport-http-bearer'
import * as Token from './models/accesstoken'
import * as Users from './models/users'
import path from 'path'
import * as logger from './models/logs'
import { ResponseObj } from './models/models'
import errorhandler from 'errorhandler'
import { DB } from './models/db'
import crypto from 'crypto'
import mime from 'mime-types';
var cors = require('cors')
var expressValidator = require('express-validator')
require('dotenv').config()
let fs = require('fs')

const app = express()
const server = http.createServer(app)
const db = new DB()
const port = config.port || 8000
const mongodbURI: string = config.mongodbURI
const LABEL = config.serviceName

app.set('port', port)
app.use(express.json({ limit: '100mb' }))
app.use(express.urlencoded({ extended: true, limit: '100mb' }))

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString("hex");
  next();
});
// app.use(
//   helmet.contentSecurityPolicy({
//     // directives: {
//     //   scriptSrc: ["'self'", (req, res:any) => `'nonce-${res.locals.cspNonce}'`],
//     // },
//     reportOnly: true,
//   })
// );
app.use(helmet({
  contentSecurityPolicy: {
    reportOnly: true,
  },
}));

//Reports generation
app.set('view engine', 'ejs')
var dir = './reports/temp/.empty'
var dir1 = './reports/pdf/.empty'
var dir2 = './reports/excel/.empty'
try {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  if (!fs.existsSync(dir1)) {
    fs.mkdirSync(dir1, { recursive: true })
  }
  if (!fs.existsSync(dir2)) {
    fs.mkdirSync(dir2, { recursive: true })
  }
} catch {
  logger.error(
    logger.DEFAULT_MODULE,
    null,
    'Temp and pdf folder in reports generation failed',
  )
}

//Express Validator
app.use(
  expressValidator({
    errorFormatter: function (param, msg, value) {
      var namespace = param.split('.'),
        root = namespace.shift(),
        formParam = root

      while (namespace.length) {
        formParam += '[' + namespace.shift() + ']'
      }
      return {
        param: formParam,
        msg: msg,
        value: value,
      }
    },
  }),
)

// development only
if ('development' === app.get('env')) {
  logger.info(
    logger.DEFAULT_MODULE,
    null,
    'Running in Development Environment .',
  )
  app.use(errorhandler())
}

app.use(passport.initialize())

// Bring in the database!
db.connectWithRetry(mongodbURI)

// passport strategy
passport.use(
  new BearerStrategy.Strategy(function (token, done) {
    //logger.debug("Passport Token: " + token);
    console.log('token', token)

    Token.findByToken(token, function (err: Error, tokenFromDb: any) {

      if (err) {
        let responseObj = new ResponseObj(401, 'Unauthorized', undefined)
        return done(err, false, responseObj.toJsonString())
      }
      if (!tokenFromDb) {
        let responseObj = new ResponseObj(401, 'Unauthorized', undefined)
        return done(null, false, responseObj.toJsonString())
      }
      Users.findById(tokenFromDb.userId, function (err: Error, user: any) {
        if (err) {
          let responseObj = new ResponseObj(401, 'Unauthorized!', undefined)
          return done(err, false, responseObj.toJsonString())
        }
        if (!user) {
          let responseObj = new ResponseObj(401, 'Unauthorized!', undefined)
          return done(null, false, responseObj.toJsonString())
        }
        return done(null, user, { scope: 'all', message: LABEL })
      })
    })
  }),
)

//allow requests from any host
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Origin', '*')
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, Authorization, X-Requested-With, Content-Type, Accept',
  )
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  next()
})

var corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: [
    'Origin',
    'Authorization',
    'X-Requested-With',
    'Content-Type',
    'Accept',
  ],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))

// import cron jobs
// require("./utils/scheduler");

//Routes
app.use('/v1/', require('./routes/v1/index'))
app.use('/v1/auth', require('./routes/v1/auth'))
app.use('/v1/user', require('./routes/v1/user'))
app.use('/v1/dashboard', require('./routes/v1/dashboard'))

/*CRUD*/
app.use('/v1/add', require('./routes/v1/add'))
app.use('/v1/update', require('./routes/v1/update'))
app.use('/v1/delete', require('./routes/v1/delete'))
app.use('/v1/find', require('./routes/v1/find'))
app.use('/v1/filter', require('./routes/v1/filter'))
app.use('/v1/generate', require('./routes/v1/generate'))
app.use(
  '/v1/download/:type/:filename',
  passport.authenticate('bearer', { session: false }),
  (req: any, res: Response, next: NextFunction) => {
    console.log('reached')

    console.log('reached here', req.user)

    res.sendFile(
      path.join(
        process.cwd() +
        '/reports/' +
        req.params.type +
        '/' +
        req.params.filename,
      ),
    )
  },
)

//server static files
app.use(express.static(path.join(process.cwd(), '/reports/pdf')))
app.use(express.static(path.join(process.cwd(), '/reports')))
app.use(express.static(path.join(__dirname, '../views')))
// app.use(express.static("public"));
// app.use(express.static("public"));
// app.use(express.static("public"));
app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (req, res) => {
  // console.log('mime', mime.lookup(req.url), req.url)
  res.sendFile(path.join(__dirname + '/../public/index.html'))
})

// START THE SERVER
server.listen(port, () => {
  console.log(LABEL + ' is running on port ' + port)
})

//catch 404 and forward to error handler
app.use(function (req: Request, res: Response, next: NextFunction) {
  res.status(404).send('Page/Api Not Found')
  return
})

process.on('SIGINT', function () {
  process.exit(0)
})

process.on('SIGTERM', function () {
  process.exit(0)
})

module.exports = app
