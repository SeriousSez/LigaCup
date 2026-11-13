using LigaCup.API.Hubs;
using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Services;

namespace LigaCup.API.Endpoints;

public sealed class PendingNotifications(SignalRLiveUpdateBroadcaster broadcaster, ILogger<PendingNotifications> logger) : ILiveUpdateBroadcaster
{
    private readonly List<LiveUpdateDto> pending = [];
    public Task BroadcastAsync(LiveUpdateDto update, CancellationToken cancellationToken = default)
    { pending.Add(update); return Task.CompletedTask; }

    public async Task FlushAsync()
    {
        foreach (var update in pending)
        {
            try { await broadcaster.BroadcastAsync(update, CancellationToken.None); }
            catch (Exception error) { logger.LogWarning(error, "Saved match {MatchId}; live notification failed. Clients can reload.", update.Match.Id); }
        }
        pending.Clear();
    }
}
