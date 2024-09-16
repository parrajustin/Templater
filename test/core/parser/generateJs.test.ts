import { describe, expect, test } from "@jest/globals";
import { ParseTokens } from "../../../src/core/parser/parseTokens";
import { GenerateJs } from "../../../src/core/parser/generateJs";
import type { ParserConfig } from "../../../src/core/parser/parser";

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

describe("GenerateJs", () => {
    test("Generate Correct js", async () => {
        const content = `<%- test -%>\ntest\n\n<%_* test %>'test'<% test %>`;

        const tokens = ParseTokens(GetParserConfig(), content);
        expect(tokens.ok).toBeTruthy();
        const jsFunc = GenerateJs(GetParserConfig(), tokens.unsafeUnwrap());
        expect(jsFunc).toEqual(`let __prs = [];
let tR = '';
__prs.push( test );
tR+='rJ2KqXzxQg';
tR+=atob('dGVzdA==');
 test ;
tR+=atob('J3Rlc3Qn');
__prs.push( test );
tR+='rJ2KqXzxQg';
const __rst = await Promise.all(__prs);
tR = tR.replace(/rJ2KqXzxQg/g, () => __rst.shift());
return tR;
`);
    });

    test("Validate whitespace control", async () => {
        const content = `\ntest\n\n<%_ test -%>\r\n\ntest\n\r<%-* test _%>\rtest\r\n<%-* test -%> test <% test %>\ntest`;

        const tokens = ParseTokens(GetParserConfig(), content);
        expect(tokens.ok).toBeTruthy();
        const jsFunc = GenerateJs(GetParserConfig(), tokens.unsafeUnwrap());
        expect(jsFunc).toEqual(`let __prs = [];
let tR = '';
tR+=atob('CnRlc3Q=');
__prs.push( test );
tR+='rJ2KqXzxQg';
tR+=atob('CnRlc3QK');
 test ;
tR+=atob('dGVzdA==');
 test ;
tR+=atob('IHRlc3Qg');
__prs.push( test );
tR+='rJ2KqXzxQg';
tR+=atob('CnRlc3Q=');
const __rst = await Promise.all(__prs);
tR = tR.replace(/rJ2KqXzxQg/g, () => __rst.shift());
return tR;
`);
    });
});
