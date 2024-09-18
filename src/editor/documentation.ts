export const DOCUMENTATION = {
    tp: {
        user: {
            description: "This module exposes the userscripts.",
            name: "user"
        },
        templator: {
            description: "This module exposes Templater's internal api.\n",
            name: "templator",
            functions: {
                createNewNoteFromTemplate: {
                    definition: "tp.config.createNewNoteFromTemplate?",
                    description:
                        "If the file doesn't exist create a new file from the specified template.",
                    name: "createNewNoteFromTemplate",
                    args: [
                        {
                            description: "The contianing folder for the output.",
                            name: "outputFolder"
                        },
                        {
                            description: "The file name of the output.",
                            name: "outputFileName"
                        },
                        {
                            description: "The full path to the template.",
                            name: "templatePath"
                        },
                        {
                            description: "Dict of parameters to pass to the templator execution.",
                            name: "params"
                        }
                    ]
                }
            }
        },
        config: {
            description:
                "This module exposes Templater's running configuration.\n\nThis is mostly useful when writing scripts requiring some context information.\n",
            name: "config",
            functions: {
                activeFile: {
                    definition: "tp.config.activeFile?",
                    description: "The active file (if existing) when launching Templater.",
                    name: "activeFile"
                },
                runMode: {
                    definition: "tp.config.runMode",
                    description:
                        "The `RunMode`, representing the way Templater was launched (Create new from template, Append to active file, ...).",
                    name: "runMode"
                },
                targetFile: {
                    definition: "tp.config.targetFile",
                    description:
                        "The `TFile` object representing the target file where the template will be inserted.",
                    name: "targetFile"
                },
                templateFile: {
                    definition: "tp.config.templateFile",
                    description: "The `TFile` object representing the template file.",
                    name: "templateFile"
                },
                params: {
                    definition: "tp.config.params",
                    description: "User defined parameters if any.",
                    name: "params"
                }
            }
        },
        date: {
            description: "This module contains every internal function related to dates.",
            name: "date",
            functions: {
                now: {
                    definition:
                        'tp.date.now(format: string = "YYYY-MM-DD", offset?: number⎮string, reference?: string, reference_format?: string)',
                    description: "Retrieves the date.",
                    name: "now",
                    args: [
                        {
                            description:
                                'The format for the date. Defaults to `"YYYY-MM-DD"`. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).',
                            name: "format"
                        },
                        {
                            description:
                                "Duration to offset the date from. If a number is provided, duration will be added to the date in days. You can also specify the offset as a string using the ISO 8601 format.",
                            name: "offset"
                        },
                        {
                            description: "The date referential, e.g. set this to the note's title.",
                            name: "reference"
                        },
                        {
                            description:
                                "The format for the reference date. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).",
                            name: "reference_format"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.date.now() %>",
                            name: "Date now"
                        },
                        {
                            example: '<% tp.date.now("Do MMMM YYYY") %>',
                            name: "Date now with format"
                        },
                        {
                            example: '<% tp.date.now("YYYY-MM-DD", -7) %>',
                            name: "Last week"
                        },
                        {
                            example: '<% tp.date.now("YYYY-MM-DD", 7) %>',
                            name: "Next week"
                        },
                        {
                            example: '<% tp.date.now("YYYY-MM-DD", "P-1M") %>',
                            name: "Last month"
                        },
                        {
                            example: '<% tp.date.now("YYYY-MM-DD", "P1Y") %>',
                            name: "Next year"
                        },
                        {
                            example:
                                '<% tp.date.now("YYYY-MM-DD", 1, tp.file.title, "YYYY-MM-DD") %>',
                            name: "File's title date + 1 day (tomorrow)"
                        },
                        {
                            example:
                                '<% tp.date.now("YYYY-MM-DD", -1, tp.file.title, "YYYY-MM-DD") %>',
                            name: "File's title date - 1 day (yesterday)"
                        }
                    ]
                },
                tomorrow: {
                    definition: 'tp.date.tomorrow(format: string = "YYYY-MM-DD")',
                    description: "Retrieves tomorrow's date.",
                    name: "tomorrow",
                    args: [
                        {
                            description:
                                'The format for the date. Defaults to `"YYYY-MM-DD"`. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).',
                            name: "format"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.date.tomorrow() %>",
                            name: "Date tomorrow"
                        },
                        {
                            example: '<% tp.date.tomorrow("Do MMMM YYYY") %>',
                            name: "Date tomorrow with format"
                        }
                    ]
                },
                weekday: {
                    definition:
                        'tp.date.weekday(format: string = "YYYY-MM-DD", weekday: number, reference?: string, reference_format?: string)',
                    description: "",
                    name: "weekday",
                    args: [
                        {
                            description:
                                'The format for the date. Defaults to `"YYYY-MM-DD"`. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).',
                            name: "format"
                        },
                        {
                            description:
                                "Week day number. If the locale assigns Monday as the first day of the week, `0` will be Monday, `-7` will be last week's day.",
                            name: "weekday"
                        },
                        {
                            description: "The date referential, e.g. set this to the note's title.",
                            name: "reference"
                        },
                        {
                            description:
                                "The format for the reference date. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).",
                            name: "reference_format"
                        }
                    ],
                    examples: [
                        {
                            example: '<% tp.date.weekday("YYYY-MM-DD", 0) %>',
                            name: "This week's Monday"
                        },
                        {
                            example: '<% tp.date.weekday("YYYY-MM-DD", 7) %>',
                            name: "Next Monday"
                        },
                        {
                            example:
                                '<% tp.date.weekday("YYYY-MM-DD", 0, tp.file.title, "YYYY-MM-DD") %>',
                            name: "File's title Monday"
                        },
                        {
                            example:
                                '<% tp.date.weekday("YYYY-MM-DD", -7, tp.file.title, "YYYY-MM-DD") %>',
                            name: "File's title previous Monday"
                        }
                    ]
                },
                yesterday: {
                    definition: 'tp.date.yesterday(format: string = "YYYY-MM-DD")',
                    description: "Retrieves yesterday's date.",
                    name: "yesterday",
                    args: [
                        {
                            description:
                                'The format for the date. Defaults to `"YYYY-MM-DD"`. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).',
                            name: "format"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.date.yesterday() %>",
                            name: "Date yesterday"
                        },
                        {
                            example: '<% tp.date.yesterday("Do MMMM YYYY") %>',
                            name: "Date yesterday with format"
                        }
                    ]
                }
            },
            momentjs: {
                examples: [
                    {
                        example: '<% moment(tp.file.title, "YYYY-MM-DD").format("YYYY-MM-DD") %>',
                        name: "Date now"
                    },
                    {
                        example:
                            '<% moment(tp.file.title, "YYYY-MM-DD").startOf("month").format("YYYY-MM-DD") %>',
                        name: "Get start of month from note title"
                    },
                    {
                        example:
                            '<% moment(tp.file.title, "YYYY-MM-DD").endOf("month").format("YYYY-MM-DD") %>',
                        name: "Get end of month from note title"
                    }
                ]
            }
        },
        file: {
            description: "This module contains every internal function related to files.",
            name: "file",
            functions: {
                content: {
                    definition: "tp.file.content",
                    description:
                        "The string contents of the file at the time that Templater was executed. Manipulating this string will *not* update the current file.",
                    name: "content",
                    examples: [
                        {
                            example: "<% tp.file.content %>",
                            name: "Retrieve file content"
                        }
                    ]
                },
                createNew: {
                    definition:
                        "tp.file.createNew(template: TFile ⎮ string, filename?: string, open_new: boolean = false, folder?: TFolder | string)",
                    description:
                        "Creates a new file using a specified template or with a specified content.",
                    name: "createNew",
                    args: [
                        {
                            description:
                                "Either the template used for the new file content, or the file content as a string. If it is the template to use, you retrieve it with `tp.file.findTfile(TEMPLATENAME)`.",
                            name: "template"
                        },
                        {
                            description: 'The filename of the new file, defaults to "Untitled".',
                            name: "filename"
                        },
                        {
                            description:
                                "Whether to open or not the newly created file. Warning: if you use this option, since commands are executed asynchronously, the file can be opened first and then other commands are appended to that new file and not the previous file.",
                            name: "open_new"
                        },
                        {
                            description:
                                'The folder to put the new file in, defaults to Obsidian\'s default location. If you want the file to appear in a different folder, specify it with `"PATH/TO/FOLDERNAME"` or `app.vault.getAbstractFileByPath("PATH/TO/FOLDERNAME")`.',
                            name: "folder"
                        }
                    ],
                    examples: [
                        {
                            example:
                                '<%* await tp.file.createNew("MyFileContent", "MyFilename") %>',
                            name: "File creation"
                        },
                        {
                            example:
                                '<%* await tp.file.createNew(tp.file.findTfile("MyTemplate"), "MyFilename") %>',
                            name: "File creation with template"
                        },
                        {
                            example:
                                '<%* await tp.file.createNew("MyFileContent", "MyFilename", true) %>',
                            name: "File creation and open created note"
                        },
                        {
                            example:
                                '<%* await tp.file.createNew("MyFileContent", "MyFilename", false, tp.file.folder(true)) %>',
                            name: "File creation in current folder"
                        },
                        {
                            example:
                                '<%* await tp.file.createNew("MyFileContent", "MyFilename", false, "Path/To/MyFolder") %>',
                            name: "File creation in specified folder with string path"
                        },
                        {
                            example:
                                '<%* await tp.file.createNew("MyFileContent", "MyFilename", false, app.vault.getAbstractFileByPath("MyFolder")) %>',
                            name: "File creation in specified folder with TFolder"
                        },
                        {
                            example:
                                '[[<% (await tp.file.createNew("MyFileContent", "MyFilename")).basename %>]]',
                            name: "File creation and append link to current note"
                        }
                    ]
                },
                creationDate: {
                    definition: 'tp.file.creationDate(format: string = "YYYY-MM-DD HH:mm")',
                    description: "Retrieves the file's creation date.",
                    name: "creationDate",
                    args: [
                        {
                            description:
                                'The format for the date. Defaults to `"YYYY-MM-DD HH:mm"`. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).',
                            name: "format"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.file.creationDate() %>",
                            name: "File creation date"
                        },
                        {
                            example: '<% tp.file.creationDate("dddd Do MMMM YYYY HH:mm") %>',
                            name: "File creation date with format"
                        }
                    ]
                },
                cursor: {
                    definition: "tp.file.cursor(order?: number)",
                    description:
                        "Sets the cursor to this location after the template has been inserted. \n\nYou can navigate between the different cursors using the configured hotkey in Obsidian settings.\n",
                    name: "cursor",
                    args: [
                        {
                            description:
                                "The order of the different cursors jump, e.g. it will jump from 1 to 2 to 3, and so on.\nIf you specify multiple tp.file.cursor with the same order, the editor will switch to multi-cursor.\n",
                            name: "order"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.file.cursor() %>",
                            name: "File cursor"
                        },
                        {
                            example: "<% tp.file.cursor(1) %>Content<% tp.file.cursor(1) %>",
                            name: "File multi-cursor"
                        }
                    ]
                },
                cursorAppend: {
                    definition: "tp.file.cursorAppend(content: string)",
                    description: "Appends some content after the active cursor in the file.",
                    name: "cursorAppend",
                    args: [
                        {
                            description: "The content to append after the active cursor.",
                            name: "content"
                        }
                    ],
                    examples: [
                        {
                            example: '<% tp.file.cursorAppend("Some text") %>',
                            name: "File cursor append"
                        }
                    ]
                },
                exists: {
                    definition: "tp.file.exists(filepath: string)",
                    description:
                        "Check to see if a file exists by it's file path. The full path to the file, relative to the Vault and containing the extension, must be provided.",
                    name: "exists",
                    args: [
                        {
                            description:
                                "The full file path of the file we want to check existence for.",
                            name: "filepath"
                        }
                    ],
                    examples: [
                        {
                            example: '<% await tp.file.exists("MyFolder/MyFile.md") %>',
                            name: "File existence"
                        },
                        {
                            example:
                                '<% await tp.file.exists(tp.file.folder(true) + "/" + tp.file.title + ".md") %>',
                            name: "File existence of current file"
                        }
                    ]
                },
                findTfile: {
                    definition: "tp.file.findTfile(filename: string)",
                    description: "Search for a file and returns its `TFile` instance.",
                    name: "findTfile",
                    args: [
                        {
                            description: "The filename we want to search and resolve as a `TFile`.",
                            name: "filename"
                        }
                    ],
                    examples: [
                        {
                            example: '<% tp.file.findTfile("MyFile").basename %>',
                            name: "File find TFile"
                        }
                    ]
                },
                folder: {
                    definition: "tp.file.folder(relative: boolean = false)",
                    description: "Retrieves the file's folder name.",
                    name: "folder",
                    args: [
                        {
                            description:
                                "If set to `true`, appends the vault relative path to the folder name. If `false`, only retrieves name of folder. Defaults to `false`.",
                            name: "relative"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.file.folder() %>",
                            name: "File folder (Folder)"
                        },
                        {
                            example: "<% tp.file.folder(true) %>",
                            name: "File folder with relative path (Path/To/Folder)"
                        }
                    ]
                },
                include: {
                    definition: "tp.file.include(include_link: string ⎮ TFile)",
                    description:
                        "Includes the file's link content. Templates in the included content will be resolved.",
                    name: "include",
                    args: [
                        {
                            description:
                                'The link to the file to include, e.g. `"[[MyFile]]"`, or a TFile object. Also supports sections or blocks inclusions.',
                            name: "include_link"
                        }
                    ],
                    examples: [
                        {
                            example: '<% tp.file.include("[[Template1]]") %>',
                            name: "File include"
                        },
                        {
                            example: '<% tp.file.include(tp.file.findTfile("MyFile")) %>',
                            name: "File include TFile"
                        },
                        {
                            example: '<% tp.file.include("[[MyFile#Section1]]") %>',
                            name: "File include section"
                        },
                        {
                            example: '<% tp.file.include("[[MyFile#^block1]]") %>',
                            name: "File include block"
                        }
                    ]
                },
                lastModifiedDate: {
                    definition: 'tp.file.lastModifiedDate(format: string = "YYYY-MM-DD HH:mm")',
                    description: "Retrieves the file's last modification date.",
                    name: "lastModifiedDate",
                    args: [
                        {
                            description:
                                'The format for the date. Defaults to `"YYYY-MM-DD HH:mm"`. Refer to [format reference](https://momentjs.com/docs/#/displaying/format/).',
                            name: "format"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.file.lastModifiedDate() %>",
                            name: "File last modified date"
                        },
                        {
                            example: '<% tp.file.lastModifiedDate("dddd Do MMMM YYYY HH:mm") %>',
                            name: "File last modified date with format"
                        }
                    ]
                },
                move: {
                    definition: "tp.file.move(new_path: string, file_to_move?: TFile)",
                    description: "Moves the file to the desired vault location.",
                    name: "move",
                    args: [
                        {
                            description:
                                'The new vault relative path of the file, without the file extension. Note: the new path needs to include the folder and the filename, e.g. `"/Notes/MyNote"`.',
                            name: "new_path"
                        },
                        {
                            description: "The file to move, defaults to the current file.",
                            name: "file_to_move"
                        }
                    ],
                    examples: [
                        {
                            example: '<% await tp.file.move("/A/B/" + tp.file.title) %>',
                            name: "File move"
                        },
                        {
                            example: '<% await tp.file.move("/A/B/NewTitle") %>',
                            name: "File move and rename"
                        }
                    ]
                },
                path: {
                    definition: "tp.file.path(relative: boolean = false)",
                    description: "Retrieves the file's absolute path on the system.",
                    name: "path",
                    args: [
                        {
                            description:
                                "If set to `true`, only retrieves the vault's relative path.",
                            name: "relative"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.file.path() %>",
                            name: "File path"
                        },
                        {
                            example: "<% tp.file.path(true) %>",
                            name: "File relative path (relative to vault root)"
                        }
                    ]
                },
                rename: {
                    definition: "tp.file.rename(new_title: string)",
                    description: "Renames the file (keeps the same file extension).",
                    name: "rename",
                    args: [
                        {
                            description: "The new file title.",
                            name: "new_title"
                        }
                    ],
                    examples: [
                        {
                            example: '<% await tp.file.rename("MyNewName") %>',
                            name: "File rename"
                        },
                        {
                            example: '<% await tp.file.rename(tp.file.title + "2") %>',
                            name: "File append a 2 to the file name"
                        }
                    ]
                },
                selection: {
                    definition: "tp.file.selection()",
                    description: "Retrieves the active file's text selection.",
                    name: "selection",
                    examples: [
                        {
                            example: "<% tp.file.selection() %>",
                            name: "File selection"
                        }
                    ]
                },
                tags: {
                    definition: "tp.file.tags",
                    description: "Retrieves the file's tags (array of string).",
                    name: "tags",
                    examples: [
                        {
                            example: "<% tp.file.tags %>",
                            name: "File tags"
                        }
                    ]
                },
                title: {
                    definition: "tp.file.title",
                    description: "Retrieves the file's title.",
                    name: "title",
                    examples: [
                        {
                            example: "<% tp.file.title %>",
                            name: "File title"
                        },
                        {
                            example: '<% tp.file.title.split(" ")[1] %>',
                            name: "Strip the Zettelkasten ID of title (if space separated)"
                        }
                    ]
                }
            }
        },
        frontmatter: {
            description:
                "This modules exposes all the frontmatter variables of a file as variables.",
            name: "frontmatter"
        },
        hooks: {
            description:
                "This module exposes hooks that allow you to execute code when a Templater event occurs.",
            name: "hooks",
            functions: {
                onAllTemplatesExecuted: {
                    definition: "tp.hooks.onAllTemplatesExecuted(callback_function: () => any)",
                    description:
                        "Hooks into when all actively running templates have finished executing. Most of the time this will be a single template, unless you are using `tp.file.include` or `tp.file.createNew`.\n\nMultiple invokations of this method will have their callback functions run in parallel.",
                    name: "onAllTemplatesExecuted",
                    args: [
                        {
                            description:
                                "Callback function that will be executed when all actively running templates have finished executing.",
                            name: "callback_function"
                        }
                    ]
                }
            }
        },
        obsidian: {
            description: "This module exposes all the functions and classes from the Obsidian API.",
            name: "obsidian"
        },
        system: {
            description: "This module contains system related functions.",
            name: "system",
            functions: {
                clipboard: {
                    definition: "tp.system.clipboard()",
                    description: "Retrieves the clipboard's content.",
                    name: "clipboard",
                    examples: [
                        {
                            example: "<% tp.system.clipboard() %>",
                            name: "Clipboard"
                        }
                    ]
                },
                prompt: {
                    definition:
                        "tp.system.prompt(prompt_text?: string, default_value?: string, throw_on_cancel: boolean = false, multiline?: boolean = false)",
                    description: "Spawns a prompt modal and returns the user's input.",
                    name: "prompt",
                    args: [
                        {
                            description: "Text placed above the input field.",
                            name: "prompt_text"
                        },
                        {
                            description: "A default value for the input field.",
                            name: "default_value"
                        },
                        {
                            description:
                                "Throws an error if the prompt is canceled, instead of returning a `null` value.",
                            name: "throw_on_cancel"
                        },
                        {
                            description:
                                "If set to `true`, the input field will be a multiline textarea. Defaults to `false`.",
                            name: "multiline"
                        }
                    ],
                    examples: [
                        {
                            example: '<% tp.system.prompt("Please enter a value") %>',
                            name: "Prompt"
                        },
                        {
                            example: '<% tp.system.prompt("What is your mood today?", "happy") %>',
                            name: "Prompt with default value"
                        },
                        {
                            example:
                                '<% tp.system.prompt("What is your mood today?", null, false, true) %>',
                            name: "Multiline prompt"
                        }
                    ]
                },
                suggester: {
                    definition:
                        'tp.system.suggester(text_items: string[] ⎮ ((item: T) => string), items: T[], throw_on_cancel: boolean = false, placeholder: string = "", limit?: number = undefined)',
                    description: "Spawns a suggester prompt and returns the user's chosen item.",
                    name: "suggester",
                    args: [
                        {
                            description:
                                "Array of strings representing the text that will be displayed for each item in the suggester prompt. This can also be a function that maps an item to its text representation.",
                            name: "text_items"
                        },
                        {
                            description:
                                "Array containing the values of each item in the correct order.",
                            name: "items"
                        },
                        {
                            description:
                                "Throws an error if the prompt is canceled, instead of returning a `null` value.",
                            name: "throw_on_cancel"
                        },
                        {
                            description: "Placeholder string of the prompt.",
                            name: "placeholder"
                        },
                        {
                            description:
                                "Limit the number of items rendered at once (useful to improve performance when displaying large lists).",
                            name: "limit"
                        }
                    ],
                    examples: [
                        {
                            example:
                                '<% tp.system.suggester(["Happy", "Sad", "Confused"], ["Happy", "Sad", "Confused"]) %>',
                            name: "Suggester"
                        },
                        {
                            example:
                                '<% tp.system.suggester((item) => item, ["Happy", "Sad", "Confused"]) %>',
                            name: "Suggester with mapping function (same as above example)"
                        },
                        {
                            example:
                                "[[<% (await tp.system.suggester((item) => item.basename, app.vault.getMarkdownFiles())).basename %>]]",
                            name: "Suggester for files"
                        },
                        {
                            example:
                                '<% tp.system.suggester(item => item, Object.keys(app.metadataCache.getTags()).map(x => x.replace("#", ""))) %>',
                            name: "Suggester for tags"
                        }
                    ]
                }
            }
        },
        web: {
            description:
                "This modules contains every internal function related to the web (making web requests).",
            name: "web",
            functions: {
                dailyQuote: {
                    definition: "tp.web.dailyQuote()",
                    description:
                        "Retrieves and parses the daily quote from the API `https://api.quotable.io` as a callout.",
                    name: "dailyQuote",
                    examples: [
                        {
                            example: "<% tp.web.dailyQuote() %>",
                            name: "Daily quote"
                        }
                    ]
                },
                randomPicture: {
                    definition:
                        "tp.web.randomPicture(size?: string, query?: string, include_size?: boolean)",
                    description: "Gets a random image from `https://unsplash.com/`.",
                    name: "randomPicture",
                    args: [
                        {
                            description: "Image size in the format `<width>x<height>`.",
                            name: "size"
                        },
                        {
                            description:
                                "Limits selection to photos matching a search term. Multiple search terms can be passed separated by a comma.",
                            name: "query"
                        },
                        {
                            description:
                                "Optional argument to include the specified size in the image link markdown. Defaults to false.",
                            name: "include_size"
                        }
                    ],
                    examples: [
                        {
                            example: "<% tp.web.randomPicture() %>",
                            name: "Random picture"
                        },
                        {
                            example: '<% tp.web.randomPicture("200x200") %>',
                            name: "Random picture with size"
                        },
                        {
                            example: '<% tp.web.randomPicture("200x200", "landscape,water") %>',
                            name: "Random picture with size and query"
                        }
                    ]
                },
                request: {
                    definition: "tp.web.request(url: string, path?: string)",
                    description:
                        "Makes a HTTP request to the specified URL. Optionally, you can specify a path to extract specific data from the response.",
                    name: "request",
                    args: [
                        {
                            description: "The URL to which the HTTP request will be made.",
                            name: "url"
                        },
                        {
                            description:
                                "A path within the response JSON to extract specific data.",
                            name: "path"
                        }
                    ],
                    examples: [
                        {
                            example:
                                '<% tp.web.request("https://jsonplaceholder.typicode.com/todos/1") %>',
                            name: "Simple request"
                        },
                        {
                            example:
                                '<% tp.web.request("https://jsonplaceholder.typicode.com/todos", "0.title") %>',
                            name: "Request with path"
                        }
                    ]
                }
            }
        }
    }
};
