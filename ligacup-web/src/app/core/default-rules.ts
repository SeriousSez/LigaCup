export const defaultTournamentRules = `<h3>Liga Cup 2026 - U9 årgang 2018</h3><p><strong>Dato:</strong> 06.09.2026</p><p><strong>Tidspunkt:</strong> Kl. 15:00 til 17:35</p><p><strong>Sted:</strong> Ved stadion 5, 4600 Køge.</p><p><strong>Spilformat:</strong> 5v5 (5-mands mål)</p><p><strong>Spilletid:</strong> 10 min. pr. kamp</p><p>Trænerne bedes mødes med Sezer ved Pokalbordet 10 minutter før første kamp starter.</p><p>Vi har fælles præmieoverrækkelse, når kampene er færdigspillet. Alle hold bedes blive under hele præmieoverrækkelsen for at hylde alle spillere.</p><h3>Spilformat</h3><p>Vi spiller i ligaformat, hvor holdet med flest point vinder ligaen.</p><p>Alle spillere får pokaler. Der er holdpokaler til 1., 2. og 3. pladsen.</p><p><strong>Hvis to eller flere hold ender med samme antal point, afgøres placeringen ud fra:</strong></p><ol><li>Målforskel</li><li>Flest scorede mål</li><li>Lodtrækning</li></ol><h3>Spilletid og kampleder</h3><ul><li>Spilletid: 1x10 min. pr. kamp.</li><li>Kampene fløjtes i gang og af på samme tid fra Pokalbordet.</li><li>Hjemmeholdet stiller med kampleder, eller man aftaler med modstanderen at dømme fra siden.</li><li>Pause mellem kampe er 5 min. Husk at være klar til tiden til næste kamp på banen.</li><li>Der er en længere pause efter 4. spillerunde.</li><li>Efter hver kamp meddeler vinderholdet resultatet til Pokalbordet. Ved uafgjort er det førstnævnte hold.</li></ul><h3>Regler</h3><ul><li>Målmanden må ikke samle op ved tilbagelægning. Sker det, dømmes der frispark uden for feltet. Første gang gives en mundtlig advarsel.</li><li>Spillet startes enten ved aflevering eller ved at drible bolden ind på banen. Målmanden må også drible bolden frem ved målspark.</li><li>Ved målspark behøver modstanderen ikke at trække helt tilbage til midterlinjen, men skal give plads til igangsætning.</li></ul><h3>Opfordring</h3><ul><li>Lad børnene selv træffe beslutninger, når de er på bolden.</li><li>Undgå for meget råben ind på banen. Hvis der skal coaches, så skift venligst spilleren ud og vejled vedkommende på sidelinjen.</li><li>Ved frispark opfordres der til highfive og en undskyldning.</li></ul><h3>Parkering</h3><p><strong>Adresse:</strong> Ved stadion 5, 4600 Køge. Se gul ring rundt om P på kortet.</p><p>Følg derefter grusstien markeret med blå over til bane 6, markeret med gul ring, hvor kampene spilles.</p>`;

export const defaultTournamentRulesWithoutDate = defaultTournamentRules.replace(
    /<p><strong>Dato:<\/strong>.*?<\/p><p><strong>Tidspunkt:<\/strong>.*?<\/p>/,
    '',
);

export function removeLegacyDefaultDateTime(rules: string): string {
    if (!rules.startsWith('<h3>Liga Cup 2026 - U9') || !rules.includes('Ved stadion 5, 4600 Køge')) {
        return rules;
    }

    return rules.replace(
        /<p><strong>Dato:<\/strong>.*?<\/p><p><strong>Tidspunkt:<\/strong>.*?<\/p>/,
        '',
    );
}
