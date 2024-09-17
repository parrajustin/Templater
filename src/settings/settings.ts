import type { App, ButtonComponent, TAbstractFile } from "obsidian";
import { PluginSettingTab, Setting, TFile, TFolder } from "obsidian";
import type TemplaterPlugin from "main";
import { Arraymove, GetTfilesFromFolder } from "utils/utils";
import { LogError } from "utils/log";
import { FailedPreconditionError } from "../lib/status_error";

export interface FolderTemplate {
    folder: string;
    template: string;
}

export const DEFAULT_SETTINGS: Settings = {
    commandTimeout: 5,
    templatesFolder: "",
    templatesPairs: [["", ""]],
    triggerOnFileCreation: false,
    autoJumpToCursor: false,
    userScriptsFolder: "",
    enableFolderTemplates: true,
    folderTemplates: [{ folder: "", template: "" }],
    syntaxHighlighting: true,
    syntaxHighlightingMobile: false,
    enabledTemplatesHotkeys: [""],
    startupTemplates: [""]
};

export interface Settings {
    commandTimeout: number;
    templatesFolder: string;
    templatesPairs: [string, string][];
    triggerOnFileCreation: boolean;
    autoJumpToCursor: boolean;
    userScriptsFolder: string;
    enableFolderTemplates: boolean;
    folderTemplates: FolderTemplate[];
    syntaxHighlighting: boolean;
    syntaxHighlightingMobile: boolean;
    enabledTemplatesHotkeys: string[];
    startupTemplates: string[];
}

export class TemplaterSettingTab extends PluginSettingTab {
    plugin: TemplaterPlugin;
    constructor(app: App, plugin: TemplaterPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    public display(): void {
        this.containerEl.empty();

        this.addTemplateFolderSetting();
        this.addinternalFunctionsSetting();
        this.addSyntaxHighlightingSettings();
        this.addAutoJumpToCursor();
        this.addTriggerOnNewFileCreationSetting();
        this.addTemplatesHotkeysSetting();
        if (this.plugin.settings.triggerOnFileCreation) {
            this.addFolderTemplatesSetting();
        }
        this.addStartupTemplatesSetting();
        this.addUserScriptFunctionsSetting();
    }

    private addTemplateFolderSetting(): void {
        new Setting(this.containerEl)
            .setName("Template folder location")
            .setDesc("Files in this folder will be available as templates.")
            .addDropdown((cb) => {
                const abstractFiles = this.app.vault.getAllLoadedFiles();
                abstractFiles.forEach((folder: TAbstractFile) => {
                    if (folder instanceof TFolder) {
                        cb.addOption(folder.path, folder.path);
                    }
                });
                cb.setValue(this.plugin.settings.templatesFolder).onChange(async (newFolder) => {
                    this.plugin.settings.templatesFolder = newFolder;
                    await this.plugin.saveSettings();
                });
                cb.selectEl.addClass("templater_search");
            });
    }

    private addinternalFunctionsSetting(): void {
        const desc = document.createDocumentFragment();
        desc.append(
            "Templater provides multiples predefined variables / functions that you can use.",
            desc.createEl("br"),
            "Check the ",
            desc.createEl("a", {
                href: "https://silentvoid13.github.io/Templater/",
                text: "documentation"
            }),
            " to get a list of all the available internal variables / functions."
        );

        new Setting(this.containerEl).setName("Internal variables and functions").setDesc(desc);
    }

    private addSyntaxHighlightingSettings(): void {
        const desktopDesc = document.createDocumentFragment();
        desktopDesc.append("Adds syntax highlighting for Templater commands in edit mode.");

        const mobileDesc = document.createDocumentFragment();
        mobileDesc.append(
            "Adds syntax highlighting for Templater commands in edit mode on " +
                "mobile. Use with caution: this may break live preview on mobile " +
                "platforms."
        );

        new Setting(this.containerEl)
            .setName("Syntax highlighting on desktop")
            .setDesc(desktopDesc)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.syntaxHighlighting)
                    .onChange(async (syntaxHighlighting) => {
                        this.plugin.settings.syntaxHighlighting = syntaxHighlighting;
                        await this.plugin.saveSettings();
                        await this.plugin.eventHandler.updateSyntaxHighlighting();
                    });
            });

        new Setting(this.containerEl)
            .setName("Syntax highlighting on mobile")
            .setDesc(mobileDesc)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.syntaxHighlightingMobile)
                    .onChange(async (syntaxHighlightingMobile) => {
                        this.plugin.settings.syntaxHighlightingMobile = syntaxHighlightingMobile;
                        await this.plugin.saveSettings();
                        await this.plugin.eventHandler.updateSyntaxHighlighting();
                    });
            });
    }

    private addAutoJumpToCursor(): void {
        const desc = document.createDocumentFragment();
        desc.append(
            "Automatically triggers ",
            desc.createEl("code", { text: "tp.file.cursor" }),
            " after inserting a template.",
            desc.createEl("br"),
            "You can also set a hotkey to manually trigger ",
            desc.createEl("code", { text: "tp.file.cursor" }),
            "."
        );

        new Setting(this.containerEl)
            .setName("Automatic jump to cursor")
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.autoJumpToCursor)
                    .onChange(async (autoJumpToCursor) => {
                        this.plugin.settings.autoJumpToCursor = autoJumpToCursor;
                        await this.plugin.saveSettings();
                    });
            });
    }

    private addTriggerOnNewFileCreationSetting(): void {
        const desc = document.createDocumentFragment();
        desc.append(
            "Templater will listen for the new file creation event, and replace every command it finds in the new file's content.",
            desc.createEl("br"),
            "This makes Templater compatible with other plugins like the Daily note core plugin, Calendar plugin, Review plugin, Note refactor plugin, ...",
            desc.createEl("br"),
            desc.createEl("b", {
                text: "Warning: "
            }),
            "This can be dangerous if you create new files with unknown / unsafe content on creation. Make sure that every new file's content is safe on creation."
        );

        new Setting(this.containerEl)
            .setName("Trigger Templater on new file creation")
            .setDesc(desc)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.triggerOnFileCreation)
                    .onChange(async (triggerOnFileCreation) => {
                        this.plugin.settings.triggerOnFileCreation = triggerOnFileCreation;
                        await this.plugin.saveSettings();
                        this.plugin.eventHandler.updateTriggerFileOnCreation();
                        // Force refresh
                        this.display();
                    });
            });
    }

    private addTemplatesHotkeysSetting(): void {
        new Setting(this.containerEl).setName("Template hotkeys").setHeading();

        const desc = document.createDocumentFragment();
        desc.append("Template hotkeys allows you to bind a template to a hotkey.");

        new Setting(this.containerEl).setDesc(desc);

        this.plugin.settings.enabledTemplatesHotkeys.forEach((template, index) => {
            const s = new Setting(this.containerEl)
                .addDropdown((cb) => {
                    const abstractFiles = this.app.vault.getAllLoadedFiles();
                    abstractFiles.forEach((item: TAbstractFile) => {
                        if (item instanceof TFile) {
                            cb.addOption(item.path, item.path);
                        }
                    });
                    cb.setValue(template).onChange(async (newTemplate) => {
                        if (
                            newTemplate &&
                            this.plugin.settings.enabledTemplatesHotkeys.contains(newTemplate)
                        ) {
                            LogError(
                                FailedPreconditionError(
                                    "This template is already bound to a hotkey"
                                )
                            );
                            return;
                        }
                        this.plugin.commandHandler.addTemplateHotkey(
                            this.plugin.settings.enabledTemplatesHotkeys[index] as string,
                            newTemplate
                        );
                        this.plugin.settings.enabledTemplatesHotkeys[index] = newTemplate;
                        await this.plugin.saveSettings();
                    });
                    cb.selectEl.addClass("templater_search");
                })
                .addExtraButton((cb) => {
                    cb.setIcon("any-key")
                        .setTooltip("Configure Hotkey")
                        .onClick(() => {
                            // TODO: Replace with future "official" way to do this
                            this.app.setting.openTabById("hotkeys");
                            const tab = this.app.setting.activeTab;
                            tab.searchInputEl.value = "Templater: Insert";
                            tab.updateHotkeyVisibility();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("up-chevron-glyph")
                        .setTooltip("Move up")
                        .onClick(async () => {
                            Arraymove(
                                this.plugin.settings.enabledTemplatesHotkeys,
                                index,
                                index - 1
                            );
                            await this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("down-chevron-glyph")
                        .setTooltip("Move down")
                        .onClick(async () => {
                            Arraymove(
                                this.plugin.settings.enabledTemplatesHotkeys,
                                index,
                                index + 1
                            );
                            await this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(async () => {
                            this.plugin.commandHandler.removeTemplateHotkey(
                                this.plugin.settings.enabledTemplatesHotkeys[index] as string
                            );
                            this.plugin.settings.enabledTemplatesHotkeys.splice(index, 1);
                            await this.plugin.saveSettings();
                            // Force refresh
                            this.display();
                        });
                });
            s.infoEl.remove();
        });

        new Setting(this.containerEl).addButton((cb) => {
            cb.setButtonText("Add new hotkey for template")
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.enabledTemplatesHotkeys.push("");
                    await this.plugin.saveSettings();
                    // Force refresh
                    this.display();
                });
        });
    }

    private addFolderTemplatesSetting(): void {
        this.containerEl.createEl("h2", { text: "Folder templates" });
        new Setting(this.containerEl).setName("Folder templates").setHeading();

        const descHeading = document.createDocumentFragment();
        descHeading.append(
            "Folder Templates are triggered when a new ",
            descHeading.createEl("strong", { text: "empty " }),
            "file is created in a given folder.",
            descHeading.createEl("br"),
            "Templater will fill the empty file with the specified template.",
            descHeading.createEl("br"),
            "The deepest match is used. A global default template would be defined on the root ",
            descHeading.createEl("code", { text: "/" }),
            "."
        );

        new Setting(this.containerEl).setDesc(descHeading);

        const descUseNewFileTemplate = document.createDocumentFragment();
        descUseNewFileTemplate.append(
            "When enabled Templater will make use of the folder templates defined below."
        );

        new Setting(this.containerEl)
            .setName("Enable folder templates")
            .setDesc(descUseNewFileTemplate)
            .addToggle((toggle) => {
                toggle
                    .setValue(this.plugin.settings.enableFolderTemplates)
                    .onChange(async (useNewFileTemplates) => {
                        this.plugin.settings.enableFolderTemplates = useNewFileTemplates;
                        await this.plugin.saveSettings();
                        // Force refresh
                        this.display();
                    });
            });

        if (!this.plugin.settings.enableFolderTemplates) {
            return;
        }

        new Setting(this.containerEl)
            .setName("Add new")
            .setDesc("Add new folder template")
            .addButton((button: ButtonComponent) => {
                button
                    .setTooltip("Add additional folder template")
                    .setButtonText("+")
                    .setCta()
                    .onClick(async () => {
                        this.plugin.settings.folderTemplates.push({
                            folder: "",
                            template: ""
                        });
                        await this.plugin.saveSettings();
                        this.display();
                    });
            });

        this.plugin.settings.folderTemplates.forEach((folderTemplate, index) => {
            const s = new Setting(this.containerEl)
                .addDropdown((cb) => {
                    const abstractFiles = this.app.vault.getAllLoadedFiles();
                    abstractFiles.forEach((item: TAbstractFile) => {
                        if (item instanceof TFile) {
                            cb.addOption(item.path, item.path);
                        }
                    });
                    cb.setValue(folderTemplate.folder).onChange(async (newFolder) => {
                        if (
                            newFolder &&
                            this.plugin.settings.folderTemplates.some((e) => e.folder == newFolder)
                        ) {
                            LogError(
                                FailedPreconditionError(
                                    "This folder already has a template associated with it"
                                )
                            );
                            return;
                        }

                        (this.plugin.settings.folderTemplates[index] as FolderTemplate).folder =
                            newFolder;
                        await this.plugin.saveSettings();
                    });
                    cb.selectEl.addClass("templater_search");
                })
                .addDropdown((cb) => {
                    const abstractFiles = this.app.vault.getAllLoadedFiles();
                    abstractFiles.forEach((item: TAbstractFile) => {
                        if (item instanceof TFolder) {
                            cb.addOption(item.path, item.path);
                        }
                    });
                    cb.setValue(folderTemplate.template).onChange(async (newTemplate) => {
                        (this.plugin.settings.folderTemplates[index] as FolderTemplate).template =
                            newTemplate;
                        await this.plugin.saveSettings();
                    });
                    cb.selectEl.addClass("templater_search");
                })
                .addExtraButton((cb) => {
                    cb.setIcon("up-chevron-glyph")
                        .setTooltip("Move up")
                        .onClick(async () => {
                            Arraymove(this.plugin.settings.folderTemplates, index, index - 1);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("down-chevron-glyph")
                        .setTooltip("Move down")
                        .onClick(async () => {
                            Arraymove(this.plugin.settings.folderTemplates, index, index + 1);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                })
                .addExtraButton((cb) => {
                    cb.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(async () => {
                            this.plugin.settings.folderTemplates.splice(index, 1);
                            await this.plugin.saveSettings();
                            this.display();
                        });
                });
            s.infoEl.remove();
        });
    }

    private addStartupTemplatesSetting(): void {
        new Setting(this.containerEl).setName("Startup templates").setHeading();

        const desc = document.createDocumentFragment();
        desc.append(
            "Startup templates are templates that will get executed once when Templater starts.",
            desc.createEl("br"),
            "These templates won't output anything.",
            desc.createEl("br"),
            "This can be useful to set up templates adding hooks to Obsidian events for example."
        );

        new Setting(this.containerEl).setDesc(desc);

        this.plugin.settings.startupTemplates.forEach((template, index) => {
            const s = new Setting(this.containerEl)
                .addDropdown((cb) => {
                    const abstractFiles = this.app.vault.getAllLoadedFiles();
                    abstractFiles.forEach((item: TAbstractFile) => {
                        if (item instanceof TFile) {
                            cb.addOption(item.path, item.path);
                        }
                    });
                    cb.setValue(template).onChange(async (newTemplate) => {
                        if (
                            newTemplate &&
                            this.plugin.settings.startupTemplates.contains(newTemplate)
                        ) {
                            LogError(
                                FailedPreconditionError("This startup template already exist")
                            );
                            return;
                        }
                        this.plugin.settings.startupTemplates[index] = newTemplate;
                        await this.plugin.saveSettings();
                    });
                    cb.selectEl.addClass("templater_search");
                })
                .addExtraButton((cb) => {
                    cb.setIcon("cross")
                        .setTooltip("Delete")
                        .onClick(async () => {
                            this.plugin.settings.startupTemplates.splice(index, 1);
                            await this.plugin.saveSettings();
                            // Force refresh
                            this.display();
                        });
                });
            s.infoEl.remove();
        });

        new Setting(this.containerEl).addButton((cb) => {
            cb.setButtonText("Add new startup template")
                .setCta()
                .onClick(async () => {
                    this.plugin.settings.startupTemplates.push("");
                    await this.plugin.saveSettings();
                    // Force refresh
                    this.display();
                });
        });
    }

    private addUserScriptFunctionsSetting(): void {
        new Setting(this.containerEl).setName("User script functions").setHeading();

        let desc = document.createDocumentFragment();
        desc.append(
            "All JavaScript files in this folder will be loaded as CommonJS modules, to import custom user functions.",
            desc.createEl("br"),
            "The folder needs to be accessible from the vault.",
            desc.createEl("br"),
            "Check the ",
            desc.createEl("a", {
                href: "https://silentvoid13.github.io/Templater/",
                text: "documentation"
            }),
            " for more information."
        );

        new Setting(this.containerEl)
            .setName("Script files folder location")
            .setDesc(desc)
            .addDropdown((cb) => {
                const abstractFiles = this.app.vault.getAllLoadedFiles();
                abstractFiles.forEach((folder: TAbstractFile) => {
                    if (folder instanceof TFolder) {
                        cb.addOption(folder.path, folder.path);
                    }
                });
                cb.setValue(this.plugin.settings.userScriptsFolder).onChange(async (newFolder) => {
                    this.plugin.settings.userScriptsFolder = newFolder;
                    await this.plugin.saveSettings();
                });
                cb.selectEl.addClass("templater_search");
            });

        desc = document.createDocumentFragment();
        let name: string;
        if (!this.plugin.settings.userScriptsFolder) {
            name = "No user scripts folder set";
        } else {
            const userScriptFiles = GetTfilesFromFolder(
                this.app,
                this.plugin.settings.userScriptsFolder
            );

            const files = userScriptFiles.ok ? userScriptFiles.safeUnwrap() : [];
            if (files.length === 0) {
                name = "No user scripts detected";
            } else {
                let count = 0;
                for (const file of files) {
                    if (file.extension === "js") {
                        count++;
                        desc.append(
                            desc.createEl("li", {
                                text: `tp.user.${file.basename}`
                            })
                        );
                    }
                }
                name = `Detected ${count} User Script(s)`;
            }
        }

        new Setting(this.containerEl)
            .setName(name)
            .setDesc(desc)
            .addExtraButton((extra) => {
                extra
                    .setIcon("sync")
                    .setTooltip("Refresh")
                    .onClick(() => {
                        // Force refresh
                        this.display();
                    });
            });
    }
}
