import { Option } from "../../lib/option"
import { Err, Ok, Result } from "../../lib/result";
import { NotFoundError, StatusError } from "../../lib/status_error";
import { ParseClosingTag } from "./parseClosingTag";
import { ParseCommandTag } from "./parseCommandTag";
import { ParserConfig, ParsingData } from "./parser";
import { ParseWhitespace } from "./parseWhitespace";
import { CountNewLines, SplitOnce } from "./util";

export enum CommandType {
    Interpolate,
    Execution,
}

export enum Whitespace {
    Single,
    Multiple,
}

export interface Command {
    type: CommandType;
    openingWhitespace: Option<Whitespace>;
    closingWhitespace: Option<Whitespace>;
    content: string;
}

export interface TextToken {
    text: string;
}
export interface CommandToken {
    command: Command;
}
export type ParserToken = TextToken | CommandToken;


/**
 * Parses the `content` to find the js templates data.
 * @param config parser config
 * @param content content to parse
 * @returns the in order tokens of the input content.
 */
export function ParseTokens(config: ParserConfig, content: string): Result<ParserToken[], StatusError> {
    const tokens: ParserToken[] = [];
    const parsingData: ParsingData = {line: 0, ch: 0};

    let input = content;
    let split = SplitOnce(input, config.openingTag);
    while (split.some) {
        const [prefix, suffix] = split.safeValue();
        parsingData.ch += config.openingTag.length;

        if (prefix.length !== 0) {
            tokens.push({ text: prefix });
            parsingData.ch += prefix.length;
            parsingData.line += CountNewLines(prefix);
        }
        if (suffix.length === 0) {
            return Err(NotFoundError(`No closing tag found (${JSON.stringify(parsingData)}).`));
        }

        // Basically parse char by char from the start.
        const [openingWhitespaceType, contentAfterWhitespace] = ParseWhitespace(config, suffix, parsingData);
        const parseCommandResult = ParseCommandTag(config, contentAfterWhitespace, parsingData);
        if (!parseCommandResult.ok) {
            return parseCommandResult;
        }
        const [commandType, contentAfterCommand] = parseCommandResult.safeUnwrap();

        // Get everything to the closing tag.
        const parseClosingTagResult = ParseClosingTag(config, contentAfterCommand, parsingData)
        if (!parseClosingTagResult.ok) {
            return parseClosingTagResult;
        }
        const [beforeClosing, afterClosing] = parseClosingTagResult.safeUnwrap();
        input = afterClosing;

        // Get the closing whitespace type.
        // TODO: improve that
        const endChar = beforeClosing.slice(beforeClosing.length-1);
        const [closingWhitespaceType, _] = ParseWhitespace(config, endChar, parsingData);
        let finalContent = beforeClosing;
        if (closingWhitespaceType.some) {
            finalContent = beforeClosing.slice(0, beforeClosing.length-1);
        }

        parsingData.ch += finalContent.length;
        parsingData.line += CountNewLines(finalContent);
        // Push this command data onto tokens.
        tokens.push({
            command: {
                type: commandType,
                openingWhitespace: openingWhitespaceType,
                closingWhitespace: closingWhitespaceType,
                content: finalContent
            }
        });

        split = SplitOnce(afterClosing, config.openingTag);
    }
    if (input.length !== 0) {
        tokens.push({ text: input });
        parsingData.ch += input.length;
        parsingData.line += CountNewLines(input);
    }

    return Ok(tokens);
}
