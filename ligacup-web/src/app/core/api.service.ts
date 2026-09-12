import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
    CreateUserRequest,
    Group,
    Match,
    MatchEventType,
    MatchStage,
    MatchStatus,
    Player,
    SaveTournamentRequest,
    Team,
    TournamentDetail,
    TournamentSummary,
    UpdateUserRequest,
    User,
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiBaseUrl;

    getTournaments() {
        return this.http.get<TournamentSummary[]>(`${this.base}/api/tournaments`);
    }

    getUsers() {
        return this.http.get<User[]>(`${this.base}/api/admin/users`);
    }

    createUser(request: CreateUserRequest) {
        return this.http.post<User>(`${this.base}/api/admin/users`, request);
    }

    updateUser(id: number, request: UpdateUserRequest) {
        return this.http.put<User>(`${this.base}/api/admin/users/${id}`, request);
    }

    resetUserPassword(id: number, password: string) {
        return this.http.put<void>(`${this.base}/api/admin/users/${id}/password`, { password });
    }

    deleteUser(id: number) {
        return this.http.delete<void>(`${this.base}/api/admin/users/${id}`);
    }

    getTournament(slug: string) {
        return this.http.get<TournamentDetail>(`${this.base}/api/tournaments/${slug}`);
    }

    createTournament(request: SaveTournamentRequest) {
        return this.http.post<string>(`${this.base}/api/admin/tournaments`, request);
    }

    updateTournament(id: number, request: SaveTournamentRequest) {
        return this.http.put<string>(`${this.base}/api/admin/tournaments/${id}`, request);
    }

    deleteTournament(id: number) {
        return this.http.delete<void>(`${this.base}/api/admin/tournaments/${id}`);
    }

    createGroup(tournamentId: number, name: string, sortOrder: number) {
        return this.http.post<Group>(`${this.base}/api/admin/tournaments/${tournamentId}/groups`, {
            name,
            sortOrder,
        });
    }

    deleteGroup(tournamentId: number, groupId: number) {
        return this.http.delete<void>(
            `${this.base}/api/admin/tournaments/${tournamentId}/groups/${groupId}`,
        );
    }

    saveTeam(tournamentId: number, teamId: number | null, body: Partial<Team>) {
        const payload = {
            name: body.name,
            shortName: body.shortName ?? null,
            colorHex: body.colorHex ?? null,
            logoUrl: body.logoUrl ?? null,
            manager: body.manager ?? null,
            groupId: body.groupId ?? null,
            pointsAdjustment: body.pointsAdjustment ?? 0,
        };

        return teamId
            ? this.http.put<Team>(
                `${this.base}/api/admin/tournaments/${tournamentId}/teams/${teamId}`,
                payload,
            )
            : this.http.post<Team>(`${this.base}/api/admin/tournaments/${tournamentId}/teams`, payload);
    }

    deleteTeam(tournamentId: number, teamId: number) {
        return this.http.delete<void>(
            `${this.base}/api/admin/tournaments/${tournamentId}/teams/${teamId}`,
        );
    }

    savePlayer(playerId: number | null, body: Partial<Player>) {
        const payload = {
            teamId: body.teamId,
            name: body.name,
            shirtNumber: body.shirtNumber ?? null,
            position: body.position ?? null,
            isActive: body.isActive ?? true,
        };

        return playerId
            ? this.http.put<Player>(`${this.base}/api/admin/tournaments/players/${playerId}`, payload)
            : this.http.post<Player>(`${this.base}/api/admin/tournaments/players`, payload);
    }

    deletePlayer(playerId: number) {
        return this.http.delete<void>(`${this.base}/api/admin/tournaments/players/${playerId}`);
    }

    generateFixtures(
        tournamentId: number,
        includeGroupStage: boolean,
        includeKnockoutStage: boolean,
        replaceExisting: boolean,
    ) {
        return this.http.post<{ generated: number }>(
            `${this.base}/api/admin/tournaments/${tournamentId}/fixtures`,
            { includeGroupStage, includeKnockoutStage, replaceExisting },
        );
    }

    seedKnockout(tournamentId: number) {
        return this.http.post<{ seeded: number }>(
            `${this.base}/api/admin/tournaments/${tournamentId}/knockout/seed`,
            {},
        );
    }

    saveMatch(
        tournamentId: number,
        matchId: number | null,
        body: {
            groupId: number | null;
            stage: MatchStage;
            round: number;
            homeTeamId: number | null;
            awayTeamId: number | null;
            homePlaceholder: string | null;
            awayPlaceholder: string | null;
            kickoffUtc: string | null;
            pitchNumber: number | null;
            venue: string | null;
        },
    ) {
        return matchId
            ? this.http.put<Match>(
                `${this.base}/api/admin/tournaments/${tournamentId}/matches/${matchId}`,
                body,
            )
            : this.http.post<Match>(`${this.base}/api/admin/tournaments/${tournamentId}/matches`, body);
    }

    deleteMatch(tournamentId: number, matchId: number) {
        return this.http.delete<void>(
            `${this.base}/api/admin/tournaments/${tournamentId}/matches/${matchId}`,
        );
    }

    adjustScore(matchId: number, side: 'home' | 'away', delta: 1 | -1) {
        return this.http.post<Match>(
            `${this.base}/api/live/matches/${matchId}/score/${side}/${delta}`,
            {},
        );
    }

    setScore(
        matchId: number,
        homeScore: number,
        awayScore: number,
        homePenalties: number | null,
        awayPenalties: number | null,
    ) {
        return this.http.put<Match>(`${this.base}/api/live/matches/${matchId}/score`, {
            homeScore,
            awayScore,
            homePenalties,
            awayPenalties,
        });
    }

    setStatus(matchId: number, status: MatchStatus) {
        return this.http.put<Match>(`${this.base}/api/live/matches/${matchId}/status`, { status });
    }

    setStoppage(matchId: number, stoppageMinutes: number) {
        return this.http.put<Match>(`${this.base}/api/live/matches/${matchId}/stoppage`, {
            stoppageMinutes,
        });
    }

    addEvent(
        matchId: number,
        teamId: number,
        playerId: number | null,
        type: MatchEventType,
        minute: number,
        note: string | null,
    ) {
        return this.http.post<Match>(`${this.base}/api/live/matches/${matchId}/events`, {
            teamId,
            playerId,
            type,
            minute,
            note,
        });
    }

    deleteEvent(matchId: number, eventId: number) {
        return this.http.delete<Match>(`${this.base}/api/live/matches/${matchId}/events/${eventId}`);
    }
}
