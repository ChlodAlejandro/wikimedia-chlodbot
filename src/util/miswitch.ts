/**
 * Allows an inline switch expression using an object. The default case
 * can be provided as the third value, which defaults to null.
 *
 * This is the same as iswitch, but takes in a Map in order to use any
 * key type.
 *
 * @param input The input to check for
 * @param key The list of possible cases
 * @param _default The default case
 */
export default function miswitch<T, U>(input : T, key : Map<T, U>, _default? : U) : U {
    return key.get(input) ?? _default;
}
