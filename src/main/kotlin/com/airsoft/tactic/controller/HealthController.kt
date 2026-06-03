package com.airsoft.tactic.controller

import com.airsoft.tactic.service.HealthService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/api/v1")
class HealthController(private val healthService: HealthService) {

    @GetMapping("/health")
    fun health(): ResponseEntity<*> {
        return ResponseEntity.ok(healthService.health)
    }
}
