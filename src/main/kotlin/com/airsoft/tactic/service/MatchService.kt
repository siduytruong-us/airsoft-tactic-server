package com.airsoft.tactic.service

import com.airsoft.tactic.dto.request.CreateMatchRequest
import com.airsoft.tactic.dto.request.EndMatchRequest
import com.airsoft.tactic.dto.request.PingRequest
import com.airsoft.tactic.dto.response.*
import com.airsoft.tactic.entity.*
import com.airsoft.tactic.exception.AppException
import com.airsoft.tactic.repository.*
import com.airsoft.tactic.websocket.MatchEventPublisher
import org.springframework.data.domain.Pageable
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Instant
import java.util.UUID

@Service
class MatchService(
    private val matchRepository: GameMatchRepository,
    private val teamRepository: TeamRepository,
    private val matchPlayerRepository: MatchPlayerRepository,
    private val hitEventRepository: HitEventRepository,
    private val pingEventRepository: PingEventRepository,
    private val statsRepository: PlayerStatsRepository,
    private val fieldRepository: FieldRepository,
    private val gameModeRepository: GameModeRepository,
    private val userRepository: UserRepository,
    private val adminAccountRepository: AdminAccountRepository,
    private val eventPublisher: MatchEventPublisher
) {
    @Transactional
    fun createMatch(creatorId: UUID, req: CreateMatchRequest): MatchResponse {
        val field   = fieldRepository.findById(req.fieldId).orElseThrow { AppException.notFound("Field not found") }
        val gm      = gameModeRepository.findById(req.gameModeId).orElseThrow { AppException.notFound("GameMode not found") }
        
        // Match creation is restricted to admins now, so we only look in admin_accounts
        val adminAccount = adminAccountRepository.findById(creatorId).orElseThrow { AppException.notFound("Admin not found") }
        
        val match = matchRepository.save(
            GameMatch(
                field = field, 
                gameMode = gm, 
                createdById = adminAccount.id!!, 
                createdByDisplayName = adminAccount.displayName,
                maxPlayers = gm.maxPlayers
            )
        )

        val names  = listOf("Alpha","Bravo","Charlie","Delta","Echo","Foxtrot")
        val colors = listOf("#3B82F6","#EF4444","#22C55E","#F59E0B","#8B5CF6","#EC4899")
        val teams  = (0 until gm.teamCount).map { i ->
            teamRepository.save(Team(match = match, name = names[i % names.size],
                colorHex = colors[i % colors.size], respawnBase = "${names[i % names.size]} Base"))
        }
        return toDetail(match, teams, creatorId)
    }

    fun getMatch(matchId: UUID, userId: UUID?): MatchResponse {
        val match = findMatch(matchId)
        return toDetail(match, teamRepository.findByMatchId(matchId), userId)
    }

    fun getActiveMatch(userId: UUID): MatchResponse? =
        matchRepository.findActiveMatchForUser(userId).firstOrNull()?.let { getMatch(it.id!!, userId) }

    @Transactional
    fun joinTeam(matchId: UUID, teamId: UUID, userId: UUID): Map<String, Any> {
        val match = findMatch(matchId)
        if (match.status != "WAITING") throw AppException.unprocessable("MATCH_NOT_JOINABLE", "Cannot join: status is ${match.status}")
        if (matchPlayerRepository.existsByMatchIdAndUserId(matchId, userId)) throw AppException.conflict("ALREADY_EXISTS", "Already in a team")
        if (!teamRepository.existsByIdAndMatchId(teamId, matchId)) throw AppException.notFound("Team not found in match")
        if (matchPlayerRepository.countByMatchId(matchId) >= match.maxPlayers) throw AppException.unprocessable("CAPACITY_FULL", "Match full")

        val user = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        val team = teamRepository.findById(teamId).orElseThrow { AppException.notFound("Team not found") }
        val mp   = matchPlayerRepository.save(MatchPlayer(match = match, team = team, user = user))

        eventPublisher.playerJoined(matchId, teamId, user, mp.joinedAt)
        return mapOf("matchId" to matchId, "teamId" to teamId, "userId" to userId, "joinedAt" to (mp.joinedAt ?: Instant.now()))
    }

    @Transactional
    fun leaveMatch(matchId: UUID, userId: UUID) {
        val match = findMatch(matchId)
        if (match.status == "IN_PROGRESS") throw AppException.unprocessable("MATCH_NOT_JOINABLE", "Cannot leave in-progress match")
        val mp = matchPlayerRepository.findByMatchIdAndUserId(matchId, userId)
            ?: throw AppException.notFound("Not in this match")
        val teamId = mp.team.id!!
        matchPlayerRepository.delete(mp)
        eventPublisher.playerLeft(matchId, teamId, userId)
    }

    @Transactional
    fun startMatch(matchId: UUID, userId: UUID): MatchResponse {
        val match = findMatch(matchId)
        if (match.createdById != userId) throw AppException.forbidden("Only the match creator can start")
        if (match.status != "WAITING") throw AppException.unprocessable("INVALID_STATUS_TRANSITION", "Match is not WAITING")

        match.status    = "IN_PROGRESS"
        match.startedAt = Instant.now()
        matchRepository.save(match)
        eventPublisher.matchStarted(matchId, match.startedAt)
        return toDetail(match, teamRepository.findByMatchId(matchId), userId)
    }

    @Transactional
    fun reportHit(matchId: UUID, userId: UUID): Map<String, Any> {
        val match = findMatch(matchId)
        if (match.status != "IN_PROGRESS") throw AppException.unprocessable("MATCH_NOT_JOINABLE", "Match not in progress")

        val delay = match.gameMode.respawnDelaySeconds
        val since = Instant.now().minusSeconds(delay.toLong())
        val existing = hitEventRepository.findRecentHit(matchId, userId, since)
        if (existing != null) return mapOf("id" to existing.id!!, "matchId" to matchId, "userId" to userId,
            "reportedAt" to (existing.reportedAt ?: Instant.now()), "respawnAt" to existing.respawnAt)

        val user = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        val hit  = hitEventRepository.save(HitEvent(match = match, user = user, respawnAt = Instant.now().plusSeconds(delay.toLong())))
        eventPublisher.hitReported(matchId, userId, hit.respawnAt)
        return mapOf("id" to hit.id!!, "matchId" to matchId, "userId" to userId,
            "reportedAt" to (hit.reportedAt ?: Instant.now()), "respawnAt" to hit.respawnAt)
    }

    @Transactional
    fun endMatch(matchId: UUID, userId: UUID, req: EndMatchRequest): MatchResponse {
        val match = findMatch(matchId)
        if (match.createdById != userId) throw AppException.forbidden("Only the match creator can end")
        if (match.status != "IN_PROGRESS") throw AppException.unprocessable("INVALID_STATUS_TRANSITION", "Match not in progress")

        match.status       = "ENDED"
        match.endedAt      = Instant.now()
        match.winningTeamId = req.winningTeamId
        matchRepository.save(match)
        updatePlayerStats(match)
        eventPublisher.matchEnded(matchId, match.endedAt, req.winningTeamId)
        return toDetail(match, teamRepository.findByMatchId(matchId), userId)
    }

    fun getMyMatches(userId: UUID, pageable: Pageable): PageResponse<MatchResponse> {
        val entries = matchPlayerRepository.findEndedMatchesForUser(userId, pageable)
        return PageResponse(
            content = entries.map { toHistoryEntry(it, userId) },
            page = pageable.pageNumber, size = pageable.pageSize,
            totalElements = entries.size.toLong(), totalPages = 1, last = true
        )
    }

    fun getMatchesByField(fieldId: UUID): List<MatchResponse> {
        val matches = matchRepository.findByFieldId(fieldId)
        return matches.map { match -> toDetail(match, teamRepository.findByMatchId(match.id!!), null) }
    }

    @Transactional
    fun sendPing(matchId: UUID, userId: UUID, request: PingRequest): PingResponse {
        val match = findMatch(matchId)
        if (match.status != "IN_PROGRESS") throw AppException.unprocessable("MATCH_NOT_IN_PROGRESS", "Match is not in progress")
        if (!matchPlayerRepository.existsByMatchIdAndUserId(matchId, userId)) throw AppException.forbidden("You are not a member of this match")

        val user = userRepository.findById(userId).orElseThrow { AppException.notFound("User not found") }
        val ping = pingEventRepository.save(
            PingEvent(
                match = match,
                user = user,
                latitude = request.latitude,
                longitude = request.longitude,
                pingType = request.pingType
            )
        )

        val createdAt = ping.createdAt ?: Instant.now()
        val expiresAt = createdAt.plusSeconds(10)

        eventPublisher.pingSent(
            matchId = matchId,
            pingId = ping.id!!,
            userId = userId,
            displayName = user.displayName,
            latitude = ping.latitude,
            longitude = ping.longitude,
            pingType = ping.pingType,
            createdAt = createdAt,
            expiresAt = expiresAt
        )

        return PingResponse(
            id = ping.id!!,
            matchId = matchId,
            userId = userId,
            displayName = user.displayName,
            latitude = ping.latitude,
            longitude = ping.longitude,
            pingType = ping.pingType,
            createdAt = createdAt,
            expiresAt = expiresAt
        )
    }

    private fun findMatch(id: UUID) = matchRepository.findById(id)
        .orElseThrow { AppException.notFound("Match not found: $id") }

    private fun toDetail(match: GameMatch, teams: List<Team>, userId: UUID?): MatchResponse {
        val myMp = userId?.let { matchPlayerRepository.findByMatchIdAndUserId(match.id!!, it) }
        val teamDetails = teams.map { t ->
            TeamDetailResponse(
                id = t.id!!, name = t.name, colorHex = t.colorHex,
                objectives = t.objectives, respawnBase = t.respawnBase,
                isWinner = t.id == match.winningTeamId,
                players = matchPlayerRepository.findByTeamId(t.id!!).map { mp ->
                    PlayerInTeamResponse(userId = mp.user.id!!, displayName = mp.user.displayName,
                        avatarUrl = mp.user.avatarUrl, joinedAt = mp.joinedAt,
                        killCount = null, deathCount = null)
                }
            )
        }
        val duration = if (match.startedAt != null && match.endedAt != null)
            match.endedAt!!.epochSecond - match.startedAt!!.epochSecond else null
        val winningTeamName = match.winningTeamId?.let { wid -> teams.find { it.id == wid }?.name }

        return MatchResponse(
            id = match.id!!, fieldId = match.field.id!!, fieldName = match.field.name,
            gameModeId = match.gameMode.id!!, gameModeName = match.gameMode.name,
            status = match.status, maxPlayers = match.maxPlayers,
            playerCount = matchPlayerRepository.countByMatchId(match.id!!),
            startedAt = match.startedAt, endedAt = match.endedAt,
            winningTeamId = match.winningTeamId, winningTeamName = winningTeamName,
            durationSeconds = duration, myTeamId = myMp?.team?.id,
            canJoin = match.status == "WAITING", teams = teamDetails, result = null
        )
    }

    private fun toHistoryEntry(mp: MatchPlayer, userId: UUID): MatchResponse {
        val match = mp.match
        val result = when {
            match.winningTeamId == null          -> "DRAW"
            match.winningTeamId == mp.team.id    -> "WIN"
            else                                  -> "LOSS"
        }
        return toDetail(match, teamRepository.findByMatchId(match.id!!), userId).copy(result = result)
    }

    private fun updatePlayerStats(match: GameMatch) {
        matchPlayerRepository.findByMatchId(match.id!!).forEach { mp ->
            val stats = statsRepository.findByUserId(mp.user.id!!) ?: PlayerStats(userId = mp.user.id!!)
            stats.totalMatches += 1
            when {
                match.winningTeamId == null       -> stats.draws  += 1
                match.winningTeamId == mp.team.id -> stats.wins   += 1
                else                               -> stats.losses += 1
            }
            stats.updatedAt = Instant.now()
            statsRepository.save(stats)
        }
    }
}