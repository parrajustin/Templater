import type { EventRef } from "obsidian";
import type { ModuleName } from "editor/tpDocumentation";
import { Delay } from "utils/utils";
import { InternalModule } from "../internalModule";
import type { StatusResult } from "../../../../lib/result";
import { Ok } from "../../../../lib/result";
import type { StatusError } from "../../../../lib/status_error";

export class InternalModuleHooks extends InternalModule {
    public name: ModuleName = "hooks";
    private _eventRefs: EventRef[] = [];

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        this.staticFunctions.set("onAllTemplatesExecuted", this.generateOnAllTemplatesExecuted());
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async teardown(): Promise<void> {
        this._eventRefs.forEach((eventRef) => {
            eventRef.e.offref(eventRef);
        });
        this._eventRefs = [];
    }

    private generateOnAllTemplatesExecuted(): (callbackFunction: () => unknown) => void {
        return (callbackFunction) => {
            const eventRef = this.app.workspace.on("templater:all-templates-executed", async () => {
                await Delay(1);
                callbackFunction();
            });
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
            if (eventRef) {
                this._eventRefs.push(eventRef);
            }
        };
    }
}
