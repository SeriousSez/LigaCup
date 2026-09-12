using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class TournamentLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Location",
                table: "Tournaments",
                type: "TEXT",
                maxLength: 160,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location",
                table: "Tournaments");
        }
    }
}
