using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations;

[DbContext(typeof(LigaCupContext))]
[Migration("20260910201000_TournamentDate")]
public partial class TournamentDate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<DateTime>(
            name: "TournamentDateUtc",
            table: "Tournaments",
            type: "TEXT",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "TournamentDateUtc",
            table: "Tournaments");
    }
}
