import type { Option } from "../../lib/option";
import { NONE, Some } from "../../lib/option";
import type { ParserConfig, ParsingData } from "./parser";
import { Whitespace } from "./parseTokens";

/**
 * Parses the whitespace.
 * @param config parsing config
 * @param content content to parse whitespace
 * @param parsingData parsing current data location
 * @returns parsed data
 */
export function ParseWhitespace(
    config: ParserConfig,
    content: string,
    parsingData: ParsingData
): [Option<Whitespace>, string] {
    const firstChar = content[0];
    if (firstChar === undefined) {
        return [NONE, content];
    }

    let whitespace: Option<Whitespace> = NONE;
    if (firstChar === config.multipleWhitespace) {
        whitespace = Some(Whitespace.MULTIPLE);
    } else if (firstChar === config.singleWhitespace) {
        whitespace = Some(Whitespace.SINGLE);
    }

    let restContent = content;
    if (whitespace.some) {
        restContent = content.slice(1);
        parsingData.ch += 1;
    }

    return [whitespace, restContent];
}
