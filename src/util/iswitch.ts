/**
 * Allows an inline switch expression using an object. The default case
 * can be provided as the third value, which defaults to null.
 *
 * If the switch statement requires a non-string or non-number
 * key, use miswitch instead.
 *
 * @param input The input to check for
 * @param key The list of possible cases
 * @param _default The default case
 */
export default function iswitch<T extends string | number, U>(input : T, key : Record<T, U>, _default? : U) : U {
    return key[input] ?? _default;
}
