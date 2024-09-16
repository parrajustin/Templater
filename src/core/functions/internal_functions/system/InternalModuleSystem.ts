import { InternalModule } from "../internalModule";
import { PromptModal } from "./PromptModal";
import { SuggesterModal } from "./SuggesterModal";
import type { ModuleName } from "editor/tpDocumentation";
import type { StatusResult } from "../../../../lib/result";
import { Ok } from "../../../../lib/result";
import type { StatusError } from "../../../../lib/status_error";

export class InternalModuleSystem extends InternalModule {
    public name: ModuleName = "system";

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        this.staticFunctions.set("clipboard", this.generateClipboard());
        this.staticFunctions.set("prompt", this.generatePrompt());
        this.staticFunctions.set("suggester", this.generateSuggester());
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public async teardown(): Promise<void> {}

    private generateClipboard(): () => Promise<string | null> {
        return async () => {
            return navigator.clipboard.readText();
        };
    }

    private generatePrompt(): (
        prompt_text: string,
        default_value: string,
        throw_on_cancel: boolean,
        multi_line: boolean
    ) => Promise<string | null> {
        return async (
            promptText: string,
            defaultValue: string,
            throwOnCancel = false,
            multiLine = false
        ): Promise<string | null> => {
            const prompt = new PromptModal(this.app, promptText, defaultValue, multiLine);
            const promise = new Promise<string>(
                (resolve: (value: string) => void, reject: (reason?: StatusError) => void) => {
                    prompt.openAndGetValue(resolve, reject);
                }
            );
            try {
                return await promise;
            } catch (error) {
                if (throwOnCancel) {
                    throw error;
                }
                return null;
            }
        };
    }

    private generateSuggester(): <T>(
        text_items: string[] | ((item: T) => string),
        items: T[],
        throw_on_cancel: boolean,
        placeholder: string,
        limit?: number
    ) => Promise<T> {
        return async <T>(
            textItems: string[] | ((item: T) => string),
            items: T[],
            throwOnCancel = false,
            placeholder = ""
        ): Promise<T> => {
            const suggester = new SuggesterModal(this.app, textItems, items, placeholder);
            const promise = new Promise(
                (resolve: (value: T) => void, reject: (reason?: StatusError) => void) => {
                    suggester.openAndGetValue(resolve, reject);
                }
            );
            try {
                return await promise;
            } catch (error) {
                if (throwOnCancel) {
                    throw error;
                }
                return null as T;
            }
        };
    }
}
