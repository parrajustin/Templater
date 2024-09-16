import { describe, expect, test } from "@jest/globals";
import type { ParserToken } from "../../../src/core/parser/parseTokens";
import { CommandType, ParseTokens, Whitespace } from "../../../src/core/parser/parseTokens";
import type { ParserConfig } from "../../../src/core/parser/parser";
import { None, Some } from "../../../src/lib/option";

function GetParserConfig(): ParserConfig {
    return {
        openingTag: "<%",
        closingTag: "%>",
        interpolate: "\0",
        execution: "*",
        singleWhitespace: "-",
        multipleWhitespace: "_",
        globalVar: "tR"
    };
}

describe("ParseTokens", () => {
    test("Parses example string", () => {
        const content = `
test<%_ test %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test`;

        const tokens = ParseTokens(GetParserConfig(), content);
        expect(tokens.ok).toBeTruthy();
        expect(tokens.unsafeUnwrap()).toStrictEqual([
            {
                type: "text",
                text: "\ntest"
            },
            {
                type: "command",
                command: {
                    type: CommandType.INTERPOLATE,
                    content: " test ",
                    openingWhitespace: Some(Whitespace.MULTIPLE),
                    closingWhitespace: None
                }
            },
            {
                type: "text",
                text: "test\n"
            },
            {
                type: "command",
                command: {
                    type: CommandType.INTERPOLATE,
                    content: " test ",
                    openingWhitespace: Some(Whitespace.SINGLE),
                    closingWhitespace: Some(Whitespace.MULTIPLE)
                }
            },
            {
                type: "text",
                text: "\ntest\n"
            },
            {
                type: "command",
                command: {
                    type: CommandType.EXECUTION,
                    content: " test ",
                    openingWhitespace: Some(Whitespace.MULTIPLE),
                    closingWhitespace: Some(Whitespace.SINGLE)
                }
            },
            {
                type: "text",
                text: " test "
            },
            {
                type: "command",
                command: {
                    type: CommandType.INTERPOLATE,
                    content: " test ",
                    openingWhitespace: None,
                    closingWhitespace: None
                }
            },
            {
                type: "text",
                text: "\ntest"
            }
        ] as ParserToken[]);
    });
});
