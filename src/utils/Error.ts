// import { LogError } from "./log";

// export class TemplaterError extends Error {
//     constructor(
//         msg: string,
//         public console_msg?: string
//     ) {
//         super(msg);
//         this.name = this.constructor.name;
//         if (Error.captureStackTrace) {
//             Error.captureStackTrace(this, this.constructor);
//         }
//     }
// }

// export async function ErrorWrapper<T>(fn: () => Promise<T>, msg: string): Promise<T> {
//     try {
//         return await fn();
//     } catch (e) {
//         if (!(e instanceof TemplaterError)) {
//             LogError(new TemplaterError(msg, e.message));
//         } else {
//             LogError(e);
//         }
//         return null as T;
//     }
// }

// export function ErrorWrapperSync<T>(fn: () => T, msg: string): T {
//     try {
//         return fn();
//     } catch (e) {
//         LogError(new TemplaterError(msg, e.message));
//         return null as T;
//     }
// }
