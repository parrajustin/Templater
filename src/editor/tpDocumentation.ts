import type { Settings } from "settings/settings";
import { GetTfilesFromFolder } from "utils/utils";
import { DOCUMENTATION } from "./documentation";
import type { App } from "obsidian";

const moduleNames = [
    "config",
    "date",
    "file",
    "frontmatter",
    "hooks",
    "obsidian",
    "system",
    "user",
    "web"
] as const;
export type ModuleName = (typeof moduleNames)[number];
const moduleNamesChecker: Set<string> = new Set(moduleNames);

export function IsModuleName(x: unknown): x is ModuleName {
    return typeof x === "string" && moduleNamesChecker.has(x);
}

export type TpDocumentation = {
    tp: {
        [key in ModuleName]: TpModuleDocumentation;
    };
};

export type TpModuleDocumentation = {
    name: string;
    description: string;
    functions: {
        [key: string]: TpFunctionDocumentation;
    };
};

export type TpFunctionDocumentation = {
    name: string;
    definition: string;
    description: string;
    example: string;
    args?: {
        [key: string]: TpArgumentDocumentation;
    };
};

export type TpArgumentDocumentation = {
    name: string;
    description: string;
};

export type TpSuggestDocumentation = TpModuleDocumentation | TpFunctionDocumentation;

export function IsFunctionDocumentation(x: TpSuggestDocumentation): x is TpFunctionDocumentation {
    if ((x as TpFunctionDocumentation).definition) {
        return true;
    }
    return false;
}

export class Documentation {
    public documentation: TpDocumentation = DOCUMENTATION as unknown as TpDocumentation;

    constructor(
        private _app: App,
        private _settings: Settings
    ) {}

    public getAllModulesDocumentation(): TpModuleDocumentation[] {
        return Object.values(this.documentation.tp);
    }

    public getAllFunctionsDocumentation(
        moduleName: ModuleName
    ): TpFunctionDocumentation[] | undefined {
        if (moduleName === "user") {
            const userScriptFiles = GetTfilesFromFolder(
                this._app,
                this._settings.userScriptsFolder
            );
            const files = userScriptFiles.ok ? userScriptFiles.safeUnwrap() : [];
            if (files.length === 0) {
                return;
            }
            return files.reduce<TpFunctionDocumentation[]>((processedFiles, file) => {
                if (file.extension !== "js") return processedFiles;
                return [
                    ...processedFiles,
                    {
                        name: file.basename,
                        definition: "",
                        description: "",
                        example: ""
                    }
                ];
            }, []);
        }
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (this.documentation.tp[moduleName] === undefined) {
            return undefined;
        }
        return Object.values(this.documentation.tp[moduleName].functions);
    }

    public getModuleDocumentation(moduleName: ModuleName): TpModuleDocumentation {
        return this.documentation.tp[moduleName];
    }

    public getFunctionDocumentation(
        moduleName: ModuleName,
        functionName: string
    ): TpFunctionDocumentation | null {
        return this.documentation.tp[moduleName].functions[
            functionName
        ] as TpFunctionDocumentation | null;
    }

    public getArgumentDocumentation(
        moduleName: ModuleName,
        functionName: string,
        argumentName: string
    ): TpArgumentDocumentation | null {
        const functionDoc = this.getFunctionDocumentation(moduleName, functionName);
        if (!functionDoc || !functionDoc.args) {
            return null;
        }
        return functionDoc.args[argumentName] as TpArgumentDocumentation | null;
    }
}
