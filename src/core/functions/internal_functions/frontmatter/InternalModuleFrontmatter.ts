import { Ok, type StatusResult } from "../../../../lib/result";
import type { StatusError } from "../../../../lib/status_error";
import { InternalModule } from "../internalModule";
import type { ModuleName } from "editor/tpDocumentation";

export class InternalModuleFrontmatter extends InternalModule {
    public name: ModuleName = "frontmatter";

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        const cache = this.app.metadataCache.getFileCache(this.config.targetFile);
        this.dynamicFunctions = new Map(Object.entries(cache?.frontmatter || {}));
        return Ok();
    }

    public async teardown(): Promise<void> {}
}
