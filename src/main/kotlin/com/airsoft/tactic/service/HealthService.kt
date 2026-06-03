package com.airsoft.tactic.service

import com.airsoft.tactic.config.SupabaseConfig
import org.springframework.stereotype.Service
import java.time.Instant

@Service
class HealthService(private val supabaseConfig: SupabaseConfig) {

    val health: Map<String, Any>
        get() {
            val health = LinkedHashMap<String, Any>()
            health["status"] = "UP"
            health["timestamp"] = Instant.now().toString()
            health["service"] = "airsoft-tactic-server"
            health["supabase_url"] = supabaseConfig.url
            return health
        }
}
