import { InternalModule } from "../internalModule";
import type { ModuleName } from "editor/tpDocumentation";
import { Ok, type StatusResult } from "../../../../lib/result";
import {
    InvalidArgumentError,
    NotFoundError,
    type StatusError
} from "../../../../lib/status_error";
import { LogError } from "../../../../utils/log";
import { TFile } from "obsidian";

/** Internal module to expose templator api. */
export class InternalModuleTemplator extends InternalModule {
    public name: ModuleName = "templator";

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        this.staticFunctions.set(
            "createNewNoteFromTemplate",
            async (
                outputFolder: string,
                outputFileName: string,
                templatePath: string,
                params: Record<string, unknown>
            ) => {
                const templateFile = this.app.vault.getAbstractFileByPath(templatePath);
                if (templateFile === null) {
                    LogError(NotFoundError(`Template file "${templatePath}" does not exist.`));
                    return;
                }
                if (!(templateFile instanceof TFile)) {
                    LogError(
                        InvalidArgumentError(`Template file "${templatePath}" is not a file.`)
                    );
                    return;
                }
                const result = await this.plugin.templater.createNewNoteFromTemplate(
                    templateFile,
                    outputFolder,
                    outputFileName,
                    /*openNewNote=*/ false,
                    params
                );
                if (result.err) {
                    LogError(result.val);
                }
            }
        );
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async teardown(): Promise<void> {}
}
