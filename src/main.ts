import { addIcon, Plugin } from "obsidian";
import type { Settings } from "settings/Settings";
import { DEFAULT_SETTINGS, TemplaterSettingTab } from "settings/Settings";
import { FuzzySuggester } from "handlers/FuzzySuggester";
import { ICON_DATA } from "utils/Constants";
import { Templater } from "core/templater";
import EventHandler from "handlers/EventHandler";
import { CommandHandler } from "handlers/CommandHandler";
import { Editor } from "editor/Editor";

export default class TemplaterPlugin extends Plugin {
    public settings: Settings;
    public templater: Templater;
    public eventHandler: EventHandler;
    public commandHandler: CommandHandler;
    public fuzzySuggester: FuzzySuggester;
    public editorHandler: Editor;

    public async onload(): Promise<void> {
        await this.loadSettings();

        this.templater = new Templater(this.app, this);
        await this.templater.setup();

        this.editorHandler = new Editor(this);
        await this.editorHandler.setup();

        this.fuzzySuggester = new FuzzySuggester(this);

        this.eventHandler = new EventHandler(this, this.templater, this.settings);
        this.eventHandler.setup();

        this.commandHandler = new CommandHandler(this);
        this.commandHandler.setup();

        addIcon("templater-icon", ICON_DATA);
        this.addRibbonIcon("templater-icon", "Templater", async () => {
            this.fuzzySuggester.insert_template();
        }).setAttribute("id", "rb-templater-icon");

        this.addSettingTab(new TemplaterSettingTab(this.app, this));

        // Files might not be created yet
        this.app.workspace.onLayoutReady(async () => {
            await this.templater.executeStartupScripts();
        });

        // type: string;
        // // The description of the handler.
        // desc: string;
        // // Callback function handler.
        // // eslint-disable-next-line @typescript-eslint/no-explicit-any
        // func: (params: any) => Promise<{ ok: boolean; err?: string }>;
        this.app.workspace.trigger("register-foreign-handler", {
            type: "execute-template",
            desc: "on the currently active file active the specified template.",
            func: () => Promise.resolve({ ok: true })
        });
    }

    public async onunload(): Promise<void> {
        // Failsafe in case teardown doesn't happen immediately after template execution
        await this.templater.functionsGenerator.teardown();
    }

    public async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    public async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
}
