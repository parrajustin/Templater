import type { Option } from "../lib/option";
import { NONE, Some } from "../lib/option";
import type { Result } from "../lib/result";
import { Err, Ok } from "../lib/result";
import type { App, TAbstractFile } from "obsidian";
import { normalizePath, TFile, TFolder, Vault } from "obsidian";
import type { StatusError } from "../lib/status_error";
import { InvalidArgumentError, NotFoundError } from "../lib/status_error";

export function Delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function EscapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export function GenerateCommandRegex(): RegExp {
    return /<%(?:-|_)?\s*[*~]{0,1}((?:.|\s)*?)(?:-|_)?%>/g;
}

export function GenerateDynamicCommandRegex(): RegExp {
    return /(<%(?:-|_)?\s*[*~]{0,1})\+((?:.|\s)*?%>)/g;
}

/**
 * Resolves the folder status.
 * @param app the obisidan app
 * @param folderStr the full path to the folder
 * @returns the result of the folder resolving.
 */
export function ResolveTfolder(app: App, folderStr: string): Result<TFolder, StatusError> {
    folderStr = normalizePath(folderStr);

    const folder = app.vault.getAbstractFileByPath(folderStr);
    if (folder === null) {
        return Err(NotFoundError("folder doesn't exist"));
    }
    if (!(folder instanceof TFolder)) {
        return Err(InvalidArgumentError("not a folder"));
    }

    return Ok(folder);
}

/**
 * Resolves the file status.
 * @param app the obisidan app
 * @param fileStr the full path to the file
 * @returns the result of the file resolving
 */
export function ResolveTfile(app: App, fileStr: string): Result<TFile, StatusError> {
    fileStr = normalizePath(fileStr);

    const file = app.vault.getAbstractFileByPath(fileStr);
    if (file === null) {
        return Err(NotFoundError("folder doesn't exist"));
    }
    if (!(file instanceof TFile)) {
        return Err(InvalidArgumentError("not a folder"));
    }

    return Ok(file);
}

/**
 * Get all files from a folder.
 * @param app the obisdian app
 * @param folderStr the full path to the folder
 * @returns the files under the folder if it exists
 */
export function GetTfilesFromFolder(app: App, folderStr: string): Result<TFile[], StatusError> {
    const folder = ResolveTfolder(app, folderStr);
    if (folder.err) {
        return folder;
    }

    const files: TFile[] = [];
    Vault.recurseChildren(folder.safeUnwrap(), (file: TAbstractFile) => {
        if (file instanceof TFile) {
            files.push(file);
        }
    });

    files.sort((a, b) => {
        return a.path.localeCompare(b.path);
    });

    return Ok(files);
}

export function Arraymove<T>(arr: T[], fromIndex: number, toIndex: number): void {
    if (toIndex === fromIndex) {
        return;
    }
    if (toIndex < 0 || toIndex >= arr.length) {
        return;
    }
    if (fromIndex < 0 || fromIndex >= arr.length) {
        return;
    }
    const element = arr[fromIndex] as T;
    arr[fromIndex] = arr[toIndex] as T;
    arr[toIndex] = element;
}

/** Get the active file of the app if any. */
export function GetActiveFile(app: App): Option<TFile> {
    return Some(app.workspace.activeEditor?.file ?? app.workspace.getActiveFile()).andThen<TFile>(
        (file) => {
            if (file === null) {
                return NONE;
            }
            return Some(file);
        }
    );
}

/**
 * @param path Normalized file path
 * @returns Folder path
 * @example
 * get_folder_path_from_path(normalizePath("path/to/folder/file", "md")) // path/to/folder
 */
export function GetFolderPathFromFilePath(path: string) {
    const pathSeparator = path.lastIndexOf("/");
    if (pathSeparator !== -1) return path.slice(0, pathSeparator);
    return "";
}
