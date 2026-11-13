namespace LigaCup.Domain.Entities;

public class CommandReceipt
{
    public string Id { get; set; } = "";
    public string RequestHash { get; set; } = "";
    public int StatusCode { get; set; }
    public string Body { get; set; } = "";
    public string ContentType { get; set; } = "";
}
