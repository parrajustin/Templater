import { Err, Ok, Result } from "../../lib/result";
import { InvalidArgumentError, StatusError } from "../../lib/status_error";
import { ParserConfig, ParsingData } from "./parser";
import { SplitOnce } from "./util";

/**
 * Parse the content to remove the closing tag.
 * @param config parsing config
 * @param content content to parse
 * @param parsingData parsing data debug
 * @returns the data befre and after the closing tag.
 */
export function ParseClosingTag(
    config: ParserConfig,
    content: string,
    parsingData: ParsingData
): Result<[string, string], StatusError> {
    const split = SplitOnce(content, config.closingTag);
    if (!split.some) {
        return Err(InvalidArgumentError("Missing closing tag."));
    }
    const [prefix, suffix] = split.safeValue();
    parsingData.ch += config.closingTag.length;
    return Ok([prefix, suffix] as [string, string]);
}
