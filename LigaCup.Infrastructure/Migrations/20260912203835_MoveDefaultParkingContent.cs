using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LigaCup.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class MoveDefaultParkingContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                                UPDATE "Tournaments"
                                SET "Parking" = '<h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>'
                                WHERE ("Parking" IS NULL OR TRIM("Parking") = '')
                                    AND INSTR(COALESCE("Rules", ''), '<h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>') > 0;

                                UPDATE "Tournaments"
                                SET "Rules" = NULLIF(TRIM(REPLACE("Rules", '<h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>', '')), '')
                                WHERE INSTR(COALESCE("Rules", ''), '<h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>') > 0;
                                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                                UPDATE "Tournaments"
                                SET "Rules" = COALESCE("Rules", '') || '<p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>',
                                        "Parking" = NULL
                                WHERE "Parking" = '<h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>'
                                    AND INSTR(COALESCE("Rules", ''), '<h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>') = 0;
                                """);
        }
    }
}
