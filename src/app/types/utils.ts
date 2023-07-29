export type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

type objectKeysOf<o> = [o] extends [object]
    ? o extends readonly unknown[]
        ? any[] extends o
            ? `${number}`
            : keyof o & `${number}`
        : keyof o extends number
        ? `${keyof o}`
        : Exclude<keyof o, symbol>
    : never;
export const objectKeysOf = <o extends object>(o: o) => Object.keys(o) as objectKeysOf<o>[];

export const hasKey = <o, k extends string>(o: o, k: k): o is Extract<o, { [_ in k]: {} }> => {
    const valueAtKey = (o as any)?.[k];
    return valueAtKey !== undefined && valueAtKey !== null;
};

export type unionToTuple<t> = unionToTupleRecurse<t, []> extends infer result ? conform<result, t[]> : never;

type conform<t, base> = t extends base ? t : base;
type unionToTupleRecurse<t, result extends unknown[]> = getLastBranch<t> extends infer current
    ? [t] extends [never]
        ? result
        : unionToTupleRecurse<Exclude<t, current>, [current, ...result]>
    : never;
type getLastBranch<t> = intersectUnion<t extends unknown ? (x: t) => void : never> extends (x: infer branch) => void
    ? branch
    : never;

type intersectUnion<t> = (t extends unknown ? (_: t) => void : never) extends (_: infer intersection) => void
    ? intersection
    : never;

type evaluate<t> = { [k in keyof t]: t[k] } & unknown;
type List<t = unknown> = readonly t[];
type entryOf<o> = evaluate<
    { [k in keyof o]-?: [k, Exclude<o[k], undefined>] }[o extends List ? keyof o & number : keyof o]
>;
type entriesOf<o extends object> = entryOf<o>[];
export const entriesOf = <o extends object>(o: o) => Object.entries(o) as entriesOf<o>;

type Entry<key extends PropertyKey = PropertyKey, value = unknown> = readonly [key: key, value: value];

type fromEntries<entries, result = {}> = entries extends readonly [Entry<infer k, infer v>, ...infer tail]
    ? fromEntries<tail, result & { [_ in k]: v }>
    : evaluate<result>;

const fromEntries = <entries extends readonly Entry[]>(entries: entries) =>
    Object.fromEntries(entries) as fromEntries<entries>;

export const transform = <o extends object, transformed extends Entry | readonly Entry[]>(
    o: o,
    flatMapEntry: (entry: entryOf<o>) => transformed
) =>
    Object.fromEntries(
        entriesOf(o).flatMap((entry) => {
            const result = flatMapEntry(entry);
            return Array.isArray(result[0]) ? result : [result];
        })
    ) as evaluate<intersectUnion<fromEntries<transformed extends readonly Entry[] ? transformed : [transformed]>>>;
