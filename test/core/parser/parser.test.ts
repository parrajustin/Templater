import { describe, expect, test } from "@jest/globals";
import { Parser } from "../../../src/core/parser/parser";
import { UnimplementedError } from "../../../src/lib/status_error";

describe("Parser", () => {
    test("parses data with correct context", async () => {
        const content = `
test<%_ test %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.customFunc() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            test: 5,
            tp: {
                customFunc: () => "seedling"
            }
        };
        const parser = new Parser();
        await parser.init();
        const result = await parser.parseCommands(content, context);
        expect(result.ok).toBeTruthy();
        expect(result.unsafeUnwrap()).toStrictEqual(`
test5test5test test 5
test.


This is a seedling file !
`);
    });

    test("returns error message on catch message", async () => {
        const content = `
test<%_ lol %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.customFunc() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            test: 5,
            tp: {
                customFunc: () => "seedling"
            }
        };
        const parser = new Parser();
        await parser.init();
        const result = await parser.parseCommands(content, context);
        expect(result.err).toBeTruthy();
        expect(result.val.toString()).toContain(`ReferenceError: lol is not defined`);
    });

    test("returns status error on parse failure", async () => {
        const content = `
test<%_ test %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.customFunc() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            test: 5,
            tp: {
                customFunc: () => "seedling"
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
        expect(result.err).toBeTruthy();
        expect(result.val.toString()).toContain(`INVALID_ARGUMENT: Missing command type.`);
    });

    test("catches thrown StatusError", async () => {
        const content = `
test<%_ test %>test
<%- test _%>
test
<%_* test -%> test <% test %>
test.

<%* if (tp.customFunc() === "seedling") { %>
This is a seedling file !
<%* } else { %>
This is a normal file !
<%* } %>`;

        const context = {
            test: 5,
            tp: {
                customFunc: () => {
                    throw UnimplementedError("Test UnimplementedError");
                }
            }
        };
        const parser = new Parser();
        const customBrokenConfig = {
            openingTag: "<%",
            closingTag: "%>",
            interpolate: "\0",
            execution: "*",
            singleWhitespace: "-",
            multipleWhitespace: "_",
            globalVar: "tR"
        };
        await parser.init(customBrokenConfig);
        const result = await parser.parseCommands(content, context);
        expect(result.err).toBeTruthy();
        expect(result.val.toString()).toContain(`Test UnimplementedError`);
    });
});
