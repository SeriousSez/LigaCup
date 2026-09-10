using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations;

[Migration("20260910202000_PlayerRegistrationMode")]
public partial class PlayerRegistrationMode : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<int>(
            name: "PlayerRegistrationMode",
            table: "Tournaments",
            type: "INTEGER",
            nullable: false,
            defaultValue: 2);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "PlayerRegistrationMode",
            table: "Tournaments");
    }
}
