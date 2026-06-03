package com.airsoft.tactic.exception

import org.springframework.http.HttpStatus

class AppException(
    val httpStatus: HttpStatus,
    val code: String,
    message: String
) : RuntimeException(message) {

    companion object {
        fun notFound(message: String): AppException {
            return AppException(HttpStatus.NOT_FOUND, "NOT_FOUND", message)
        }

        fun conflict(code: String, message: String): AppException {
            return AppException(HttpStatus.CONFLICT, code, message)
        }

        fun unprocessable(code: String, message: String): AppException {
            return AppException(HttpStatus.UNPROCESSABLE_ENTITY, code, message)
        }

        fun forbidden(message: String): AppException {
            return AppException(HttpStatus.FORBIDDEN, "INSUFFICIENT_ROLE", message)
        }

        fun unauthorized(code: String, message: String): AppException {
            return AppException(HttpStatus.UNAUTHORIZED, code, message)
        }
    }
}
