package com.airsoft.tactic.admin.dto

import jakarta.validation.constraints.NotBlank

data class CreateFieldRequest(
    @field:NotBlank val name: String,
    @field:NotBlank val location: String,
    val lat: Double? = null,
    val lng: Double? = null,
    val coverImageUrl: String? = null,
    val description: String? = null
)
