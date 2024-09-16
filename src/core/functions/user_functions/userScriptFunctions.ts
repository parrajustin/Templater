import { Notice, type App, type TFile } from "obsidian";
import type TemplaterPlugin from "main";
import type { IGenerateObject } from "../iGenerateObject";
import { GetTfilesFromFolder } from "utils/utils";
import type { StatusResult } from "../../../lib/result";
import { Err, Ok } from "../../../lib/result";
import type { StatusError } from "../../../lib/status_error";
import { InternalError, InvalidArgumentError } from "../../../lib/status_error";
// import { ErrorWrapperSync, TemplaterError } from "utils/Error";

interface ModuleInterface {
    exports: Record<string, unknown> | (() => void);
}

/**
 * User script context object generator.
 */
export class UserScriptFunctions implements IGenerateObject {
    constructor(
        private _app: App,
        private _plugin: TemplaterPlugin
    ) {}

    public async generateObject(): Promise<Record<string, unknown>> {
        const userScriptFunctions = await this.generateUserScriptFunctions();
        return Object.fromEntries(userScriptFunctions);
    }

    private async generateUserScriptFunctions(): Promise<Map<string, () => unknown>> {
        const userScriptFunctions: Map<string, () => unknown> = new Map();
        const userScripts = GetTfilesFromFolder(
            this._app,
            this._plugin.settings.user_scripts_folder
        );
        if (userScripts.err) {
            // eslint-disable-next-line no-console
            console.error("Failed to get user scripts.", userScripts.err);
            return new Map();
        }

        for (const file of userScripts.safeUnwrap()) {
            if (file.extension.toLowerCase() === "js") {
                const result = await this.loadUserScriptFunction(file, userScriptFunctions);
                if (result.err) {
                    new Notice(result.val.toString());
                }
            }
        }
        return userScriptFunctions;
    }

    /** Load the user script files as commonjs. */
    private async loadUserScriptFunction(
        file: TFile,
        userScriptFunctions: Map<string, () => unknown>
    ): Promise<StatusResult<StatusError>> {
        const req = (s: string) => {
            return window.require(s);
        };
        const exp: Record<string, unknown> = {};
        const mod: ModuleInterface = {
            exports: exp
        };

        const fileContent = await this._app.vault.read(file);
        try {
            const eval2 = eval;
            const wrappingFn = eval2(
                "(function anonymous(require, module, exports){" + fileContent + "\n})"
            );
            wrappingFn(req, mod, exp);
        } catch (err) {
            return Err(
                InternalError(`Failed to load user script at "${file.path}". (${err.message})`)
            );
        }
        const userFunction = (exp["default"] !== undefined ? exp.default : mod.exports) as
            | (() => void)
            | Record<string, unknown>
            | undefined
            | null;

        if (userFunction === undefined || userFunction === null) {
            return Err(
                InvalidArgumentError(`Userscript "${file.path}" does not export a default function`)
            );
        }
        if (!(userFunction instanceof Function)) {
            return Err(
                InvalidArgumentError(`Userscript "${file.path}" default is not a function.`)
            );
        }
        userScriptFunctions.set(`${file.basename}`, userFunction as () => unknown);
        return Ok();
    }
}
