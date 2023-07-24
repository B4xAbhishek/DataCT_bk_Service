export const ErrorCodes = {
  // 10XX - Common errors
  1001: {
    message: 'Missing mandatory input params',
    errorCode: 1001,
    statusCode: 400,
  },
  1002: {
    message: 'Failed to Find Data',
    errorCode: 1002,
    statusCode: 400,
  },
  1003: {
    message: 'Failed to Update Data',
    errorCode: 1003,
    statusCode: 400,
  },
  1004: {
    message: 'Failed to Delete Data',
    errorCode: 1004,
    statusCode: 400,
  },
  1005: {
    message: 'Failed to Add Data',
    errorCode: 1005,
    statusCode: 400,
  },
  1006: {
    message: 'Upload file error',
    errorCode: 1006,
    statusCode: 400,
  },
  1007: {
    message: 'Duplicate data',
    errorCode: 1007,
    statusCode: 400,
  },
  1008: {
    message: 'File Validation Failed',
    errorCode: 1008,
    statusCode: 400,
  },
}

export class ResponseObj {
  public status: number
  public message: string
  public data: any

  constructor(status: number, message: string, data: any) {
    this.status = status
    this.message = message
    this.data = data
  }

  public toJson() {
    return { status: this.status, message: this.message, data: this.data }
  }

  public toJsonString() {
    return JSON.stringify({
      status: this.status,
      message: this.message,
      data: this.data,
    })
  }
}
