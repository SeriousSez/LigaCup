using LigaCup.Infrastructure;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations;

[DbContext(typeof(LigaCupContext))]
[Migration("20260910201500_MatchesPerTimeSlot")]
public partial class MatchesPerTimeSlot : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "MatchesPerTimeSlot",
            table: "Tournaments",
            type: "INTEGER",
            nullable: false,
            defaultValue: 4);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "MatchesPerTimeSlot",
            table: "Tournaments");
    }
}
