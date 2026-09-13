/**
 * The calm tools.
 *
 * Small, repeatable things to do in the middle of a chapter: 30–60 seconds,
 * spoken out loud, doable with the screen face-down. They are **components,
 * not content** — a story picks a tool by name and may override its words, so
 * a new story never needs new code.
 *
 * Every tool is named from inside the story world rather than after what it
 * does, so the name can be used again away from the app: "בוא נעשה פנס כיס"
 * carries, "let's do a body scan" does not.
 *
 * Deliberately absent: any breath-hold, any count-in-and-hold, anything fast.
 * The one breathing tool follows a slow opening flower and never asks for a
 * pause at the top. Nothing here scores, times out, competes, or claims a
 * child should feel calm at the end.
 */

export type CalmToolId =
  'flower' | 'lantern' | 'thousand' | 'curtain' | 'toolbox' | 'duck' | 'quiet';

export interface CalmTool {
  id: CalmToolId;
  /** The name it is called by, in and out of the app. */
  name: string;
  /** One line under the name, before it is opened. */
  blurb: string;
  icon: string;
  /**
   * How it is played out. `breathe` and `pulse` animate a shape; `steps` walks
   * a short list; `pick` offers options with nothing recorded; `hold` hands
   * over a length of quiet that the child starts and ends herself.
   */
  mode: 'breathe' | 'pulse' | 'steps' | 'pick' | 'hold';
  /** Roughly how long, in seconds — shown so nobody has to guess. */
  seconds: number;
  /** Said once when it opens. */
  intro: string;
  /** For `steps` and `breathe`: what to do, one line at a time. */
  steps?: readonly string[];
  /** For `pick`: things to try. Choosing one changes nothing and stores nothing. */
  options?: readonly string[];
  /** For `hold`: the lengths on offer, in seconds. She picks, and she stops. */
  holds?: readonly number[];
  /** The last line, after it is done or skipped. Never "now you are calm". */
  outro: string;
}

export const CALM_TOOLS: Readonly<Record<CalmToolId, CalmTool>> = {
  /* --- breathing, exactly once, and slow ------------------------------- */
  flower: {
    id: 'flower',
    name: 'פֶּרַח הַלַּיְלָה',
    blurb: 'נִפְתָּח לְאַט, נִסְגָּר לְאַט',
    icon: 'flower',
    mode: 'breathe',
    seconds: 45,
    intro:
      'הַפֶּרַח נִפְתָּח לְאַט מְאוֹד. אֶפְשָׁר לִנְשֹׁם אִתּוֹ, וְאֶפְשָׁר רַק לְהִסְתַּכֵּל.',
    steps: ['נִפְתָּח…', 'נִסְגָּר…'],
    outro: 'הַפֶּרַח נִשְׁאָר שָׁם. אֶפְשָׁר לַחֲזֹר אֵלָיו מָתַי שֶׁרוֹצִים.',
  },

  /* --- letting go of the body ------------------------------------------ */
  lantern: {
    id: 'lantern',
    name: 'פָּנָס הַכִּיס',
    blurb: 'אוֹר קָטָן עוֹבֵר עַל הַכְּתֵפַיִם וְהַיָּדַיִם',
    icon: 'bulb',
    mode: 'steps',
    seconds: 60,
    intro:
      'דַּמְיְנוּ פָּנָס קָטָן שֶׁעוֹבֵר לְאַט. בְּכָל מָקוֹם שֶׁהוּא מֵאִיר, מַרְפִּים קְצָת.',
    steps: [
      'הַפָּנָס עַל הַכְּתֵפַיִם. מְרִימִים אוֹתָן לָאָזְנַיִם… וּמַפִּילִים.',
      'הַפָּנָס עַל הַיָּדַיִם. סוֹגְרִים אֶגְרוֹף… וּפוֹתְחִים אֶת הָאֶצְבָּעוֹת.',
      'הַפָּנָס עַל הַלֶּסֶת. פּוֹתְחִים אֶת הַפֶּה כְּמוֹ פִּהוּק גָּדוֹל.',
      'הַפָּנָס כָּבֶה. הַיָּדַיִם נִשְׁאָרוֹת רַכּוֹת.',
    ],
    outro: 'זֶהוּ. אֶפְשָׁר לְהַדְלִיק אֶת הַפָּנָס שׁוּב מָתַי שֶׁרוֹצִים.',
  },

  /* --- listening ------------------------------------------------------- */
  thousand: {
    id: 'thousand',
    name: 'אֶלֶף הַקּוֹלוֹת',
    blurb: 'לְמַצֹּא שְׁלוֹשָׁה קוֹלוֹת בַּחֶדֶר',
    icon: 'ear',
    mode: 'steps',
    seconds: 45,
    intro: 'בַּתֵּאַטְרוֹן יֵשׁ אֶלֶף קוֹלוֹת. כָּאן מַסְפִּיק לִמְצֹא שְׁלוֹשָׁה.',
    steps: [
      'קוֹל אֶחָד שֶׁבָּא מִבַּחוּץ.',
      'קוֹל אֶחָד שֶׁבָּא מִתּוֹךְ הַבַּיִת.',
      'קוֹל אֶחָד שֶׁבָּא מִכֶּם — נְשִׁימָה, בֶּגֶד שֶׁמִּתְקַמֵּט, כְּרִית.',
    ],
    outro: 'מִי מָצָא קוֹל שֶׁהַשֵּׁנִי לֹא שָׁמַע?',
  },

  /* --- imagery --------------------------------------------------------- */
  curtain: {
    id: 'curtain',
    name: 'מֵאֲחוֹרֵי הַוִּילוֹן',
    blurb: 'מָקוֹם קָטָן וְשָׁקֵט שֶׁרַק אַתֶּם מַמְצִיאִים',
    icon: 'moon',
    mode: 'steps',
    seconds: 60,
    intro:
      'בְּכָל תֵּאַטְרוֹן יֵשׁ פִּנָּה מֵאֲחוֹרֵי הַוִּילוֹן. עַכְשָׁו מַמְצִיאִים אֶת שֶׁלָּכֶם.',
    steps: [
      'מָה יֵשׁ שָׁם לָשֶׁבֶת עָלָיו?',
      'אֵיזֶה צֶבַע הַוִּילוֹן?',
      'מָה נִשְׁמָע מִשָּׁם — רָחוֹק וְשָׁקֵט?',
      'מִי מֻתָּר לוֹ לְהִכָּנֵס? אֶפְשָׁר גַּם אַף אֶחָד.',
    ],
    outro: 'הַפִּנָּה נִשְׁאֶרֶת שָׁם גַּם כְּשֶׁסּוֹגְרִים אֶת הַסֵּפֶר.',
  },

  /* --- choosing, with nothing recorded --------------------------------- */
  toolbox: {
    id: 'toolbox',
    name: 'אַרְגַּז הָאַבְזָרִים',
    blurb: 'מָה יָכוֹל לַעֲזֹר עַכְשָׁו',
    icon: 'bag',
    mode: 'pick',
    seconds: 30,
    intro:
      'לְמַנְהֵל הַבָּמָה יֵשׁ אַרְגָּז לְכָל מַצָּב. מָה הָיִיתֶם לוֹקְחִים מִמֶּנּוּ עַכְשָׁו?',
    options: [
      'חִבּוּק',
      'קְצָת מֶרְחָב',
      'מַיִם קָרִים',
      'לְסַפֵּר מָה קָרָה',
      'לְהִשָּׁאֵר בְּשֶׁקֶט',
      'מַשֶּׁהוּ אַחֵר',
    ],
    outro: 'אֵין כָּאן תְּשׁוּבָה נְכוֹנָה, וְאֶפְשָׁר לְשַׁנּוֹת דַּעַת בְּעוֹד רֶגַע.',
  },

  /* --- a silence with somebody in charge of it ------------------------- */
  /*
   * The point is the *job*, not the quiet. A silence that arrives on its own
   * is something happening to you; a silence you set the length of, start, and
   * end whenever you like is a thing you are doing. Stopping early is named on
   * the card as a normal move, not a failure — the child is the one holding
   * the stopwatch, and that is the whole exercise.
   */
  quiet: {
    id: 'quiet',
    name: 'מְנַהֶלֶת הַשֶּׁקֶט',
    blurb: 'אַתְּ מַחְלִיטָה כַּמָּה, וְאַתְּ מַחְלִיטָה מָתַי נִגְמָר',
    icon: 'moon',
    mode: 'hold',
    seconds: 40,
    intro:
      'בַּתֵּאַטְרוֹן מִישֶׁהוּ אַחְרַאי עַל הַשֶּׁקֶט — כַּמָּה הוּא נִמְשָׁךְ וּמָתַי הוּא נִגְמָר. עַכְשָׁו זֶה אַתֶּם. בּוֹחֲרִים אֹרֶךְ, וְעוֹצְרִים בְּדִיּוּק מָתַי שֶׁבָּא לָכֶם.',
    holds: [5, 10, 20, 40],
    outro: 'זֶה הָיָה שֶׁקֶט שֶׁלָּכֶם. גַּם אִם עָצַרְתֶּם אַחֲרֵי שְׁנִיָּה וָחֵצִי.',
  },

  /* --- the slow, silly one --------------------------------------------- */
  duck: {
    id: 'duck',
    name: 'הַבַּרְוָז הָאִטִּי',
    blurb: 'לְהַגִּיד ״גֵּע״ לְאַט־לְאַט',
    icon: 'heart',
    mode: 'pulse',
    seconds: 40,
    intro:
      'הַבַּרְוָז מִתְגַּלְגֵּל לְאַט. כָּל פַּעַם שֶׁהוּא נֶעֱצָר — אוֹמְרִים ״גֵּע״, בְּשֶׁקֶט.',
    steps: ['מִתְגַּלְגֵּל…', 'גֵּע.'],
    outro: 'הַבַּרְוָז עָיֵף. גַּם הוּא הוֹלֵךְ לִישֹׁן.',
  },
};

export const CALM_TOOL_IDS = Object.keys(CALM_TOOLS) as CalmToolId[];

export function isCalmToolId(value: unknown): value is CalmToolId {
  return typeof value === 'string' && value in CALM_TOOLS;
}
