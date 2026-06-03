package com.airsoft.tactic.exception

import jakarta.servlet.http.HttpServletRequest
import org.slf4j.LoggerFactory
import org.springframework.http.ResponseEntity
import org.springframework.validation.FieldError
import org.springframework.web.bind.MethodArgumentNotValidException
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.util.stream.Collectors

@RestControllerAdvice
class GlobalExceptionHandler {

    @ExceptionHandler(AppException::class)
    fun handleApp(ex: AppException, req: HttpServletRequest): ResponseEntity<ApiResponse<Any?>> {
        return ResponseEntity.status(ex.httpStatus)
            .body(
                ApiResponse.error(
                    ex.httpStatus.value(),
                    ex.code,
                    ex.message,
                    req.requestURI
                )
            )
    }

    @ExceptionHandler(MethodArgumentNotValidException::class)
    fun handleValidation(
        ex: MethodArgumentNotValidException,
        req: HttpServletRequest
    ): ResponseEntity<ApiResponse<Any?>> {
        val msg = ex.bindingResult.fieldErrors.stream()
            .map { obj: FieldError -> obj.defaultMessage }
            .collect(Collectors.joining(", "))
        return ResponseEntity.badRequest()
            .body(ApiResponse.error(400, "VALIDATION_ERROR", msg, req.requestURI))
    }

    @ExceptionHandler(Exception::class)
    fun handleGeneral(ex: Exception, req: HttpServletRequest): ResponseEntity<ApiResponse<Any?>> {
        log.error("Unhandled exception", ex)
        return ResponseEntity.internalServerError()
            .body(ApiResponse.error(500, "INTERNAL_ERROR", "Internal server error", req.requestURI))
    }

    companion object {
        private val log = LoggerFactory.getLogger(GlobalExceptionHandler::class.java)
    }
}
