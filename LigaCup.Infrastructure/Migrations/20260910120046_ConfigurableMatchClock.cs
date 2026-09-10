using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConfigurableMatchClock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MatchDurationMinutes",
                table: "Tournaments",
                newName: "UseStoppageTime");

            migrationBuilder.AddColumn<bool>(
                name: "AllowTimeouts",
                table: "Tournaments",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "BreakDurationMinutes",
                table: "Tournaments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PeriodCount",
                table: "Tournaments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PeriodDurationMinutes",
                table: "Tournaments",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "TrackMatchClock",
                table: "Tournaments",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "ClockStartedUtc",
                table: "Matches",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CurrentPeriod",
                table: "Matches",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PeriodElapsedSeconds",
                table: "Matches",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "StoppageMinutes",
                table: "Matches",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowTimeouts",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "BreakDurationMinutes",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "PeriodCount",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "PeriodDurationMinutes",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "TrackMatchClock",
                table: "Tournaments");

            migrationBuilder.DropColumn(
                name: "ClockStartedUtc",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "CurrentPeriod",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "PeriodElapsedSeconds",
                table: "Matches");

            migrationBuilder.DropColumn(
                name: "StoppageMinutes",
                table: "Matches");

            migrationBuilder.RenameColumn(
                name: "UseStoppageTime",
                table: "Tournaments",
                newName: "MatchDurationMinutes");
        }
    }
}
