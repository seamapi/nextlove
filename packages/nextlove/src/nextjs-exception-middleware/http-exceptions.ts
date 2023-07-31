export type HttpExceptionMetadata = {
  type: string
  message: string
  data?: Record<string, unknown>
} & Record<string, unknown>

export interface ThrowingOptions {
  json?: boolean
}

/**
 * Throw HttpExceptions inside API endpoints to generate nice error messages
 *
 * @example
 * ```
 * if (bad_soups.includes(soup_param)) {
 *   throw new HttpException(400, {
 *      type: "cant_make_soup",
 *      message: "Soup was too difficult, please specify a different soup"
 *    })
 * }
 * ```
 *
 **/
export class HttpException extends Error {
  options: ThrowingOptions

  constructor(
    public status: number,
    public metadata: HttpExceptionMetadata,
    options?: ThrowingOptions
  ) {
    super(metadata.message)

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }

    this.options = options ?? { json: true }
  }

  toString() {
    return `HttpException: ${this.status}, ${this.metadata.message} (${this.metadata.type})`
  }
}

/**
 * Throw BadRequestException inside API endpoints that were provided incorrect
 * parameters or body
 *
 * @example
 * ```
 * if (bad_soups.includes(soup_param)) {
 *   throw new BadRequestException({
 *     type: "cant_make_soup",
 *     message: "Soup was too difficult, please specify a different soup",
 *   })
 * }
 * ```
 *
 **/
export class BadRequestException extends HttpException {
  constructor(
    public metadata: HttpExceptionMetadata,
    options?: ThrowingOptions
  ) {
    super(400, metadata, options)
  }
}

export class UnauthorizedException extends HttpException {
  constructor(
    public metadata: HttpExceptionMetadata,
    options?: ThrowingOptions
  ) {
    super(401, metadata, options)
  }
}

export class NotFoundException extends HttpException {
  constructor(
    public metadata: HttpExceptionMetadata,
    options?: ThrowingOptions
  ) {
    super(404, metadata, options)
  }
}

export class MethodNotAllowedException extends HttpException {
  constructor(
    public metadata: HttpExceptionMetadata,
    options?: ThrowingOptions
  ) {
    super(405, metadata, options)
  }
}

export class InternalServerErrorException extends HttpException {
  constructor(
    public metadata: HttpExceptionMetadata,
    options?: ThrowingOptions
  ) {
    super(500, metadata, options)
  }
}
