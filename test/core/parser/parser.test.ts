import { describe, expect, test } from "@jest/globals";
import { Parser } from "../../../src/core/parser/parser";

describe("Parser", () => {
    test("parses data with correct context", async () => {
        let content = `
test<%_ test %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.type() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            "test": 5,
            "tp": {
                "type": () => "seedling"
            }
        };
        const parser = new Parser();
        await parser.init();
        const result = await parser.parseCommands(content, context);
        expect(result).toStrictEqual(`
test5test5test test 5
test.


This is a seedling file !
`);
    });

    test("returns error message on catch message", async () => {
        let content = `
test<%_ lol %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.type() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            "test": 5,
            "tp": {
                "type": () => "seedling"
            }
        };
        const parser = new Parser();
        await parser.init();
        const result = await parser.parseCommands(content, context);
        expect(result).toStrictEqual(`ReferenceError: lol is not defined`);
    });

    test("returns status error on parse failure", async () => {
        let content = `
test<%_ lol %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.type() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            "test": 5,
            "tp": {
                "type": () => "seedling"
            }
        };
        const parser = new Parser();
        const customBrokenConfig = {
            openingTag: "<%",
            closingTag: "%>",
            interpolate: "&",
            execution: "*",
            singleWhitespace: "-",
            multipleWhitespace: "_",
            globalVar: "tR"
        };
        await parser.init(customBrokenConfig);
        const result = await parser.parseCommands(content, context);
        expect(result).toContain(`INVALID_ARGUMENT: Missing command type.`);
    });
});
