import { InternalModule } from "../internalModule";
import type { RunningConfig } from "core/templater";
import type { ModuleName } from "editor/tpDocumentation";
import type { Result } from "../../../../lib/result";
import { Ok, type StatusResult } from "../../../../lib/result";
import type { StatusError } from "../../../../lib/status_error";

/** Internal module to expose the running config. */
export class InternalModuleConfig extends InternalModule {
    public name: ModuleName = "config";

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async teardown(): Promise<void> {}

    public override async generateObject(
        config: RunningConfig
    ): Promise<Result<Record<string, unknown>, StatusError>> {
        return Ok(config as unknown as Record<string, unknown>);
    }
}
