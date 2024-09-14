import { Err, Ok, Result } from "../../lib/result";
import { InvalidArgumentError, StatusError } from "../../lib/status_error";
import { ParserConfig, ParsingData } from "./parser";
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
    parsingData: ParsingData): Result<[CommandType, string], StatusError> {
    let firstChar = content[0];
    if (firstChar === undefined) {
        return Err(InvalidArgumentError("Missing command type."));
    }

    // TODO: improve this
    let restOfInput = content;
    let cmdType: CommandType = CommandType.Execution;
    if (firstChar === config.execution) {
        restOfInput = content.slice(1);
        parsingData.ch += 1;
        cmdType = CommandType.Execution;
    } else if (firstChar === config.interpolate) {
        restOfInput = content.slice(1);
        parsingData.ch += 1;
        cmdType = CommandType.Interpolate;
    } else {
        if (config.interpolate === '\0') {
            cmdType = CommandType.Interpolate;
        } else if (config.execution === '\0') {
            cmdType = CommandType.Execution;
        } else {
            return Err(InvalidArgumentError("Missing command type."));
        }
    };

    return Ok([cmdType, restOfInput] as any);
}
