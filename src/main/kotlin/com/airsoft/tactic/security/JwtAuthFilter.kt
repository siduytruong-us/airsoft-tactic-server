package com.airsoft.tactic.security

import com.airsoft.tactic.util.JwtUtil
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken
import org.springframework.security.core.authority.SimpleGrantedAuthority
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.stereotype.Component
import org.springframework.util.StringUtils
import org.springframework.web.filter.OncePerRequestFilter

@Component
class JwtAuthFilter(private val jwtUtil: JwtUtil) : OncePerRequestFilter() {

    override fun doFilterInternal(req: HttpServletRequest, res: HttpServletResponse, chain: FilterChain) {
        val header = req.getHeader("Authorization")
        if (StringUtils.hasText(header) && header.startsWith("Bearer ")) {
            val token = header.substring(7)
            val claims = jwtUtil.validateAndExtract(token)
            if (claims != null) {
                val role = claims["role", String::class.java]
                val auth = UsernamePasswordAuthenticationToken(
                    claims.subject, null,
                    listOf(SimpleGrantedAuthority("ROLE_" + (role?.uppercase() ?: "PLAYER")))
                )
                SecurityContextHolder.getContext().authentication = auth
            }
        }
        chain.doFilter(req, res)
    }
}
