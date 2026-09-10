using LigaCup.ApplicationService.Contracts;

namespace LigaCup.ApplicationService.Services;

/// <summary>
/// Pushes live changes out to connected clients. Implemented in the API layer with SignalR
/// so the application layer stays free of transport concerns.
/// </summary>
public interface ILiveUpdateBroadcaster
{
    Task BroadcastAsync(LiveUpdateDto update, CancellationToken cancellationToken = default);
}
