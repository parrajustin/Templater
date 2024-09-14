import { None, Option, Some } from "../../lib/option";
import { typeGuard } from "../../lib/type_guard";
import { ParserConfig } from "./parser";
import { TextToken, ParserToken, CommandToken, Whitespace, CommandType } from "./parseTokens";
import { TrimWhitespace } from "./util";


export function GenerateJs(config: ParserConfig, tokens: ParserToken[]): string {
    const REPLACEMENT_STR: string = "rJ2KqXzxQg";

    // TODO: Replace this ugly hack with an array that we would await at the end and .join()
    // The problem is that this is a breaking change since '+=' doesn't work on arrays, we need
    // .push()


    let jsText = `let __prs = [];\nlet ${config.globalVar} = '';\n`;

    let closingWhitespaceTrimType: Option<Whitespace> = None;
    let prevText: Option<string> = None;
    for (const token of tokens) {
        if (typeGuard<TextToken>(token, (token as TextToken).text !== undefined)) {
            prevText = Some(token.text);
        }
        if (typeGuard<CommandToken>(token, (token as CommandToken).command !== undefined)) {
            if (prevText.some) {
                let text = prevText.safeValue();
                // Trim based on a previous closing whitespace.
                text = TrimWhitespace(text, closingWhitespaceTrimType, /*trimEnd=*/false);
                // Trim on this command's opening whitespace.
                text = TrimWhitespace(text, token.command.openingWhitespace, /*trimEnd*/true);
                // Instead of escaping text just convert to base64 url then back.
                text = btoa(text);
                jsText = `${jsText}${config.globalVar}+=atob('${text}');\n`;
            }
            closingWhitespaceTrimType = token.command.closingWhitespace;
            prevText = None;

            switch (token.command.type) {
                case CommandType.Interpolate:
                    jsText = `${jsText}__prs.push(${token.command.content});\n`
                    jsText = `${jsText}${config.globalVar}+='${REPLACEMENT_STR}';\n`
                    break;
                case CommandType.Execution:
                    jsText = `${jsText}${token.command.content};\n`;
                    break;
            }
        }
    }
    if (prevText.some) {
        let text = prevText.safeValue();
        // Trim based on a previous closing whitespace.
        text = TrimWhitespace(text, closingWhitespaceTrimType, /*trimEnd=*/false);
        // Instead of escaping text just convert to base64 url then back.
        text = btoa(text);
        jsText = `${jsText}${config.globalVar}+=atob('${text}');\n`;

    }


    jsText += "const __rst = await Promise.all(__prs);\n";
    jsText += `${config.globalVar} = ${config.globalVar}.replace(/${REPLACEMENT_STR}/g, () => __rst.shift());\n`;
    jsText += `return ${config.globalVar};\n`;
    return jsText;
}
