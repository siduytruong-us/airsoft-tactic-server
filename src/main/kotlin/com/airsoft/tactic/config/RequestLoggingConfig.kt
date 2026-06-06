package com.airsoft.tactic.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.filter.CommonsRequestLoggingFilter

@Configuration
class RequestLoggingConfig {

    /**
     * Log mỗi HTTP request: method + URI + query string.
     * Kích hoạt bằng: logging.level.org.springframework.web.filter.CommonsRequestLoggingFilter=DEBUG
     */
    @Bean
    fun requestLoggingFilter(): CommonsRequestLoggingFilter =
        CommonsRequestLoggingFilter().apply {
            setIncludeQueryString(true)
            setIncludeClientInfo(false)   // tắt IP (không cần)
            setIncludeHeaders(false)      // tắt headers (quá verbose)
            setIncludePayload(false)      // tắt body
            setBeforeMessagePrefix("API → ")
            setAfterMessagePrefix("API ← ")
            setAfterMessageSuffix("")
        }
}
