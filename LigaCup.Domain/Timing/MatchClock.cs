using LigaCup.Domain.Entities;
using LigaCup.Domain.Enums;

namespace LigaCup.Domain.Timing;

/// <summary>
/// A snapshot of the match clock. <see cref="DisplayMinute"/> is the number shown on screen,
/// and <see cref="StoppageShown"/> is the "+2" part once a period runs past its regulation length.
/// </summary>
public record MatchClockState(
    int Period,
    int MinuteInPeriod,
    int DisplayMinute,
    int? StoppageShown,
    bool IsRunning,
    int ElapsedSeconds);

/// <summary>
/// Works out the match clock from banked play time plus the current running spell.
/// Pauses and the half-time interval do not count, which is what makes this different
/// from simply subtracting the kickoff time from the current time.
/// </summary>
public static class MatchClock
{
    public static MatchClockState Calculate(Tournament tournament, Match match, DateTime nowUtc)
    {
        var periodDuration = Math.Max(1, tournament.PeriodDurationMinutes);
        var period = Math.Clamp(match.CurrentPeriod, 1, Math.Max(1, tournament.PeriodCount));

        var isRunning = match.Status == MatchStatus.Live && match.ClockStartedUtc is not null;

        var elapsedSeconds = match.PeriodElapsedSeconds;
        if (isRunning)
        {
            elapsedSeconds += (int)Math.Max(0, (nowUtc - match.ClockStartedUtc!.Value).TotalSeconds);
        }

        var minuteInPeriod = elapsedSeconds / 60;

        if (!tournament.UseStoppageTime)
        {
            minuteInPeriod = Math.Min(minuteInPeriod, periodDuration);
        }

        var regulationEnd = period * periodDuration;
        var displayMinute = ((period - 1) * periodDuration) + minuteInPeriod;

        int? stoppageShown = displayMinute > regulationEnd ? displayMinute - regulationEnd : null;

        return new MatchClockState(
            period,
            minuteInPeriod,
            displayMinute,
            stoppageShown,
            isRunning,
            elapsedSeconds);
    }

    /// <summary>
    /// Applies a status change to the clock fields. Returns the match so callers can chain,
    /// and keeps every transition rule in one place rather than scattered across the service.
    /// </summary>
    public static void ApplyStatusChange(Tournament tournament, Match match, MatchStatus status, DateTime nowUtc)
    {
        var previous = match.Status;

        switch (status)
        {
            case MatchStatus.Live:
                if (previous == MatchStatus.HalfTime)
                {
                    // Coming back from the interval starts the next period from zero.
                    match.CurrentPeriod = Math.Min(match.CurrentPeriod + 1, Math.Max(1, tournament.PeriodCount));
                    match.PeriodElapsedSeconds = 0;
                    match.StoppageMinutes = 0;
                }

                match.StartedUtc ??= nowUtc;
                match.ClockStartedUtc = nowUtc;
                match.FinishedUtc = null;
                break;

            case MatchStatus.HalfTime:
            case MatchStatus.Paused:
                BankRunningTime(match, nowUtc);
                match.ClockStartedUtc = null;
                break;

            case MatchStatus.Finished:
                BankRunningTime(match, nowUtc);
                match.ClockStartedUtc = null;
                match.FinishedUtc = nowUtc;
                break;

            case MatchStatus.Scheduled:
                match.StartedUtc = null;
                match.ClockStartedUtc = null;
                match.FinishedUtc = null;
                match.CurrentPeriod = 1;
                match.PeriodElapsedSeconds = 0;
                match.StoppageMinutes = 0;
                break;

            default:
                BankRunningTime(match, nowUtc);
                match.ClockStartedUtc = null;
                match.FinishedUtc = null;
                break;
        }

        match.Status = status;
    }

    private static void BankRunningTime(Match match, DateTime nowUtc)
    {
        if (match.ClockStartedUtc is null)
        {
            return;
        }

        match.PeriodElapsedSeconds += (int)Math.Max(0, (nowUtc - match.ClockStartedUtc.Value).TotalSeconds);
    }
}
