export async function createContext(opts) {
    const user = opts.req.user || null;
    return {
        req: opts.req,
        res: opts.res,
        user,
    };
}
