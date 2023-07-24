import express, { NextFunction } from 'express'
import passport from 'passport'
import { entryPoint } from '../../middlewares/entryPoint'
import { exitPoint } from '../../middlewares/exitPoint'
import * as GenricMethods from '../../controllers/genricMethods'
import multer from 'multer'
import CSVtoJSON from 'csvtojson'
import { nextTick } from 'process'
import { ErrorCodes } from '../../models/models'
import { isAdmin } from '../../middlewares/adminCheck'

let router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
})

export const convert = async (req: any, res: any, next: NextFunction) => {
  // console.log('req.files',req.files);
  try {

    if (req.files && req.files.length > 0) {
      if (req.files[0].mimetype != 'text/csv') {
        req.skip = true
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1006],
          customMsg: 'only .csv file is supported',
          data: {},
        }
        next()
        return
      } else if (req.files[0].size > 1000000 * 100) {
        req.skip = true
        req.apiStatus = {
          isSuccess: false,
          error: ErrorCodes[1006],
          customMsg: 'file size is too large.',
          data: {},
        }
        next()
        return
      } else {
        const csvfile = req.files[0].buffer
        const toString = csvfile.toString()
        var convertedData: any = []
        await CSVtoJSON()
          .fromString(toString) //fromString is to modified
          .then((response) => {
            convertedData = response
          })
        req.convertedData = convertedData

        console.log('req.converted', req.convertedData)

        if (!req.convertedData || !req.convertedData.length) {
          req.skip = true
          req.apiStatus = {
            isSuccess: false,
            error: ErrorCodes[1006],
            customMsg: 'Invalid data',
            data: {},
          }
          next()
          return
        }

        req.apiStatus = {
          isSuccess: true,
          customMsg: 'Added complete',
          data: {},
        }
        next()
      }
      // return;
    } else {
      req.skip = true
      req.apiStatus = {
        isSuccess: false,
        error: ErrorCodes[1006],
        customMsg: 'Failed',
        data: {},
      }
      next()
      return
    }
  } catch (ex) {
    console.log('File upload exception', ex);
    req.skip = true
    req.apiStatus = {
      isSuccess: false,
      error: ErrorCodes[1002],
      customMsg: 'Failed',
      data: {},
    }
    next()
  }
}

/* =========== GNERIC CRUD APIs ============== */

router.post(
  '/addRecord/:collectionName',
  entryPoint,
  passport.authenticate('bearer', { session: false }),
  isAdmin,
  GenricMethods.createRecord,
  exitPoint,
)

router.put(
  '/updateRecord/:collectionName/:id',
  entryPoint,
  passport.authenticate('bearer', { session: false }),
  isAdmin,
  GenricMethods.updateRecord,
  exitPoint,
)

router.post(
  '/getRecords/:collectionName',
  entryPoint,
  passport.authenticate('bearer', { session: false }),
  isAdmin,
  GenricMethods.getRecords,
  exitPoint,
)

router.delete(
  '/deleteRecord/:collectionName/:id',
  entryPoint,
  passport.authenticate('bearer', { session: false }),
  isAdmin,
  GenricMethods.deleteRecord,
  exitPoint,
)

//BreakDown collection APi's///

router.post(
  '/addBreakRecord/:collectionName',
  entryPoint,
  passport.authenticate("bearer", { session: false }),
  isAdmin,
  upload.any(),
  convert,
  GenricMethods.validateCsvRecords,
  GenricMethods.addCsvRecords,
  exitPoint,
)

module.exports = router
