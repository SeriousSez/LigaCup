using LigaCup.ApplicationService.Contracts;
using LigaCup.ApplicationService.Services;
using Microsoft.AspNetCore.SignalR;

namespace LigaCup.API.Hubs;

/// <summary>
/// Read-only realtime feed. Clients join the group for the tournament they are watching,
/// so a busy match only pushes bytes to the people actually looking at it.
/// </summary>
public class LiveHub : Hub
{
    public static string GroupName(string slug) => $"tournament:{slug}";

    public Task JoinTournament(string slug) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupName(slug));

    public Task LeaveTournament(string slug) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(slug));
}

public class SignalRLiveUpdateBroadcaster(IHubContext<LiveHub> hubContext) : ILiveUpdateBroadcaster
{
    public Task BroadcastAsync(LiveUpdateDto update, CancellationToken cancellationToken = default) =>
        hubContext.Clients
            .Group(LiveHub.GroupName(update.Slug))
            .SendAsync("liveUpdate", update, cancellationToken);
}
