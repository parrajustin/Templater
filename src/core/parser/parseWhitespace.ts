import { None, Option, Some } from "../../lib/option";
import { ParserConfig, ParsingData } from "./parser";
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
    let firstChar = content[0];
    if (firstChar === undefined) {
        return [None, content];
    }

    let whitespace: Option<Whitespace> = None;
    if (firstChar === config.multipleWhitespace) {
        whitespace = Some(Whitespace.Multiple);
    } else if (firstChar === config.singleWhitespace) {
        whitespace = Some(Whitespace.Single);
    }

    let restContent = content;
    if (whitespace.some) {
        restContent = content.slice(1);
        parsingData.ch += 1;
    }

    return [whitespace, restContent];
}
