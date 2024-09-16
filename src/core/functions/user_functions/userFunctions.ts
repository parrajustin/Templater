import type TemplaterPlugin from "main";
import type { RunningConfig } from "core/templater";
import type { IGenerateObject } from "../iGenerateObject";
import { UserScriptFunctions } from "./userScriptFunctions";
import type { App } from "obsidian";

export class UserFunctions implements IGenerateObject {
    private _userScriptFunctions: UserScriptFunctions;

    constructor(
        _app: App,
        private _plugin: TemplaterPlugin
    ) {
        this._userScriptFunctions = new UserScriptFunctions(_app, _plugin);
    }

    public async generateObject(_config: RunningConfig): Promise<Record<string, unknown>> {
        let userScriptFunctions = {};

        // user_scripts_folder needs to be explicitly set to '/' to query from root
        if (this._plugin.settings.user_scripts_folder) {
            userScriptFunctions = await this._userScriptFunctions.generateObject();
        }

        return {
            ...userScriptFunctions
        };
    }
}
