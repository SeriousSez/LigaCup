using LigaCup.Infrastructure.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace LigaCup.Infrastructure.Extensions;

public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddLigaCupPersistence(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<LigaCupContext>(options => DatabaseConfiguration.Configure(options, configuration));
        return services;
    }
}
