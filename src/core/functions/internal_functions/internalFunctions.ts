import type TemplaterPlugin from "main";
import type { IGenerateObject } from "core/functions/iGenerateObject";
import type { InternalModule } from "./internalModule";
import { InternalModuleDate } from "./date/InternalModuleDate";
import { InternalModuleFile } from "./file/InternalModuleFile";
import { InternalModuleWeb } from "./web/InternalModuleWeb";
import { InternalModuleHooks } from "./hooks/InternalModuleHooks";
import { InternalModuleFrontmatter } from "./frontmatter/InternalModuleFrontmatter";
import { InternalModuleSystem } from "./system/InternalModuleSystem";
import type { RunningConfig } from "core/templater";
import { InternalModuleConfig } from "./config/InternalModuleConfig";
import type { StatusError } from "../../../lib/status_error";
import { Ok, type Result } from "../../../lib/result";
import type { App } from "obsidian";

export class InternalFunctions implements IGenerateObject {
    private _modulesArray: InternalModule[] = [];

    constructor(
        _app: App,
        protected plugin: TemplaterPlugin
    ) {
        this._modulesArray.push(new InternalModuleDate(_app, this.plugin));
        this._modulesArray.push(new InternalModuleFile(_app, this.plugin));
        this._modulesArray.push(new InternalModuleWeb(_app, this.plugin));
        this._modulesArray.push(new InternalModuleFrontmatter(_app, this.plugin));
        this._modulesArray.push(new InternalModuleHooks(_app, this.plugin));
        this._modulesArray.push(new InternalModuleSystem(_app, this.plugin));
        this._modulesArray.push(new InternalModuleConfig(_app, this.plugin));
    }

    public async init(): Promise<void> {
        for (const mod of this._modulesArray) {
            await mod.init();
        }
    }

    public async teardown(): Promise<void> {
        for (const mod of this._modulesArray) {
            await mod.teardown();
        }
    }

    public async generateObject(
        config: RunningConfig
    ): Promise<Result<Record<string, unknown>, StatusError>> {
        const internalFunctionsObject: { [key: string]: unknown } = {};

        for (const mod of this._modulesArray) {
            internalFunctionsObject[mod.getName()] = await mod.generateObject(config);
        }

        return Ok(internalFunctionsObject);
    }
}
