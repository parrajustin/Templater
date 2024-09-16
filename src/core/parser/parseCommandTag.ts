import type { Result } from "../../lib/result";
import { Err, Ok } from "../../lib/result";
import type { StatusError } from "../../lib/status_error";
import { InvalidArgumentError } from "../../lib/status_error";
import type { ParserConfig, ParsingData } from "./parser";
import { CommandType } from "./parseTokens";

/**
 * Parses the content to get the command tag.
 * @param config parser config
 * @param content content to parse
 * @param parsingData debug parsing data
 * @returns result of command type and rest of content
 */
export function ParseCommandTag(
    config: ParserConfig,
    content: string,
    parsingData: ParsingData
): Result<[commandCharType: CommandType, textPastInitialCommand: string], StatusError> {
    const firstChar = content[0];
    if (firstChar === undefined) {
        return Err(InvalidArgumentError("Missing command type."));
    }

    // TODO: improve this
    let restOfInput = content;
    let cmdType: CommandType = CommandType.EXECUTION;
    if (firstChar === config.execution) {
        restOfInput = content.slice(1);
        parsingData.ch += 1;
        cmdType = CommandType.EXECUTION;
    } else if (firstChar === config.interpolate) {
        restOfInput = content.slice(1);
        parsingData.ch += 1;
        cmdType = CommandType.INTERPOLATE;
    } else {
        if (config.interpolate === "\0") {
            cmdType = CommandType.INTERPOLATE;
        } else if (config.execution === "\0") {
            cmdType = CommandType.EXECUTION;
        } else {
            return Err(InvalidArgumentError("Missing command type."));
        }
    }

    return Ok([cmdType, restOfInput] as [CommandType, string]);
}
