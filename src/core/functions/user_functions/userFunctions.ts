import type TemplaterPlugin from "main";
import type { RunningConfig } from "core/templater";
import type { IGenerateObject } from "../iGenerateObject";
import { UserScriptFunctions } from "./userScriptFunctions";
import type { App } from "obsidian";
import type { StatusError } from "../../../lib/status_error";
import { Ok, type Result } from "../../../lib/result";

export class UserFunctions implements IGenerateObject {
    private _userScriptFunctions: UserScriptFunctions;

    constructor(
        _app: App,
        private _plugin: TemplaterPlugin
    ) {
        this._userScriptFunctions = new UserScriptFunctions(_app, _plugin);
    }

    public async generateObject(
        _config: RunningConfig
    ): Promise<Result<Record<string, unknown>, StatusError>> {
        let userScriptFunctions = {};

        // user_scripts_folder needs to be explicitly set to '/' to query from root
        if (this._plugin.settings.userScriptsFolder) {
            const generateObjectResult = await this._userScriptFunctions.generateObject();
            if (!generateObjectResult.ok) {
                return generateObjectResult;
            }
            userScriptFunctions = generateObjectResult.safeUnwrap();
        }

        return Ok({
            ...userScriptFunctions
        });
    }
}
