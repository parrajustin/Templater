import type { RunningConfig } from "core/templater";
import type { StatusError } from "../../lib/status_error";
import type { Result } from "../../lib/result";

export interface IGenerateObject {
    /** Generate context object. */
    generateObject(config: RunningConfig): Promise<Result<Record<string, unknown>, StatusError>>;
}
