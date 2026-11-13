using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

namespace LigaCup.Infrastructure.Migrations;

[DbContext(typeof(LigaCupContext))]
[Migration("20261113000000_CommandReceipts")]
public class CommandReceipts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.CreateTable(
        name: "CommandReceipts", columns: table => new
        {
            Id = table.Column<string>(type: "TEXT", nullable: false),
            RequestHash = table.Column<string>(type: "TEXT", nullable: false),
            StatusCode = table.Column<int>(type: "INTEGER", nullable: false),
            Body = table.Column<string>(type: "TEXT", nullable: false),
            ContentType = table.Column<string>(type: "TEXT", nullable: false)
        }, constraints: table => table.PrimaryKey("PK_CommandReceipts", x => x.Id));

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.DropTable("CommandReceipts");
}
