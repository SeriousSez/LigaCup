using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations;

[Migration("20260910195000_TournamentRules")]
public partial class TournamentRules : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<string>(
            name: "Rules",
            table: "Tournaments",
            type: "TEXT",
            maxLength: 20000,
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "Rules",
            table: "Tournaments");
    }
}
