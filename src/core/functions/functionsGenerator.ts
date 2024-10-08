import { InternalFunctions } from "./internal_functions/internalFunctions";
import { UserFunctions } from "./user_functions/userFunctions";
import type TemplaterPlugin from "main";
import type { IGenerateObject } from "./iGenerateObject";
import type { RunningConfig } from "core/templater";
import * as obsidianModule from "obsidian";
import type { App } from "obsidian";
import type { StatusError } from "../../lib/status_error";
import type { Result } from "../../lib/result";
import { Ok } from "../../lib/result";

export enum FunctionsMode {
    INTERNAL,
    USER_INTERNAL
}

export class FunctionsGenerator implements IGenerateObject {
    public internalFunctions: InternalFunctions;
    public userFunctions: UserFunctions;

    constructor(
        _app: App,
        private _plugin: TemplaterPlugin
    ) {
        this.internalFunctions = new InternalFunctions(_app, this._plugin);
        this.userFunctions = new UserFunctions(_app, this._plugin);
    }

    /** Initialize the internal functions. */
    public async init(): Promise<void> {
        await this.internalFunctions.init();
    }

    /** Tears down the internal functions. */
    public async teardown(): Promise<void> {
        await this.internalFunctions.teardown();
    }

    public async generateObject(
        config: RunningConfig,
        functionsMode: FunctionsMode = FunctionsMode.USER_INTERNAL
    ): Promise<Result<Record<string, unknown>, StatusError>> {
        const finalObject = {};
        const additionalFunctionsObject = this.additionalFunctions();
        const internalResult = await this.internalFunctions.generateObject(config);
        if (!internalResult.ok) {
            return internalResult;
        }
        const internalFunctionsObject = internalResult.safeUnwrap();

        Object.assign(finalObject, additionalFunctionsObject);
        switch (functionsMode) {
            case FunctionsMode.INTERNAL:
                Object.assign(finalObject, internalFunctionsObject);
                break;
            case FunctionsMode.USER_INTERNAL: {
                const generateResult = await this.userFunctions.generateObject(config);
                if (generateResult.err) {
                    return generateResult;
                }
                Object.assign(finalObject, {
                    ...internalFunctionsObject,
                    user: generateResult.safeUnwrap()
                });
                break;
            }
        }

        return Ok(finalObject);
    }

    /** Additional functions to add to the generator. Currenlty just adds the obsidian api. */
    private additionalFunctions(): Record<string, unknown> {
        return {
            obsidian: obsidianModule
        };
    }
}
