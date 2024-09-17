import type { TFile, TFolder } from "obsidian";
import { FuzzySuggestModal } from "obsidian";
import { GetTfilesFromFolder } from "utils/utils";
import type TemplaterPlugin from "main";
import { LogError } from "utils/log";

export enum OpenMode {
    INSERT_TEMPLATE,
    CREATE_NOTE_TEMPLATE
}

export class FuzzySuggester extends FuzzySuggestModal<TFile> {
    private _plugin: TemplaterPlugin;
    private _openMode: OpenMode;
    private _creationFolder: TFolder | undefined;

    constructor(plugin: TemplaterPlugin) {
        super(plugin.app);
        this._plugin = plugin;
        this.setPlaceholder("Type name of a template...");
    }

    public getItems(): TFile[] {
        if (!this._plugin.settings.templatesFolder) {
            return this._plugin.app.vault.getMarkdownFiles();
        }
        const templateFiles = GetTfilesFromFolder(
            this._plugin.app,
            this._plugin.settings.templatesFolder
        );
        if (templateFiles.err) {
            LogError(templateFiles.val);
            return [];
        }
        const files = templateFiles.safeUnwrap();
        return files;
    }

    public getItemText(item: TFile): string {
        let relativePath = item.path;
        if (item.path.startsWith(this._plugin.settings.templatesFolder)) {
            relativePath = item.path.slice(this._plugin.settings.templatesFolder.length + 1);
        }
        return relativePath.split(".").slice(0, -1).join(".");
    }

    public async onChooseItem(item: TFile): Promise<void> {
        switch (this._openMode) {
            case OpenMode.INSERT_TEMPLATE: {
                const appendResult = await this._plugin.templater.appendTemplateToActiveFile(item);
                if (appendResult.err) {
                    LogError(appendResult.val);
                }
                break;
            }
            case OpenMode.CREATE_NOTE_TEMPLATE: {
                const createResult = await this._plugin.templater.createNewNoteFromTemplate(
                    item,
                    this._creationFolder
                );
                if (createResult.err) {
                    LogError(createResult.val);
                }
                break;
            }
        }
    }

    public start(): void {
        try {
            this.open();
        } catch (e) {
            LogError(e);
        }
    }

    public insertTemplate(): void {
        this._openMode = OpenMode.INSERT_TEMPLATE;
        this.start();
    }

    public createNewNoteFromTemplate(folder?: TFolder): void {
        this._creationFolder = folder;
        this._openMode = OpenMode.CREATE_NOTE_TEMPLATE;
        this.start();
    }
}
