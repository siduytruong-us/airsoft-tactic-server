package com.airsoft.tactic.service

import com.airsoft.tactic.dto.request.CreateEventRequest
import com.airsoft.tactic.dto.response.EventResponse
import com.airsoft.tactic.dto.response.PageResponse
import com.airsoft.tactic.entity.Event
import com.airsoft.tactic.entity.Rsvp
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.*
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class EventService(
    private val eventRepository: EventRepository,
    private val rsvpRepository: RsvpRepository,
    private val userRepository: UserRepository,
    private val fieldRepository: FieldRepository
) {
    fun listEvents(userId: UUID?, pageable: Pageable): PageResponse<EventResponse> =
        PageResponse.from(eventRepository.findAll(pageable).map { toResponse(it, userId) })

    @Transactional(readOnly = true)
    fun getEvent(eventId: UUID, userId: UUID?): EventResponse =
        toResponse(findEvent(eventId), userId)

    @Transactional
    fun createEvent(organizerId: UUID, req: CreateEventRequest): EventResponse {
        val field = fieldRepository.findById(req.fieldId)
            .orElseThrow { AppException.notFound("Field not found") }
        val organizer = userRepository.findById(organizerId)
            .orElseThrow { AppException.notFound("User not found") }
        val event = eventRepository.save(Event(
            title = req.title, description = req.description,
            field = field, organizer = organizer,
            startTime = req.startTime, endTime = req.endTime,
            maxCapacity = req.maxCapacity ?: 40
        ))
        return toResponse(event, organizerId)
    }

    @Transactional
    fun rsvp(eventId: UUID, userId: UUID) {
        val event = findEvent(eventId)
        if (event.status != "upcoming")
            throw AppException.unprocessable("INVALID_STATUS_TRANSITION", "Event is not upcoming")
        if (rsvpRepository.existsByEventIdAndUserId(eventId, userId))
            throw AppException.conflict("ALREADY_EXISTS", "Already RSVPed")
        if (rsvpRepository.countByEventId(eventId) >= event.maxCapacity)
            throw AppException.unprocessable("CAPACITY_FULL", "Event is at full capacity")
        val user = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        rsvpRepository.save(Rsvp(event = event, user = user))
    }

    @Transactional
    fun cancelRsvp(eventId: UUID, userId: UUID) {
        val rsvp = rsvpRepository.findByEventIdAndUserId(eventId, userId)
            ?: throw AppException.notFound("RSVP not found")
        rsvpRepository.delete(rsvp)
    }

    private fun findEvent(id: UUID) = eventRepository.findById(id)
        .orElseThrow { AppException.notFound("Event not found: $id") }

    private fun toResponse(e: Event, userId: UUID?) = EventResponse(
        id = e.id!!, title = e.title, description = e.description,
        fieldId = e.field.id!!, fieldName = e.field.name,
        organizerId = e.organizer.id!!, organizerName = e.organizer.displayName,
        startTime = e.startTime, endTime = e.endTime,
        maxCapacity = e.maxCapacity,
        rsvpCount = rsvpRepository.countByEventId(e.id!!),
        status = e.status,
        isRsvped = userId?.let { rsvpRepository.existsByEventIdAndUserId(e.id!!, it) } ?: false
    )
}
