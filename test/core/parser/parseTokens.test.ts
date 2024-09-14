import { describe, expect, test } from "@jest/globals";
import {
    CommandType,
    ParserToken,
    ParseTokens,
    Whitespace
} from "../../../src/core/parser/parseTokens";
import { ParserConfig } from "../../../src/core/parser/parser";
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
        let content = `
test<%_ test %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test`;

        const tokens = ParseTokens(GetParserConfig(), content);
        expect(tokens.ok).toBeTruthy();
        expect(tokens.unsafeUnwrap()).toStrictEqual([
            {
                text: "\ntest"
            },
            {
                command: {
                    type: CommandType.Interpolate,
                    content: " test ",
                    openingWhitespace: Some(Whitespace.Multiple),
                    closingWhitespace: None
                }
            },
            {
                text: "test\n"
            },
            {
                command: {
                    type: CommandType.Interpolate,
                    content: " test ",
                    openingWhitespace: Some(Whitespace.Single),
                    closingWhitespace: Some(Whitespace.Multiple)
                }
            },
            {
                text: "\ntest\n"
            },
            {
                command: {
                    type: CommandType.Execution,
                    content: " test ",
                    openingWhitespace: Some(Whitespace.Multiple),
                    closingWhitespace: Some(Whitespace.Single)
                }
            },
            {
                text: " test "
            },
            {
                command: {
                    type: CommandType.Interpolate,
                    content: " test ",
                    openingWhitespace: None,
                    closingWhitespace: None
                }
            },
            { text: "\ntest" }
        ] as ParserToken[]);
    });
});
