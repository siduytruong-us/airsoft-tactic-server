package com.airsoft.tactic.controller

import com.airsoft.tactic.dto.request.CreateEventRequest
import com.airsoft.tactic.dto.response.EventResponse
import com.airsoft.tactic.dto.response.PageResponse
import com.airsoft.tactic.exception.ApiResponse
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.service.EventService
import jakarta.validation.Valid
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.security.core.Authentication
import org.springframework.web.bind.annotation.DeleteMapping
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.PathVariable
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
@RequestMapping("/v1/events")
class EventController(private val eventService: EventService) {

    @GetMapping
    fun list(
        @RequestParam(defaultValue = "0") page: Int,
        @RequestParam(defaultValue = "20") size: Int,
        auth: Authentication?
    ): ResponseEntity<ApiResponse<PageResponse<EventResponse>>> {
        val userId = auth?.let { UUID.fromString(it.name) }
        return ResponseEntity.ok(
            ApiResponse.ok(
                eventService.listEvents(userId, PageRequest.of(page, size, Sort.by("startTime")))
            )
        )
    }

    @GetMapping("/{eventId}")
    fun get(
        @PathVariable eventId: UUID,
        auth: Authentication?
    ): ResponseEntity<ApiResponse<EventResponse>> {
        val userId = auth?.let { UUID.fromString(it.name) }
        return ResponseEntity.ok(ApiResponse.ok(eventService.getEvent(eventId, userId)))
    }

    @PostMapping
    fun create(
        @Valid @RequestBody req: CreateEventRequest,
        auth: Authentication
    ): ResponseEntity<ApiResponse<EventResponse>> {
        val role = auth.authorities.firstOrNull()?.authority ?: ""
        if (!role.contains("ADMIN")) {
            throw AppException.forbidden("Only admins can create events")
        }
        val userId = UUID.fromString(auth.name)
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.created(eventService.createEvent(userId, req)))
    }

    @PostMapping("/{eventId}/rsvp")
    fun rsvp(@PathVariable eventId: UUID, auth: Authentication): ResponseEntity<ApiResponse<Any?>> {
        eventService.rsvp(eventId, UUID.fromString(auth.name))
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(null))
    }

    @DeleteMapping("/{eventId}/rsvp")
    fun cancelRsvp(@PathVariable eventId: UUID, auth: Authentication): ResponseEntity<Void> {
        eventService.cancelRsvp(eventId, UUID.fromString(auth.name))
        return ResponseEntity.noContent().build()
    }
}