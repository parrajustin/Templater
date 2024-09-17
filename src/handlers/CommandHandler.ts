import type TemplaterPlugin from "main";
import { ResolveTfile } from "utils/utils";
import { LogError } from "../utils/log";

export class CommandHandler {
    constructor(private _plugin: TemplaterPlugin) {}

    public setup(): void {
        this._plugin.addCommand({
            id: "insert-templater",
            name: "Open insert template modal",
            icon: "templater-icon",
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "e"
                }
            ],
            callback: () => {
                this._plugin.fuzzySuggester.insertTemplate();
            }
        });

        this._plugin.addCommand({
            id: "replace-in-file-templater",
            name: "Replace templates in the active file",
            icon: "templater-icon",
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "r"
                }
            ],
            callback: async () => {
                const overwriteResult = await this._plugin.templater.overwriteActiveFileCommands();
                if (!overwriteResult.ok) {
                    LogError(overwriteResult.val);
                }
            }
        });

        this._plugin.addCommand({
            id: "jump-to-next-cursor-location",
            name: "Jump to next cursor location",
            icon: "text-cursor",
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "Tab"
                }
            ],
            callback: async () => {
                await this._plugin.editorHandler.jumpToNextCursorLocation();
            }
        });

        this._plugin.addCommand({
            id: "create-new-note-from-template",
            name: "Create new note from template",
            icon: "templater-icon",
            hotkeys: [
                {
                    modifiers: ["Alt"],
                    key: "n"
                }
            ],
            callback: () => {
                this._plugin.fuzzySuggester.createNewNoteFromTemplate();
            }
        });

        this.registerTemplatesHotkeys();
    }

    public registerTemplatesHotkeys(): void {
        this._plugin.settings.enabledTemplatesHotkeys.forEach((template) => {
            if (template) {
                this.addTemplateHotkey(null, template);
            }
        });
    }

    public addTemplateHotkey(oldTemplate: string | null, newTemplate: string): void {
        this.removeTemplateHotkey(oldTemplate);

        if (newTemplate) {
            this._plugin.addCommand({
                id: newTemplate,
                name: `Insert ${newTemplate}`,
                icon: "templater-icon",
                callback: async () => {
                    const resolveResolt = ResolveTfile(this._plugin.app, newTemplate);
                    if (resolveResolt.err) {
                        return;
                    }
                    const appendTemplateResult =
                        await this._plugin.templater.appendTemplateToActiveFile(
                            resolveResolt.safeUnwrap()
                        );
                    if (!appendTemplateResult.ok) {
                        LogError(appendTemplateResult.val);
                    }
                }
            });
        }
    }

    public removeTemplateHotkey(template: string | null): void {
        if (template !== null) {
            // TODO: Find official way to do this
            this._plugin.app.commands.removeCommand(`${this._plugin.manifest.id}:${template}`);
        }
    }
}
