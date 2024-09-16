import type { Option } from "../../lib/option";
import { None, Some } from "../../lib/option";
import { Whitespace } from "./parseTokens";

/**
 * Splits the `content` on the last occurance of the `delimiter` without including it.
 * @param content the content to split
 * @param delimiter the string to split the `content` on
 * @returns suffix and prefix from the last delimiter not including it
 */
export function SplitOnce(content: string, delimiter: string): Option<[string, string]> {
    const lastIndex = content.indexOf(delimiter);
    if (lastIndex === -1) {
        return None;
    }

    const prefix = content.slice(0, lastIndex);
    const suffix = content.slice(lastIndex + delimiter.length);
    return Some([prefix, suffix] as [string, string]);
}

export function CountNewLines(content: string): number {
    return (content.match(/\n/g) || []).length;
}

/** Types of whitespace to remove in single whitespace mode. */
const WHITESPACE_TYPES = ["\r\n", "\n", "\r"];
/**
 * Trims whitespace from the content.
 * @param content content to trim whitespace of
 * @param whitespace type of whitespace trimmer to use
 * @param trimEnd if trim the end or not
 * @returns trimmed content
 */
export function TrimWhitespace(
    content: string,
    whitespace: Option<Whitespace>,
    trimEnd: boolean
): string {
    if (whitespace.none) {
        return content;
    }
    if (trimEnd && whitespace.safeValue() === Whitespace.MULTIPLE) {
        return content.trimEnd();
    } else if (!trimEnd && whitespace.safeValue() === Whitespace.MULTIPLE) {
        return content.trimStart();
    } else if (trimEnd) {
        for (const whitespaceExample of WHITESPACE_TYPES) {
            if (content.endsWith(whitespaceExample)) {
                return content.slice(0, content.length - whitespaceExample.length);
            }
        }
    }
    for (const whitespaceExample of WHITESPACE_TYPES) {
        if (content.startsWith(whitespaceExample)) {
            return content.slice(0 + whitespaceExample.length);
        }
    }
    return content;
}
