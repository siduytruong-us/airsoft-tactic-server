package com.airsoft.tactic.config

import org.springframework.boot.context.properties.ConfigurationProperties
import org.springframework.context.annotation.Configuration

@Configuration
@ConfigurationProperties(prefix = "supabase")
class SupabaseConfig {
    var url: String = ""

    // New key format
    var publishableKey: String = ""
    var secretKey: String = ""

    // Legacy keys
    var anonKey: String = ""
    var serviceRoleKey: String = ""

    // JWT validation
    var jwtSecret: String = ""
}
