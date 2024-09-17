import type TemplaterPlugin from "main";
import { Templater } from "core/templater";
import type { Settings } from "settings/settings";
import type { EventRef, Menu, MenuItem, TAbstractFile, TFile } from "obsidian";
import { TFolder } from "obsidian";

export default class EventHandler {
    private _triggerOnFileCreationEvent: EventRef | undefined;

    constructor(
        private _plugin: TemplaterPlugin,
        private _templater: Templater,
        private _settings: Settings
    ) {}

    public async setup(): Promise<void> {
        this._plugin.app.workspace.onLayoutReady(() => {
            this.updateTriggerFileOnCreation();
        });
        await this.updateSyntaxHighlighting();
        this.updateFileMenu();
    }

    public async updateSyntaxHighlighting(): Promise<void> {
        const desktopShouldHighlight = this._plugin.editorHandler.desktopShouldHighlight();
        const mobileShouldHighlight = this._plugin.editorHandler.mobileShouldHighlight();

        if (desktopShouldHighlight || mobileShouldHighlight) {
            await this._plugin.editorHandler.enableHighlighter();
        } else {
            await this._plugin.editorHandler.disableHighlighter();
        }
    }

    public updateTriggerFileOnCreation(): void {
        if (this._settings.triggerOnFileCreation) {
            this._triggerOnFileCreationEvent = this._plugin.app.vault.on(
                "create",
                (file: TAbstractFile) => Templater.onFileCreation(this._templater, file)
            );
            this._plugin.registerEvent(this._triggerOnFileCreationEvent);
        } else {
            if (this._triggerOnFileCreationEvent) {
                this._plugin.app.vault.offref(this._triggerOnFileCreationEvent);
                this._triggerOnFileCreationEvent = undefined;
            }
        }
    }

    public updateFileMenu(): void {
        this._plugin.registerEvent(
            this._plugin.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
                if (file instanceof TFolder) {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle("Create new note from template")
                            .setIcon("templater-icon")
                            .onClick(() => {
                                this._plugin.fuzzySuggester.createNewNoteFromTemplate(file);
                            });
                    });
                }
            })
        );
    }
}
