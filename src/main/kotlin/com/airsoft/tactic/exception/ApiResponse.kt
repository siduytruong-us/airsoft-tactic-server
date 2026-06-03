package com.airsoft.tactic.exception

import com.fasterxml.jackson.annotation.JsonInclude
import java.time.Instant

@JsonInclude(JsonInclude.Include.NON_NULL)
data class ApiResponse<T>(
    val data: T? = null,
    val status: Int,
    val code: String? = null,
    val message: String? = null,
    val path: String? = null,
    val timestamp: Instant = Instant.now()
) {
    companion object {
        fun <T> ok(data: T): ApiResponse<T> {
            return ApiResponse(data = data, status = 200)
        }

        fun <T> created(data: T): ApiResponse<T> {
            return ApiResponse(data = data, status = 201)
        }

        fun <T> error(status: Int, code: String?, message: String?, path: String?): ApiResponse<T> {
            return ApiResponse(status = status, code = code, message = message, path = path)
        }
    }
}
