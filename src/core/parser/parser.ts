import { Err, Ok, Result } from "../../lib/result";
import { InternalError, StatusError } from "../../lib/status_error";
import { WrapPromise } from "../../lib/wrap_promise";
import { GenerateJs } from "./generateJs";
import { ParseTokens } from "./parseTokens";

export interface ParserConfig {
    /** The opening tag of the template. */
    openingTag: string;
    /** The closing tag of the template. */
    closingTag: string;
    /** Control char for interpolate mode. (meaning using dynamic execution.) */
    interpolate: string;
    /** Control string for execution mode. (static execution in line js.) */
    execution: string;
    /** Control string for single whitespace removal. */
    singleWhitespace: string;
    /** Control string for all whitespace removal. */
    multipleWhitespace: string;
    /** The name of the globalVar the data is kept in. */
    globalVar: string;
}

export interface ParsingData {
    line: number;
    ch: number;
}

const CORRECT_CONTEXT = Symbol("__Parser__Context__");

/**
 * Executes the parser within the closure.
 * @param config parser config
 * @param content data to parse
 * @returns the result of parsing the data and executing the js.
 */
async function ExecuteParser(
    config: ParserConfig,
    content: string
): Promise<Result<string, StatusError>> {
    if (this.context_identifier === undefined || this.context_identifier !== CORRECT_CONTEXT) {
        return Err(InternalError("Parser executed outside correct context."));
    }
    const contextNames: string[] = [];
    const contextValues: string[] = [];
    for (const key of Object.keys(this as Record<string, unknown>)) {
        if (key === "context_identifier") {
            continue;
        }
        contextNames.push(key);
        contextValues.push(`this["${key}"]`);
    }

    const tokens = ParseTokens(config, content);
    if (!tokens.ok) {
        return tokens;
    }
    const js = GenerateJs(config, tokens.safeUnwrap());
    const executionResult: string = await eval(
        `(async (globalThis, ${contextNames.join(",")}) => {${js}})(this,${contextValues.join(",")})`
    );
    return Ok(executionResult);
}

/** Template parser. */
export class Parser {
    private config: ParserConfig = {
        openingTag: "<%",
        closingTag: "%>",
        interpolate: "\0",
        execution: "*",
        singleWhitespace: "-",
        multipleWhitespace: "_",
        globalVar: "tR"
    };

    /** Can be used to replace the default parser config. */
    async init(config?: ParserConfig) {
        if (config !== undefined) {
            this.config = config;
        }
    }

    /**
     * Parses the input `content` and outputs the finished text data.
     * @param content data to parse.
     * @param context the scope information
     * @returns the parsed and resolved template.
     */
    async parseCommands(content: string, context: Record<string, unknown>): Promise<string> {
        context["context_identifier"] = CORRECT_CONTEXT;
        const boundFunc: typeof ExecuteParser = ExecuteParser.bind(context);
        return await (WrapPromise<Result<string, StatusError>, StatusError | unknown>(
            boundFunc(this.config, content)
        ).then((crashResult) => {
            if (crashResult.err) {
                return `${crashResult.val}`;
            }

            const crashResultVal = crashResult.safeUnwrap();
            if (crashResultVal.ok) {
                return crashResultVal.val;
            }

            return crashResultVal.val.toString();
        }));
    }
}
