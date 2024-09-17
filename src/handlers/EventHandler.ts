import TemplaterPlugin from "main";
import { Templater } from "core/templater";
import { Settings } from "settings/Settings";
import {
    EventRef,
    Menu,
    MenuItem,
    TAbstractFile,
    TFile,
    TFolder,
} from "obsidian";

export default class EventHandler {
    private trigger_on_file_creation_event: EventRef | undefined;

    constructor(
        private plugin: TemplaterPlugin,
        private templater: Templater,
        private settings: Settings
    ) {}

    setup(): void {
        this.plugin.app.workspace.onLayoutReady(() => {
            this.update_trigger_file_on_creation();
        });
        this.update_syntax_highlighting();
        this.update_file_menu();
    }

    update_syntax_highlighting(): void {
        const desktopShouldHighlight =
            this.plugin.editorHandler.desktopShouldHighlight();
        const mobileShouldHighlight =
            this.plugin.editorHandler.mobileShouldHighlight();

        if (desktopShouldHighlight || mobileShouldHighlight) {
            this.plugin.editorHandler.enable_highlighter();
        } else {
            this.plugin.editorHandler.disable_highlighter();
        }
    }

    update_trigger_file_on_creation(): void {
        if (this.settings.triggerOnFileCreation) {
            this.trigger_on_file_creation_event = this.plugin.app.vault.on(
                "create",
                (file: TAbstractFile) =>
                    Templater.onFileCreation(this.templater, file)
            );
            this.plugin.registerEvent(this.trigger_on_file_creation_event);
        } else {
            if (this.trigger_on_file_creation_event) {
                this.plugin.app.vault.offref(this.trigger_on_file_creation_event);
                this.trigger_on_file_creation_event = undefined;
            }
        }
    }

    update_file_menu(): void {
        this.plugin.registerEvent(
            this.plugin.app.workspace.on("file-menu", (menu: Menu, file: TFile) => {
                if (file instanceof TFolder) {
                    menu.addItem((item: MenuItem) => {
                        item.setTitle("Create new note from template")
                            .setIcon("templater-icon")
                            .onClick(() => {
                                this.plugin.fuzzySuggester.create_new_note_from_template(
                                    file
                                );
                            });
                    });
                }
            })
        );
    }
}
