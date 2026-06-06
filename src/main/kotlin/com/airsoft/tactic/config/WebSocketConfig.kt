package com.airsoft.tactic.config

import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.ChannelRegistration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
class WebSocketConfig : WebSocketMessageBrokerConfigurer {

    override fun configureMessageBroker(config: MessageBrokerRegistry) {
        config.enableSimpleBroker("/topic")
        config.setApplicationDestinationPrefixes("/app")
    }

    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        // SockJS removed — native mobile clients use plain WebSocket directly.
        registry.addEndpoint("/ws")
            .setAllowedOriginPatterns("*")
    }

    /**
     * Tăng thread pool cho STOMP inbound channel.
     * Default = 1 thread → tất cả LOCATION_UPDATE/PING xếp hàng qua 1 thread → stuck.
     * corePoolSize=4: xử lý 4 message song song.
     * maxPoolSize=16: burst lên 16 nếu queue đầy.
     */
    override fun configureClientInboundChannel(registration: ChannelRegistration) {
        registration.taskExecutor()
            .corePoolSize(4)
            .maxPoolSize(16)
            .keepAliveSeconds(60)
    }

    /**
     * Tăng thread pool cho STOMP outbound channel (broadcast tới clients).
     */
    override fun configureClientOutboundChannel(registration: ChannelRegistration) {
        registration.taskExecutor()
            .corePoolSize(4)
            .maxPoolSize(16)
            .keepAliveSeconds(60)
    }
}
