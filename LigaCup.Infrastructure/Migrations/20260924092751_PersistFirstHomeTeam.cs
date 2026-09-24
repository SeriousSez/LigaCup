using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PersistFirstHomeTeam : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "FirstHomeTeamId",
                table: "Tournaments",
                type: "INTEGER",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FirstHomeTeamId",
                table: "Tournaments");
        }
    }
}
