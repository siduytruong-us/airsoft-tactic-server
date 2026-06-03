package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.response.FieldResponse
import com.airsoft.tactic.dto.response.PageResponse
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.service.FieldService
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/v1/fields")
class FieldController(private val fieldService: FieldService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int
    ): ResponseEntity<ApiResponse<PageResponse<FieldResponse>>> {
        return ResponseEntity.ok(
            ApiResponse.ok(
                fieldService.listFields(PageRequest.of(page, size, Sort.by("name")))
            )
        )
    }

    @GetMapping("/{fieldId}")
    fun get(
        @PathVariable fieldId: UUID,
        auth: Authentication?
    ): ResponseEntity<ApiResponse<FieldResponse>> {
        val userId = auth?.let { UUID.fromString(it.name) }
        return ResponseEntity.ok(ApiResponse.ok(fieldService.getField(fieldId, userId)))
    }
}
