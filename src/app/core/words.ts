import type { WordEntry } from './hebrew';

/**
 * Vocalized word bank for נַחַל הַנִּקּוּד.
 *
 * Each entry is authored fully vocalized; `slots` states how many vowel marks
 * the word should contain. words.spec.ts re-derives that count from the string,
 * so a mistyped or missing mark fails the test rather than reaching a child.
 *
 * easy   — 2-3 letters, 1-2 vowels, from קמץ פתח סגול חיריק צירה חולם
 * medium — 3-4 letters, 2-3 vowels, שווא joins
 * hard   — 3-5 letters, 3-4 vowels, קֻבוץ and חטפים join, and on hard the
 *          shin/sin dot becomes playable instead of pre-placed
 */
export const WORDS: readonly WordEntry[] = [
  // --- easy -----------------------------------------------------------------
  { id: 'e01', word: 'יָד', meaning: 'כַּף הַיָּד', level: 'easy', slots: 1 },
  { id: 'e02', word: 'יָם', meaning: 'הַרְבֵּה מַיִם', level: 'easy', slots: 1 },
  { id: 'e03', word: 'לֵב', meaning: 'פּוֹעֵם בֶּחָזֶה', level: 'easy', slots: 1 },
  { id: 'e04', word: 'עֵץ', meaning: 'גָּדֵל בַּיַּעַר', level: 'easy', slots: 1 },
  { id: 'e05', word: 'דָּג', meaning: 'שׂוֹחֶה בַּמַּיִם', level: 'easy', slots: 1 },
  { id: 'e06', word: 'גַּן', meaning: 'מְשַׂחֲקִים בּוֹ', level: 'easy', slots: 1 },
  { id: 'e07', word: 'אוֹר', meaning: 'הַהֶפֶךְ מֵחֹשֶׁךְ', level: 'easy', slots: 1 },
  { id: 'e08', word: 'שֵׁן', meaning: 'לוֹעֶסֶת אֹכֶל', level: 'easy', slots: 1 },
  { id: 'e09', word: 'כּוֹס', meaning: 'שׁוֹתִים מִמֶּנָּה', level: 'easy', slots: 1 },
  { id: 'e10', word: 'פֶּה', meaning: 'מְדַבֵּר וְאוֹכֵל', level: 'easy', slots: 1 },
  { id: 'e11', word: 'שֶׁמֶשׁ', meaning: 'מְאִירָה בַּיּוֹם', level: 'easy', slots: 2 },
  { id: 'e12', word: 'יֶלֶד', meaning: 'קָטָן וְשׂוֹבָב', level: 'easy', slots: 2 },
  { id: 'e13', word: 'סֵפֶר', meaning: 'קוֹרְאִים בּוֹ', level: 'easy', slots: 2 },
  { id: 'e14', word: 'כֶּלֶב', meaning: 'נוֹבֵחַ הַב־הַב', level: 'easy', slots: 2 },
  { id: 'e15', word: 'דֶּלֶת', meaning: 'נִכְנָסִים דַּרְכָּהּ', level: 'easy', slots: 2 },
  { id: 'e16', word: 'פָּרָה', meaning: 'עוֹשָׂה מוּ', level: 'easy', slots: 2 },
  { id: 'e17', word: 'בַּיִת', meaning: 'גָּרִים בּוֹ', level: 'easy', slots: 2 },
  { id: 'e18', word: 'מַיִם', meaning: 'שׁוֹתִים כְּשֶׁצְּמֵאִים', level: 'easy', slots: 2 },
  { id: 'e19', word: 'אִמָּא', meaning: 'הַכִּי אוֹהֶבֶת', level: 'easy', slots: 2 },
  { id: 'e20', word: 'אַבָּא', meaning: 'הַכִּי חָזָק', level: 'easy', slots: 2 },

  // --- medium ---------------------------------------------------------------
  { id: 'm01', word: 'רֶגֶל', meaning: 'הוֹלְכִים אִתָּהּ', level: 'medium', slots: 2 },
  { id: 'm02', word: 'פֶּרַח', meaning: 'צוֹמֵחַ וְרֵיחָנִי', level: 'medium', slots: 2 },
  { id: 'm03', word: 'עַיִן', meaning: 'רוֹאָה הַכֹּל', level: 'medium', slots: 2 },
  { id: 'm04', word: 'אֹזֶן', meaning: 'שׁוֹמַעַת קוֹלוֹת', level: 'medium', slots: 2 },
  { id: 'm05', word: 'כֶּתֶר', meaning: 'עַל רֹאשׁ הַמֶּלֶךְ', level: 'medium', slots: 2 },
  { id: 'm06', word: 'שָׁעָה', meaning: 'שִׁשִּׁים דַּקּוֹת', level: 'medium', slots: 2 },
  { id: 'm07', word: 'לֶחֶם', meaning: 'אוֹפִים בַּתַּנּוּר', level: 'medium', slots: 2 },
  { id: 'm08', word: 'חָלָב', meaning: 'לָבָן וּמַזִּין', level: 'medium', slots: 2 },
  { id: 'm09', word: 'חָבֵר', meaning: 'מְשַׂחֲקִים אִתּוֹ', level: 'medium', slots: 2 },
  { id: 'm10', word: 'כּוֹכָב', meaning: 'נוֹצֵץ בַּלַּיְלָה', level: 'medium', slots: 2 },
  { id: 'm11', word: 'מוֹרָה', meaning: 'מְלַמֶּדֶת בַּכִּתָּה', level: 'medium', slots: 2 },
  { id: 'm12', word: 'צִפּוֹר', meaning: 'עָפָה בַּשָּׁמַיִם', level: 'medium', slots: 2 },
  { id: 'm13', word: 'כִּסֵּא', meaning: 'יוֹשְׁבִים עָלָיו', level: 'medium', slots: 2 },
  { id: 'm14', word: 'בֹּקֶר', meaning: 'תְּחִלַּת הַיּוֹם', level: 'medium', slots: 2 },
  { id: 'm15', word: 'עֶרֶב', meaning: 'לִפְנֵי הַשֵּׁנָה', level: 'medium', slots: 2 },
  { id: 'm16', word: 'קַיִץ', meaning: 'הָעוֹנָה הַחַמָּה', level: 'medium', slots: 2 },
  { id: 'm17', word: 'מֶלֶךְ', meaning: 'שׁוֹלֵט בַּמַּמְלָכָה', level: 'medium', slots: 3 },
  { id: 'm18', word: 'יַלְדָּה', meaning: 'קְטַנָּה וְשׂוֹבֶבֶת', level: 'medium', slots: 3 },
  { id: 'm19', word: 'סַבְתָּא', meaning: 'אִמָּא שֶׁל אִמָּא', level: 'medium', slots: 3 },
  { id: 'm20', word: 'יָרֵחַ', meaning: 'מֵאִיר בַּלַּיְלָה', level: 'medium', slots: 3 },

  // --- hard -----------------------------------------------------------------
  { id: 'h01', word: 'שֻׁלְחָן', meaning: 'אוֹכְלִים עָלָיו', level: 'hard', slots: 3 },
  { id: 'h02', word: 'עִפָּרוֹן', meaning: 'כּוֹתְבִים אִתּוֹ', level: 'hard', slots: 3 },
  { id: 'h03', word: 'פַּרְפַּר', meaning: 'הָיָה פַּעַם זַחַל', level: 'hard', slots: 3 },
  { id: 'h04', word: 'אַרְיֵה', meaning: 'מֶלֶךְ הַחַיּוֹת', level: 'hard', slots: 3 },
  { id: 'h05', word: 'גְּלִידָה', meaning: 'מְתוּקָה וְקָרָה', level: 'hard', slots: 3 },
  { id: 'h06', word: 'דֶּרֶךְ', meaning: 'הוֹלְכִים בָּהּ', level: 'hard', slots: 3 },
  { id: 'h07', word: 'אֲדָמָה', meaning: 'צוֹמְחִים בָּהּ עֵצִים', level: 'hard', slots: 3 },
  { id: 'h08', word: 'עֲבוֹדָה', meaning: 'הַהוֹרִים הוֹלְכִים אֵלֶיהָ', level: 'hard', slots: 3 },
  { id: 'h09', word: 'שְׂמֵחָה', meaning: 'מְחַיֶּכֶת מֵאֹשֶׁר', level: 'hard', slots: 3 },
  { id: 'h10', word: 'חֻלְצָה', meaning: 'לוֹבְשִׁים אוֹתָהּ', level: 'hard', slots: 3 },
  { id: 'h11', word: 'מַתָּנָה', meaning: 'מְקַבְּלִים בְּיוֹם הֻלֶּדֶת', level: 'hard', slots: 3 },
  { id: 'h12', word: 'יְלָדִים', meaning: 'הַרְבֵּה יֶלֶד וְיַלְדָּה', level: 'hard', slots: 3 },
  { id: 'h13', word: 'שְׁמֹנֶה', meaning: 'אַחֲרֵי שֶׁבַע', level: 'hard', slots: 3 },
  { id: 'h14', word: 'חֲבֵרִים', meaning: 'מְשַׂחֲקִים בְּיַחַד', level: 'hard', slots: 3 },
  { id: 'h15', word: 'מִשְׂחָק', meaning: 'כֵּיף לְשַׂחֵק בּוֹ', level: 'hard', slots: 3 },
  { id: 'h16', word: 'סְפָרִים', meaning: 'עוֹמְדִים בַּסִּפְרִיָּה', level: 'hard', slots: 3 },
  { id: 'h17', word: 'חַשְׁמַל', meaning: 'מַדְלִיק אֶת הָאוֹר', level: 'hard', slots: 3 },
  { id: 'h18', word: 'מִשְׁפָּחָה', meaning: 'אַבָּא אִמָּא וִילָדִים', level: 'hard', slots: 4 },
  {
    id: 'h19',
    word: 'מַחְבֶּרֶת',
    meaning: 'כּוֹתְבִים בָּהּ שִׁעוּרִים',
    level: 'hard',
    slots: 4,
  },
  { id: 'h20', word: 'סֻכָּרִיָּה', meaning: 'מְתוּקָה וְטַעֲמָהּ טוֹב', level: 'hard', slots: 4 },
];

export const WORDS_BY_LEVEL = {
  easy: WORDS.filter((w) => w.level === 'easy'),
  medium: WORDS.filter((w) => w.level === 'medium'),
  hard: WORDS.filter((w) => w.level === 'hard'),
} as const;
