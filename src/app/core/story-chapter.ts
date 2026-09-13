import { blocksFromText, type Block, type Chapter, type StopBlock } from './story-types';

/**
 * How the stories that ship with the app are authored.
 *
 * A chapter is one block of text, written exactly as it would be pasted into
 * the editor — the same marks, the same rules — so a story shipped in here and
 * a story typed on a device are the same kind of thing: blank lines separate
 * paragraphs, `## ` is a sub-heading, `---` is a scene break, `> ` is a note
 * card, and `[[אם: סימן]]` … `[[סוף]]` is a branch.
 *
 * The one thing this adds is `@@stop`: a line on its own marking where the
 * next stop from the `stops` list goes, so nobody has to count paragraphs to
 * place one.
 */
export function chapter(
  id: string,
  title: string,
  order: number,
  text: string,
  stops: readonly StopBlock[],
): Chapter {
  const parts = text.split(/^@@stop$/m);
  const blocks: Block[] = [];
  parts.forEach((part, index) => {
    blocks.push(...blocksFromText(part, `${id}-${index}-`));
    const stop = stops[index];
    if (index < parts.length - 1 && stop) blocks.push(stop);
  });
  return { id, title, order, blocks };
}
