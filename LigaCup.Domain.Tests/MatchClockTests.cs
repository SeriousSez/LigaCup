using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;
using LigaCup.Domain.Timing;

namespace LigaCup.Domain.Tests;

public class MatchClockTests
{
    private static readonly DateTime Kickoff = new(2026, 6, 1, 12, 0, 0, DateTimeKind.Utc);

    private static Tournament BuildTournament(
        int periods = 2,
        int periodMinutes = 45,
        bool stoppage = true) => new()
        {
            Id = 1,
            PeriodCount = periods,
            PeriodDurationMinutes = periodMinutes,
            UseStoppageTime = stoppage,
            TrackMatchClock = true
        };

    private static Match BuildMatch() => new()
    {
        Id = 1,
        TournamentId = 1,
        Status = MatchStatus.Scheduled
    };

    [Fact]
    public void ClockStartsWhenTheMatchGoesLive()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(10));

        Assert.Equal(Kickoff, match.StartedUtc);
        Assert.True(state.IsRunning);
        Assert.Equal(10, state.DisplayMinute);
        Assert.Equal(1, state.Period);
    }

    [Fact]
    public void ClockDoesNotRunBeforeKickoff()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(30));

        Assert.False(state.IsRunning);
        Assert.Equal(0, state.DisplayMinute);
    }

    [Fact]
    public void HalfTimeStopsTheClock()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.HalfTime, Kickoff.AddMinutes(45));

        // Fifteen minutes of interval must not advance the clock.
        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(60));

        Assert.False(state.IsRunning);
        Assert.Equal(45, state.DisplayMinute);
    }

    [Fact]
    public void SecondHalfResumesAtTheStartOfTheNextPeriod()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.HalfTime, Kickoff.AddMinutes(47));
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff.AddMinutes(62));

        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(72));

        Assert.Equal(2, state.Period);
        Assert.Equal(10, state.MinuteInPeriod);
        Assert.Equal(55, state.DisplayMinute);
    }

    [Fact]
    public void APauseInsideAPeriodFreezesAndThenResumesTheClock()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Paused, Kickoff.AddMinutes(20));

        Assert.Equal(20, MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(25)).DisplayMinute);

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff.AddMinutes(25));
        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(30));

        // Five minutes of stoppage were paused, so 30 minutes of real time is 25 of play.
        Assert.Equal(1, state.Period);
        Assert.Equal(25, state.DisplayMinute);
    }

    [Fact]
    public void PlayPastTheEndOfAPeriodIsShownAsAddedTime()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(47));

        Assert.Equal(47, state.DisplayMinute);
        Assert.Equal(2, state.StoppageShown);
    }

    [Fact]
    public void StoppageTimeCanBeSwitchedOffSoTheClockStopsAtTheWhistle()
    {
        var tournament = BuildTournament(stoppage: false);
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(52));

        Assert.Equal(45, state.DisplayMinute);
        Assert.Null(state.StoppageShown);
    }

    [Fact]
    public void ShorterFormatsUseTheirOwnPeriodLength()
    {
        var tournament = BuildTournament(periods: 2, periodMinutes: 10);
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.HalfTime, Kickoff.AddMinutes(10));
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff.AddMinutes(12));

        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(15));

        Assert.Equal(2, state.Period);
        Assert.Equal(13, state.DisplayMinute);
        Assert.Equal(20, tournament.TotalDurationMinutes);
    }

    [Fact]
    public void ASinglePeriodFormatNeverAdvancesPastPeriodOne()
    {
        var tournament = BuildTournament(periods: 1, periodMinutes: 20);
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.HalfTime, Kickoff.AddMinutes(20));
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff.AddMinutes(21));

        Assert.Equal(1, MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(22)).Period);
    }

    [Fact]
    public void FinishingBanksTheTimeAndStopsTheClock()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Finished, Kickoff.AddMinutes(48));

        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(200));

        Assert.False(state.IsRunning);
        Assert.Equal(48, state.DisplayMinute);
        Assert.Equal(Kickoff.AddMinutes(48), match.FinishedUtc);
    }

    [Fact]
    public void ResettingToScheduledClearsTheClock()
    {
        var tournament = BuildTournament();
        var match = BuildMatch();

        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff);
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.HalfTime, Kickoff.AddMinutes(45));
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Live, Kickoff.AddMinutes(60));
        MatchClock.ApplyStatusChange(tournament, match, MatchStatus.Scheduled, Kickoff.AddMinutes(70));

        var state = MatchClock.Calculate(tournament, match, Kickoff.AddMinutes(90));

        Assert.Null(match.StartedUtc);
        Assert.Equal(1, state.Period);
        Assert.Equal(0, state.DisplayMinute);
    }
}
