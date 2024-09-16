import type { StatusResult } from "../../../../lib/result";
import { Ok } from "../../../../lib/result";
import { InternalError, StatusError, UnavailableError } from "../../../../lib/status_error";
import { LogError } from "../../../../utils/log";
import { InternalModule } from "../internalModule";
import type { ModuleName } from "editor/tpDocumentation";

export class InternalModuleWeb extends InternalModule {
    name: ModuleName = "web";

    public override async createStaticTemplates(): Promise<StatusResult<StatusError>> {
        this.staticFunctions.set("daily_quote", this.generateDailyQuote());
        this.staticFunctions.set("request", this.generateRequest());
        this.staticFunctions.set("random_picture", this.generateRandomPicture());
        return Ok();
    }

    public override async createDynamicTemplates(): Promise<StatusResult<StatusError>> {
        return Ok();
    }

    public override async teardown(): Promise<void> {}

    private async getRequest(url: string): Promise<Response> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw UnavailableError("Error performing GET request");
            }
            return response;
        } catch (_error) {
            throw UnavailableError("Error performing GET request");
        }
    }

    private generateDailyQuote(): () => Promise<string> {
        return async () => {
            try {
                const response = await this.getRequest("https://zenquotes.io/api/today");
                const json = await response.json();

                const author = json.author;
                const quote = json.content;
                const newContent = `> [!quote] ${quote}\n> — ${author}`;

                return newContent;
            } catch (_error) {
                if (_error instanceof StatusError) {
                    LogError(_error);
                }
                return "Error generating daily quote";
            }
        };
    }

    private generateRandomPicture(): (
        size: string,
        query?: string,
        includeSize?: boolean
    ) => Promise<string> {
        return async (size: string, query?: string, includeSize = false) => {
            try {
                const response = await this.getRequest(
                    `https://templater-unsplash-2.fly.dev/${query ? "?q=" + query : ""}`
                ).then((res) => res.json());
                let url = response.full;
                if (size && !includeSize) {
                    if (size.includes("x")) {
                        const [width, height] = size.split("x");
                        url = url.concat(`&w=${width}&h=${height}`);
                    } else {
                        url = url.concat(`&w=${size}`);
                    }
                }
                if (includeSize) {
                    return `![photo by ${response.photog}(${response.photogUrl}) on Unsplash|${size}](${url})`;
                }
                return `![photo by ${response.photog}(${response.photogUrl}) on Unsplash](${url})`;
            } catch (error) {
                console.error(error);
                return "Error generating random picture";
            }
        };
    }

    private generateRequest(): (url: string, path?: string) => Promise<string> {
        return async (url: string, path?: string) => {
            try {
                const response = await this.getRequest(url);
                const jsonData = await response.json();

                if (path !== undefined && jsonData !== undefined && jsonData !== null) {
                    return path.split(".").reduce((obj, key) => {
                        if (
                            obj !== undefined &&
                            (Object.prototype.hasOwnProperty.call(obj, key) as boolean)
                        ) {
                            return obj[key];
                        }
                        throw InternalError(`Path ${path} not found in the JSON response`);
                    }, jsonData);
                }

                return jsonData;
            } catch (error) {
                if (error instanceof StatusError) {
                    LogError(error);
                }
                console.error(error);
                throw UnavailableError("Error fetching and extracting value");
            }
        };
    }
}
