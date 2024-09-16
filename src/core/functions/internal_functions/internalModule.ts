import type TemplaterPlugin from "main";
import type { RunningConfig } from "core/templater";
import type { IGenerateObject } from "core/functions/iGenerateObject";
import type { ModuleName } from "editor/tpDocumentation";
import type { StatusError } from "../../../lib/status_error";
import type { StatusResult } from "../../../lib/result";
import { Ok, type Result } from "../../../lib/result";
import type { App } from "obsidian";

export abstract class InternalModule implements IGenerateObject {
    /** The generated static functions. */
    protected staticFunctions: Map<string, unknown> = new Map();
    /** The generated dynamic functions. */
    protected dynamicFunctions: Map<string, unknown> = new Map();
    protected config: RunningConfig;
    /** Pre cached static context of static functions. */
    protected staticObject: { [x: string]: unknown };
    public abstract name: ModuleName;

    constructor(
        protected app: App,
        protected plugin: TemplaterPlugin
    ) {}

    /** Get module name. */
    public getName(): ModuleName {
        return this.name;
    }

    /** Initialize the internal module. */
    public async init(): Promise<StatusResult<StatusError>> {
        const createStaticResult = await this.createStaticTemplates();
        if (!createStaticResult.ok) {
            return createStaticResult;
        }
        this.staticObject = Object.fromEntries(this.staticFunctions);
        return Ok();
    }

    public async generateObject(
        newConfig: RunningConfig
    ): Promise<Result<Record<string, unknown>, StatusError>> {
        this.config = newConfig;
        const createDynamicResult = await this.createDynamicTemplates();
        if (!createDynamicResult.ok) {
            return createDynamicResult;
        }

        return Ok({
            ...this.staticObject,
            ...Object.fromEntries(this.dynamicFunctions)
        });
    }

    /** Create the module's static functions. */
    public abstract createStaticTemplates(): Promise<StatusResult<StatusError>>;
    /** Create the module's dynamic functions. */
    public abstract createDynamicTemplates(): Promise<StatusResult<StatusError>>;
    public abstract teardown(): Promise<void>;
}
